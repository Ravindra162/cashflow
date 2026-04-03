import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
    getSpendHistories,
    getSpendHistory,
    addSpendHistory,
    updateSpendHistory,
    deleteSpendHistory
} from '../services/api';
import {
    Plus,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Wallet,
    TrendingUp,
    TrendingDown,
    Edit3,
    Trash2,
    X,
    ChevronLeft,
    Eye
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function SpendHistory() {
    const { getCategoryColor, getCategoryIcon } = useApp();
    const [histories, setHistories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [viewItem, setViewItem] = useState(null);
    const [viewData, setViewData] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [form, setForm] = useState({
        name: '',
        startDate: '',
        endDate: '',
        notes: ''
    });

    useEffect(() => {
        fetchHistories();
    }, []);

    const fetchHistories = async () => {
        setLoading(true);
        try {
            const res = await getSpendHistories();
            setHistories(res.data);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (item = null) => {
        if (item) {
            setEditItem(item);
            setForm({
                name: item.name,
                startDate: new Date(item.startDate).toISOString().split('T')[0],
                endDate: new Date(item.endDate).toISOString().split('T')[0],
                notes: item.notes || ''
            });
        } else {
            setEditItem(null);
            setForm({ name: '', startDate: '', endDate: '', notes: '' });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editItem) {
                await updateSpendHistory(editItem._id, form);
            } else {
                await addSpendHistory(form);
            }
            setShowModal(false);
            fetchHistories();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to save');
        }
    };

    const handleDelete = async (id) => {
        if (deletingId === id) {
            await deleteSpendHistory(id);
            setDeletingId(null);
            fetchHistories();
        } else {
            setDeletingId(id);
            setTimeout(() => setDeletingId(null), 3000);
        }
    };

    const handleView = async (item) => {
        setViewItem(item);
        setViewLoading(true);
        try {
            const res = await getSpendHistory(item._id);
            setViewData(res.data);
        } catch (err) {
            console.error('View error:', err);
        } finally {
            setViewLoading(false);
        }
    };

    const formatCurrency = (val) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency', currency: 'INR', maximumFractionDigits: 0
        }).format(val);

    const CHART_COLORS = ['#6C5CE7', '#A855F7', '#FF6B6B', '#4ECDC4', '#FFA726', '#00D68F', '#F093FB', '#29B6F6'];

    // ===== DETAIL VIEW =====
    if (viewItem && viewData) {
        return (
            <div className="spend-history-page">
                <button className="btn btn-ghost back-btn" onClick={() => { setViewItem(null); setViewData(null); }}>
                    <ChevronLeft size={18} /> Back to Spend History
                </button>

                <div className="page-header">
                    <div>
                        <h1>{viewData.name}</h1>
                        <p className="subtitle">
                            <Calendar size={14} />
                            {format(new Date(viewData.startDate), 'dd MMM yyyy')} — {format(new Date(viewData.endDate), 'dd MMM yyyy')}
                            <span className="period-days">
                                ({differenceInDays(new Date(viewData.endDate), new Date(viewData.startDate))} days)
                            </span>
                        </p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="summary-cards">
                    <div className="summary-card balance-card">
                        <div className="card-icon"><Wallet size={24} /></div>
                        <div className="card-info">
                            <span className="card-label">Balance</span>
                            <span className="card-value">{formatCurrency(viewData.summary.balance)}</span>
                        </div>
                    </div>
                    <div className="summary-card income-card">
                        <div className="card-icon income"><TrendingUp size={24} /></div>
                        <div className="card-info">
                            <span className="card-label">Income</span>
                            <span className="card-value income">{formatCurrency(viewData.summary.income)}</span>
                        </div>
                    </div>
                    <div className="summary-card expense-card">
                        <div className="card-icon expense"><TrendingDown size={24} /></div>
                        <div className="card-info">
                            <span className="card-label">Expenses</span>
                            <span className="card-value expense">{formatCurrency(viewData.summary.expense)}</span>
                        </div>
                    </div>
                </div>

                {/* Category Breakdown + Transactions */}
                <div className="charts-row">
                    {viewData.categoryBreakdown.length > 0 && (
                        <div className="chart-card">
                            <h3>Category Breakdown</h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={viewData.categoryBreakdown}
                                        dataKey="total"
                                        nameKey="_id"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={85}
                                        paddingAngle={3}
                                    >
                                        {viewData.categoryBreakdown.map((entry, i) => (
                                            <Cell key={i} fill={getCategoryColor(entry._id) || CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            background: 'rgba(15, 15, 35, 0.95)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '12px',
                                            color: '#E2E8F0'
                                        }}
                                        formatter={(value) => formatCurrency(value)}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="category-legend">
                                {viewData.categoryBreakdown.map((cat, i) => (
                                    <div key={i} className="legend-item">
                                        <span className="legend-dot" style={{ background: getCategoryColor(cat._id) || CHART_COLORS[i % CHART_COLORS.length] }} />
                                        <span className="legend-label">{getCategoryIcon(cat._id)} {cat._id}</span>
                                        <span className="legend-value">{formatCurrency(cat.total)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="chart-card">
                        <h3>Transactions ({viewData.transactions.length})</h3>
                        {viewData.transactions.length > 0 ? (
                            <div className="transaction-list compact" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {viewData.transactions.map(tx => (
                                    <div key={tx._id} className="transaction-item">
                                        <div className="tx-icon" style={{ background: getCategoryColor(tx.category) + '22', color: getCategoryColor(tx.category) }}>
                                            {getCategoryIcon(tx.category)}
                                        </div>
                                        <div className="tx-info">
                                            <span className="tx-title">{tx.title}</span>
                                            <span className="tx-meta">
                                                <Calendar size={12} /> {format(new Date(tx.date), 'dd MMM')}
                                                <span className="tx-category-badge">{tx.category}</span>
                                            </span>
                                        </div>
                                        <div className={`tx-amount ${tx.type}`}>
                                            {tx.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                            {formatCurrency(tx.amount)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state-small">
                                <p>No transactions in this period</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ===== LIST VIEW =====
    return (
        <div className="spend-history-page">
            <div className="page-header">
                <div>
                    <h1>Spend History</h1>
                    <p className="subtitle">Track expenses across custom periods</p>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    <Plus size={18} />
                    New Period
                </button>
            </div>

            {loading ? (
                <div className="page-loading"><div className="spinner" /></div>
            ) : histories.length > 0 ? (
                <div className="history-grid">
                    {histories.map(item => (
                        <div key={item._id} className="history-card">
                            <div className="history-card-header">
                                <h3>{item.name}</h3>
                                <div className="history-card-actions">
                                    <button className="icon-btn" onClick={() => handleView(item)} title="View details">
                                        <Eye size={16} />
                                    </button>
                                    <button className="icon-btn" onClick={() => openModal(item)}>
                                        <Edit3 size={14} />
                                    </button>
                                    <button
                                        className={`icon-btn delete ${deletingId === item._id ? 'confirm' : ''}`}
                                        onClick={() => handleDelete(item._id)}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className="history-dates">
                                <Calendar size={14} />
                                <span>{format(new Date(item.startDate), 'dd MMM yyyy')}</span>
                                <span className="date-separator">→</span>
                                <span>{format(new Date(item.endDate), 'dd MMM yyyy')}</span>
                            </div>
                            <div className="history-days">
                                {differenceInDays(new Date(item.endDate), new Date(item.startDate))} days
                            </div>
                            {item.notes && <p className="history-notes">{item.notes}</p>}
                            <button className="btn btn-ghost full-width view-details-btn" onClick={() => handleView(item)}>
                                <Eye size={16} /> View Details
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-icon">📊</div>
                    <h3>No spending periods yet</h3>
                    <p>Create a period to track expenses between specific dates — perfect for salary cycles!</p>
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <Plus size={18} /> Create First Period
                    </button>
                </div>
            )}

            {viewLoading && (
                <div className="modal-overlay">
                    <div className="page-loading"><div className="spinner" /><p>Loading details...</p></div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editItem ? 'Edit Period' : 'New Spending Period'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="modal-form">
                            <div className="form-group">
                                <label>Period Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g., March Salary Cycle"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Start Date</label>
                                    <input
                                        type="date"
                                        value={form.startDate}
                                        onChange={e => setForm({ ...form, startDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>End Date</label>
                                    <input
                                        type="date"
                                        value={form.endDate}
                                        onChange={e => setForm({ ...form, endDate: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Notes (optional)</label>
                                <textarea
                                    value={form.notes}
                                    onChange={e => setForm({ ...form, notes: e.target.value })}
                                    placeholder="Any notes about this period..."
                                    rows={2}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">
                                    {editItem ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

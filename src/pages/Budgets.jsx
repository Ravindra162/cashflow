import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getBudgetStatus, addBudget, updateBudget, deleteBudget } from '../services/api';
import {
    Target, Plus, Edit3, Trash2, X,
    TrendingUp, AlertTriangle, CheckCircle2, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition, AnimatedCard, TactileButton } from '../components/ui/MotionComponents';

export default function Budgets() {
    const { categories } = useApp();
    const [budgets, setBudgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [form, setForm] = useState({
        category: '',
        limit: '',
        period: 'monthly',
        startDate: '',
        endDate: '',
        alertAt: 80
    });

    useEffect(() => { fetchBudgets(); }, []);

    const fetchBudgets = async () => {
        setLoading(true);
        try {
            const res = await getBudgetStatus();
            setBudgets(res.data);
        } catch (err) {
            console.error('Budget fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (item = null) => {
        if (item) {
            setEditItem(item);
            setForm({
                category: item.category,
                limit: item.limit.toString(),
                period: item.period,
                startDate: item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '',
                endDate: item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : '',
                alertAt: item.alertAt
            });
        } else {
            setEditItem(null);
            setForm({ category: '', limit: '', period: 'monthly', startDate: '', endDate: '', alertAt: 80 });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...form,
                limit: parseFloat(form.limit)
            };
            if (editItem) {
                await updateBudget(editItem._id, payload);
            } else {
                await addBudget(payload);
            }
            setShowModal(false);
            fetchBudgets();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to save budget');
        }
    };

    const handleDelete = async (id) => {
        if (deletingId === id) {
            await deleteBudget(id);
            setDeletingId(null);
            fetchBudgets();
        } else {
            setDeletingId(id);
            setTimeout(() => setDeletingId(null), 3000);
        }
    };

    const formatCurrency = (val) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency', currency: 'INR', maximumFractionDigits: 0
        }).format(val);

    const getProgressColor = (percentage) => {
        if (percentage >= 100) return '#ef4444';
        if (percentage >= 80) return '#f97316';
        if (percentage >= 60) return '#eab308';
        return '#10b981';
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'exceeded': return <AlertTriangle size={18} />;
            case 'warning': return <TrendingUp size={18} />;
            default: return <CheckCircle2 size={18} />;
        }
    };

    const expenseCategories = [
        { name: '__ALL__', label: '📊 Total Budget (All Categories)' },
        ...categories.filter(c => c.type === 'expense').map(c => ({ name: c.name, label: `${c.icon} ${c.name}` }))
    ];

    if (loading) {
        return (
            <div className="page-loading">
                <div className="spinner" />
                <p>Loading budgets...</p>
            </div>
        );
    }

    return (
        <PageTransition className="budgets-page">
            <div className="page-header">
                <div>
                    <h1>Budgets</h1>
                    <p className="subtitle">Set spending limits and track your progress</p>
                </div>
                <TactileButton className="btn btn-primary" onClick={() => openModal()}>
                    <Plus size={18} />
                    New Budget
                </TactileButton>
            </div>

            {budgets.length > 0 ? (
                <div className="budgets-grid">
                    {budgets.map((budget, i) => {
                        const color = getProgressColor(budget.percentage);
                        return (
                            <AnimatedCard key={budget._id} delay={i * 0.08} className={`budget-card budget-${budget.status}`}>
                                <div className="budget-card-header">
                                    <div className="budget-category">
                                        <span className="budget-status-icon" style={{ color }}>
                                            {getStatusIcon(budget.status)}
                                        </span>
                                        <div>
                                            <h3>{budget.category === '__ALL__' ? 'Total Budget' : budget.category}</h3>
                                            <span className="budget-period-badge">{budget.periodLabel}</span>
                                        </div>
                                    </div>
                                    <div className="budget-card-actions">
                                        <button className="icon-btn" onClick={() => openModal(budget)}>
                                            <Edit3 size={14} />
                                        </button>
                                        <button
                                            className={`icon-btn delete ${deletingId === budget._id ? 'confirm' : ''}`}
                                            onClick={() => handleDelete(budget._id)}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="budget-amounts">
                                    <span className="budget-spent" style={{ color }}>{formatCurrency(budget.spent)}</span>
                                    <span className="budget-limit">of {formatCurrency(budget.limit)}</span>
                                </div>

                                <div className="budget-progress-track">
                                    <motion.div
                                        className="budget-progress-fill"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(budget.percentage, 100)}%` }}
                                        transition={{ duration: 1, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                                        style={{
                                            background: `linear-gradient(90deg, ${color}88, ${color})`,
                                            boxShadow: `0 0 12px ${color}44`
                                        }}
                                    />
                                </div>

                                <div className="budget-footer">
                                    <span className="budget-percentage" style={{ color }}>
                                        {budget.percentage}% used
                                    </span>
                                    <span className="budget-remaining">
                                        {budget.status === 'exceeded'
                                            ? `Over by ${formatCurrency(budget.spent - budget.limit)}`
                                            : `${formatCurrency(budget.remaining)} left`
                                        }
                                    </span>
                                </div>
                            </AnimatedCard>
                        );
                    })}
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-icon">🎯</div>
                    <h3>No budgets yet</h3>
                    <p>Create your first budget to start tracking spending limits per category.</p>
                    <TactileButton className="btn btn-primary" onClick={() => openModal()}>
                        <Plus size={18} /> Create First Budget
                    </TactileButton>
                </div>
            )}

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            className="modal"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2>{editItem ? 'Edit Budget' : 'New Budget'}</h2>
                                <button className="modal-close" onClick={() => setShowModal(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSave} className="modal-form">
                                <div className="form-group">
                                    <label>Category</label>
                                    <select
                                        value={form.category}
                                        onChange={e => setForm({ ...form, category: e.target.value })}
                                        required
                                    >
                                        <option value="">Select category...</option>
                                        {expenseCategories.map(c => (
                                            <option key={c.name} value={c.name}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Spending Limit (₹)</label>
                                        <input
                                            type="number"
                                            value={form.limit}
                                            onChange={e => setForm({ ...form, limit: e.target.value })}
                                            placeholder="e.g., 5000"
                                            min="1"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Period</label>
                                        <select
                                            value={form.period}
                                            onChange={e => setForm({ ...form, period: e.target.value })}
                                        >
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="yearly">Yearly</option>
                                            <option value="custom">Custom Range</option>
                                        </select>
                                    </div>
                                </div>
                                {form.period === 'custom' && (
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
                                )}
                                <div className="form-group">
                                    <label>Alert at {form.alertAt}%</label>
                                    <input
                                        type="range"
                                        min="50"
                                        max="100"
                                        value={form.alertAt}
                                        onChange={e => setForm({ ...form, alertAt: parseInt(e.target.value) })}
                                        className="range-slider"
                                    />
                                    <div className="range-labels">
                                        <span>50%</span>
                                        <span>Warn at {form.alertAt}%</span>
                                        <span>100%</span>
                                    </div>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">
                                        {editItem ? 'Update' : 'Create'} Budget
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </PageTransition>
    );
}

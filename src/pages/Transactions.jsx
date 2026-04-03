import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
    getTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction
} from '../services/api';
import TransactionModal from '../components/TransactionModal';
import SplitTransactionModal from '../components/SplitTransactionModal';
import {
    Plus,
    Search,
    Filter,
    Edit3,
    Trash2,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    ChevronLeft,
    ChevronRight,
    SplitSquareHorizontal
} from 'lucide-react';
import { format } from 'date-fns';

export default function Transactions() {
    const { categories, accounts, getCategoryColor, getCategoryIcon, getAccountIcon } = useApp();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editTx, setEditTx] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [filterAccount, setFilterAccount] = useState('');
    
    // Split States
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [splitTx, setSplitTx] = useState(null);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: 20 };
            if (search) params.search = search;
            if (filterType) params.type = filterType;
            if (filterCategory) params.category = filterCategory;
            if (filterAccount) params.account = filterAccount;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const res = await getTransactions(params);
            setTransactions(res.data.transactions);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [page, search, filterType, filterCategory, filterAccount, startDate, endDate]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    // Debounced search
    const [searchInput, setSearchInput] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const handleSave = async (data) => {
        if (editTx?._id) {
            await updateTransaction(editTx._id, data);
        } else {
            await addTransaction(data);
        }
        fetchTransactions();
    };

    const handleDelete = async (id) => {
        if (deletingId === id) {
            await deleteTransaction(id);
            setDeletingId(null);
            fetchTransactions();
        } else {
            setDeletingId(id);
            setTimeout(() => setDeletingId(null), 3000);
        }
    };

    const formatCurrency = (val) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency', currency: 'INR', maximumFractionDigits: 0
        }).format(val);

    return (
        <div className="transactions-page">
            <div className="page-header">
                <div>
                    <h1>Transactions</h1>
                    <p className="subtitle">{total} total transactions</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setEditTx(null); setShowModal(true); }}>
                    <Plus size={18} />
                    Add Transaction
                </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="filter-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                </div>
                <button
                    className={`btn btn-ghost filter-toggle ${showFilters ? 'active' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter size={18} />
                    Filters
                </button>
            </div>

            {showFilters && (
                <div className="filter-panel">
                    <div className="filter-group">
                        <label>Type</label>
                        <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
                            <option value="">All</option>
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Category</label>
                        <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}>
                            <option value="">All</option>
                            {categories.map(c => (
                                <option key={c._id} value={c.name}>{c.icon} {c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Account</label>
                        <select value={filterAccount} onChange={(e) => { setFilterAccount(e.target.value); setPage(1); }}>
                            <option value="">All</option>
                            {accounts.map(a => (
                                <option key={a._id} value={a.name}>{a.icon} {a.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>From</label>
                        <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
                    </div>
                    <div className="filter-group">
                        <label>To</label>
                        <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
                    </div>
                    <button className="btn btn-ghost" onClick={() => {
                        setFilterType(''); setFilterCategory(''); setFilterAccount(''); setStartDate(''); setEndDate(''); setPage(1);
                    }}>
                        Clear
                    </button>
                </div>
            )}

            {/* Transactions List */}
            {loading ? (
                <div className="page-loading">
                    <div className="spinner" />
                </div>
            ) : transactions.length > 0 ? (
                <>
                    <div className="transaction-list">
                        {transactions.map(tx => (
                            <div key={tx._id} className="transaction-item">
                                <div
                                    className="tx-icon"
                                    style={{
                                        background: getCategoryColor(tx.category) + '22',
                                        color: getCategoryColor(tx.category)
                                    }}
                                >
                                    {getCategoryIcon(tx.category)}
                                </div>
                                <div className="tx-info">
                                    <span className="tx-title">{tx.title}</span>
                                    <span className="tx-meta">
                                        <Calendar size={12} />
                                        {format(new Date(tx.date), 'dd MMM yyyy')}
                                        <span className="tx-category-badge">{tx.category}</span>
                                        {tx.account && <span className="tx-account-badge">{getAccountIcon(tx.account)} {tx.account}</span>}
                                    </span>
                                    {tx.notes && <span className="tx-notes">{tx.notes}</span>}
                                </div>
                                <div className={`tx-amount ${tx.type}`}>
                                    {tx.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                    {formatCurrency(tx.amount)}
                                    {tx.originalAmount && tx.originalAmount > tx.amount && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} title="Decreased due to Settled Splits">
                                            Prev: {formatCurrency(tx.originalAmount)}
                                        </div>
                                    )}
                                </div>
                                <div className="tx-actions">
                                    {(tx.amount - (tx.pendingSplitAmount || 0)) > 0 && (
                                        <button className="icon-btn" onClick={() => { setSplitTx(tx); setShowSplitModal(true); }} title="Split Transaction">
                                            <SplitSquareHorizontal size={16} />
                                        </button>
                                    )}
                                    <button className="icon-btn" onClick={() => { setEditTx(tx); setShowModal(true); }} title="Edit">
                                        <Edit3 size={16} />
                                    </button>
                                    <button
                                        className={`icon-btn delete ${deletingId === tx._id ? 'confirm' : ''}`}
                                        onClick={() => handleDelete(tx._id)}
                                        title={deletingId === tx._id ? 'Click again to confirm' : 'Delete'}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                className="btn btn-ghost"
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <span className="page-info">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                className="btn btn-ghost"
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="empty-state">
                    <div className="empty-icon">💸</div>
                    <h3>No transactions found</h3>
                    <p>Start tracking your expenses by adding your first transaction</p>
                    <button className="btn btn-primary" onClick={() => { setEditTx(null); setShowModal(true); }}>
                        <Plus size={18} /> Add Transaction
                    </button>
                </div>
            )}

            {showModal && (
                <TransactionModal
                    transaction={editTx}
                    onClose={() => { setShowModal(false); setEditTx(null); }}
                    onSave={handleSave}
                />
            )}

            {showSplitModal && splitTx && (
                <SplitTransactionModal
                    transaction={splitTx}
                    onClose={() => { setShowSplitModal(false); setSplitTx(null); }}
                    onSave={fetchTransactions}
                />
            )}
        </div>
    );
}

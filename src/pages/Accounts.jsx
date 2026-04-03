import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
    getAccounts,
    addAccount,
    updateAccount,
    deleteAccount
} from '../services/api';
import {
    Plus,
    Edit3,
    Trash2,
    X,
    Star,
    CreditCard
} from 'lucide-react';

const ACCOUNT_ICONS = ['💳', '🏦', '💵', '📱', '💰', '🪙', '💎', '🏧', '🎯', '🔒', '📊', '🏠'];
const ACCOUNT_COLORS = [
    '#6C5CE7', '#A855F7', '#FF6B6B', '#4ECDC4', '#FFA726',
    '#00D68F', '#29B6F6', '#66BB6A', '#EC407A', '#78909C',
    '#AB47BC', '#F44336'
];

export default function Accounts() {
    const { fetchAccounts } = useApp();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [form, setForm] = useState({
        name: '',
        icon: '💳',
        color: '#6C5CE7',
        isDefault: false
    });

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        setLoading(true);
        try {
            const res = await getAccounts();
            setAccounts(res.data);
        } catch (err) {
            console.error('Load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (item = null) => {
        if (item) {
            setEditItem(item);
            setForm({
                name: item.name,
                icon: item.icon,
                color: item.color,
                isDefault: item.isDefault
            });
        } else {
            setEditItem(null);
            setForm({ name: '', icon: '💳', color: '#6C5CE7', isDefault: false });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editItem) {
                await updateAccount(editItem._id, form);
            } else {
                await addAccount(form);
            }
            setShowModal(false);
            loadAccounts();
            fetchAccounts(); // Update global context
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to save');
        }
    };

    const handleDelete = async (id) => {
        if (deletingId === id) {
            await deleteAccount(id);
            setDeletingId(null);
            loadAccounts();
            fetchAccounts();
        } else {
            setDeletingId(id);
            setTimeout(() => setDeletingId(null), 3000);
        }
    };

    return (
        <div className="accounts-page">
            <div className="page-header">
                <div>
                    <h1>Accounts</h1>
                    <p className="subtitle">Manage your wallets and bank accounts</p>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    <Plus size={18} />
                    Add Account
                </button>
            </div>

            {loading ? (
                <div className="page-loading"><div className="spinner" /></div>
            ) : accounts.length > 0 ? (
                <div className="accounts-grid">
                    {accounts.map(acc => (
                        <div
                            key={acc._id}
                            className="account-card"
                            style={{ borderLeftColor: acc.color }}
                        >
                            <div className="account-card-header">
                                <div className="account-icon" style={{ background: acc.color + '22', color: acc.color }}>
                                    {acc.icon}
                                </div>
                                <div className="account-actions">
                                    {acc.isDefault && (
                                        <span className="default-badge" title="Default account">
                                            <Star size={12} />
                                        </span>
                                    )}
                                    <button className="icon-btn" onClick={() => openModal(acc)}>
                                        <Edit3 size={14} />
                                    </button>
                                    <button
                                        className={`icon-btn delete ${deletingId === acc._id ? 'confirm' : ''}`}
                                        onClick={() => handleDelete(acc._id)}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className="account-name">{acc.name}</div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-icon">🏦</div>
                    <h3>No accounts yet</h3>
                    <p>Add bank accounts, wallets, or UPI to track where your money goes</p>
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <Plus size={18} /> Add First Account
                    </button>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editItem ? 'Edit Account' : 'New Account'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="modal-form">
                            <div className="form-group">
                                <label>Account Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g., HDFC Bank, Cash, GPay"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="form-group">
                                <label>Icon</label>
                                <div className="icon-picker">
                                    {ACCOUNT_ICONS.map(icon => (
                                        <button
                                            key={icon}
                                            type="button"
                                            className={`picker-item ${form.icon === icon ? 'selected' : ''}`}
                                            onClick={() => setForm({ ...form, icon })}
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Color</label>
                                <div className="color-picker">
                                    {ACCOUNT_COLORS.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            className={`color-dot ${form.color === color ? 'selected' : ''}`}
                                            style={{ background: color }}
                                            onClick={() => setForm({ ...form, color })}
                                        />
                                    ))}
                                </div>
                            </div>

                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={form.isDefault}
                                    onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                                />
                                <span>Set as default account</span>
                            </label>

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

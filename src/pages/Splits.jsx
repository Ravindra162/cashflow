import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getSplits, addSplit, updateSplit, deleteSplit, addFriend, deleteFriend } from '../services/api';
import { 
    Users, Plus, CheckCircle2, Circle, Trash2, Loader2, AlertCircle, 
    UserPlus, FileText, ArrowRight, User
} from 'lucide-react';

export default function Splits() {
    const { friends, fetchFriends } = useApp();
    const [splits, setSplits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // UI state
    const [activeTab, setActiveTab] = useState('debts'); // 'debts' or 'friends'
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    // Forms
    const [newFriendName, setNewFriendName] = useState('');
    const [formData, setFormData] = useState({ friendId: '', amount: '', notes: '' });

    useEffect(() => {
        fetchSplits();
    }, []);

    const fetchSplits = async () => {
        setLoading(true);
        try {
            const res = await getSplits();
            setSplits(res.data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch splits');
        } finally {
            setLoading(false);
        }
    };

    const handleAddFriend = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await addFriend({ name: newFriendName });
            await fetchFriends();
            setNewFriendName('');
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add friend');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteFriend = async (id) => {
        if (!confirm('Are you sure? This does not delete their debts, but they will be orphaned.')) return;
        try {
            await deleteFriend(id);
            await fetchFriends();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete friend');
        }
    };

    const handleAddDebt = async (e) => {
        e.preventDefault();
        if (!formData.friendId) {
            setError('Please select a friend first. Create one if none exist.');
            return;
        }
        setSubmitting(true);
        try {
            await addSplit({
                friendId: formData.friendId,
                amount: parseFloat(formData.amount),
                notes: formData.notes
            });
            await fetchSplits();
            setShowForm(false);
            setFormData({ friendId: '', amount: '', notes: '' });
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add note');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleStatus = async (split) => {
        // If settling, ensure user confirms, because this might deduct from transactions!
        if (split.status === 'pending') {
            if (!confirm(`Marking this as settled will permanently deduct ₹${split.amount} from any linked transactions. Proceed?`)) return;
        }
        
        const newStatus = split.status === 'pending' ? 'settled' : 'pending';
        try {
            await updateSplit(split._id, { status: newStatus });
            await fetchSplits(); // refetch to get updated populate/state
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update status');
        }
    };

    const handleDeleteSplit = async (id) => {
        if (!confirm('Delete this record?')) return;
        try {
            await deleteSplit(id);
            setSplits(splits.filter(s => s._id !== id));
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete split');
        }
    };

    // Calculate totals
    const pendingTotal = splits.filter(s => s.status === 'pending').reduce((sum, curr) => sum + curr.amount, 0);

    if (loading) return <div className="page-loading"><Loader2 className="spin" size={32} /></div>;

    return (
        <div className="splits-page">
            <div className="page-header">
                <div>
                    <h1>Money Owed</h1>
                    <p className="subtitle">Track friends' debts and auto-settle your transactions.</p>
                </div>
            </div>

            {error && (
                <div className="result-message error">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {/* Custom Simple Tabs */}
            <div className="period-selector" style={{ marginBottom: '20px', maxWidth: '300px' }}>
                <button 
                    className={`period-btn ${activeTab === 'debts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('debts')}
                >
                    IOUs & Debts
                </button>
                <button 
                    className={`period-btn ${activeTab === 'friends' ? 'active' : ''}`}
                    onClick={() => setActiveTab('friends')}
                >
                    Friends List
                </button>
            </div>

            {activeTab === 'friends' && (
                <div className="settings-grid">
                    <div className="settings-card">
                        <h3 className="card-title"><UserPlus size={18} /> Add a Friend</h3>
                        <form onSubmit={handleAddFriend} className="form-group" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '16px' }}>
                            <input 
                                type="text" 
                                required 
                                placeholder="Friend's Name" 
                                value={newFriendName}
                                onChange={e => setNewFriendName(e.target.value)}
                                style={{ flex: 1 }}
                            />
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                {submitting ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
                                Add
                            </button>
                        </form>
                    </div>

                    <div className="settings-card">
                        <h3 className="card-title"><Users size={18} /> Your Friends</h3>
                        {friends.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', marginTop: '16px' }}>No friends added yet.</p>
                        ) : (
                            <div className="transaction-list compact" style={{ marginTop: '16px' }}>
                                {friends.map(f => {
                                    // Calculate pending for this friend
                                    const friendPending = splits
                                        .filter(s => s.friend && s.friend._id === f._id && s.status === 'pending')
                                        .reduce((sum, s) => sum + s.amount, 0);

                                    return (
                                        <div key={f._id} className="transaction-item">
                                            <div className="tx-icon" style={{ background: 'var(--bg-surface-hover)' }}>
                                                <User size={16} />
                                            </div>
                                            <div className="tx-info">
                                                <span className="tx-title">{f.name}</span>
                                            </div>
                                            <div className="tx-amount" style={{ color: friendPending > 0 ? 'var(--income)' : 'var(--text-primary)' }}>
                                                {friendPending > 0 ? `₹${friendPending.toLocaleString()} owed` : 'Settled'}
                                            </div>
                                            <div className="tx-actions">
                                                <button className="icon-btn delete" onClick={() => handleDeleteFriend(f._id)}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'debts' && (
                <>
                    <div className="summary-card" style={{ background: 'var(--income-bg)', border: '1px solid rgba(0, 214, 143, 0.2)', marginBottom: '24px' }}>
                        <div className="card-icon" style={{ background: 'rgba(0, 214, 143, 0.2)', color: 'var(--income)' }}>
                            <ArrowRight size={20} />
                        </div>
                        <div className="card-info">
                            <h3>Total Expected Receivables</h3>
                            <div className="card-value" style={{ color: 'var(--income)' }}>₹{pendingTotal.toLocaleString()}</div>
                        </div>
                    </div>

                    <div className="settings-card" style={{ padding: '0', overflow: 'hidden' }}>
                        <div className="page-header" style={{ padding: '16px 20px', margin: 0, borderBottom: '1px solid var(--border-color)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ margin: 0 }}>Ledger</h3>
                            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                                {showForm ? 'Cancel' : <><Plus size={16} /> Ad-Hoc Note</>}
                            </button>
                        </div>

                        {showForm && (
                            <form onSubmit={handleAddDebt} className="modal-form" style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', animation: 'fadeIn 0.2sease' }}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Friend</label>
                                        <select 
                                            required 
                                            value={formData.friendId} 
                                            onChange={e => setFormData({ ...formData, friendId: e.target.value })}
                                        >
                                            <option value="">Select a Friend...</option>
                                            {friends.map(f => (
                                                <option key={f._id} value={f._id}>{f.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Amount Expected (₹)</label>
                                        <input
                                            type="number"
                                            required
                                            min="0.01"
                                            step="0.01"
                                            value={formData.amount}
                                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label><FileText size={14} style={{ display: 'inline' }} /> Notes (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Movie tickets..."
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>
                                <div className="modal-actions">
                                    <button type="submit" className="btn btn-primary" disabled={submitting || friends.length === 0}>
                                        {submitting ? <Loader2 size={16} className="spin" /> : 'Save Record'}
                                    </button>
                                </div>
                                {friends.length === 0 && <p style={{ color: 'var(--expense)', fontSize: '0.8rem', marginTop: '8px' }}>Please add a friend from the Friends tab first.</p>}
                            </form>
                        )}

                        {splits.length === 0 ? (
                            <div className="empty-state">
                                <h3>No Pending Notes</h3>
                                <p>Create a friend and add a note, or split a transaction heavily.</p>
                            </div>
                        ) : (
                            <div className="table-wrapper" style={{ margin: 0 }}>
                                <table className="format-table">
                                    <thead>
                                        <tr>
                                            <th>Status</th>
                                            <th>Friend</th>
                                            <th>Amount</th>
                                            <th>Notes</th>
                                            <th>From Tx</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {splits.map(split => (
                                            <tr key={split._id} style={{ opacity: split.status === 'settled' ? 0.6 : 1 }}>
                                                <td style={{ cursor: 'pointer' }} onClick={() => toggleStatus(split)}>
                                                    {split.status === 'settled' ? (
                                                        <span className="filter-chip" style={{ color: 'var(--income)', borderColor: 'rgba(0, 214, 143, 0.2)', background: 'rgba(0, 214, 143, 0.1)' }}>
                                                            <CheckCircle2 size={14} /> Settled
                                                        </span>
                                                    ) : (
                                                        <span className="filter-chip">
                                                            <Circle size={14} /> Pending
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ fontWeight: 600 }}>{split.friend ? split.friend.name : <span style={{color: 'var(--expense)'}}>Deleted Friend</span>}</td>
                                                <td style={{ color: 'var(--income)', fontWeight: 600 }}>₹{split.amount.toLocaleString()}</td>
                                                <td>{split.notes || '-'}</td>
                                                <td>{split.transactionId ? <CheckCircle2 size={16} className="income"/> : '-'}</td>
                                                <td>
                                                    <button 
                                                        className="icon-btn delete" 
                                                        onClick={() => handleDeleteSplit(split._id)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

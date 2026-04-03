import { useState } from 'react';
import { X, Save, User, DollarSign, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { addSplit } from '../services/api';
import { useApp } from '../context/AppContext';

export default function SplitTransactionModal({ transaction, onClose, onSave }) {
    const { friends } = useApp();
    const [splits, setSplits] = useState([{ friendId: '', amount: '', notes: '' }]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const maxSplit = transaction.amount - (transaction.pendingSplitAmount || 0);

    const handleSplitChange = (index, field, value) => {
        const newSplits = [...splits];
        newSplits[index][field] = value;
        setSplits(newSplits);
    };

    const addSplitRow = () => {
        setSplits([...splits, { friendId: '', amount: '', notes: '' }]);
    };

    const removeSplitRow = (index) => {
        const newSplits = splits.filter((_, i) => i !== index);
        setSplits(newSplits.length ? newSplits : [{ friendId: '', amount: '', notes: '' }]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate
        let totalVal = 0;
        for (const s of splits) {
            const val = parseFloat(s.amount);
            if (isNaN(val) || val <= 0) {
                return setError('All amounts must be positive numbers');
            }
            if (!s.friendId) {
                return setError('Please select a friend for all splits');
            }
            totalVal += val;
        }

        if (totalVal > maxSplit) {
            return setError(`Total split amount (₹${totalVal}) cannot exceed remaining transaction amount (₹${maxSplit})`);
        }

        setLoading(true);

        try {
            // Process sequentially to prevent DB race conditions on transaction update
            for (const s of splits) {
                await addSplit({
                    friendId: s.friendId,
                    amount: parseFloat(s.amount),
                    notes: s.notes,
                    transactionId: transaction._id
                });
            }
            if (onSave) onSave();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to split transaction');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency', currency: 'INR', maximumFractionDigits: 0
        }).format(val);

    const totalEntering = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h2>Split Transaction</h2>
                    <button className="modal-close" onClick={onClose} disabled={loading}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body" style={{ padding: '0 24px 16px' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        Original tx amount: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(transaction.amount)}</strong><br/>
                        Available to split: <strong style={{ color: 'var(--income)' }}>{formatCurrency(maxSplit)}</strong>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {error && <div className="result-message error" style={{ padding: '10px', margin: '0 24px' }}>{error}</div>}

                    <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '0 24px' }}>
                        {splits.map((split, index) => (
                            <div key={index} style={{ borderBottom: splits.length > 1 ? '1px dashed var(--border-color)' : 'none', paddingBottom: '16px', marginBottom: '16px', position: 'relative' }}>
                                {splits.length > 1 && (
                                    <button 
                                        type="button" 
                                        className="icon-btn delete" 
                                        onClick={() => removeSplitRow(index)}
                                        style={{ position: 'absolute', right: 0, top: 0, zIndex: 10 }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                <div className="form-group" style={{ paddingRight: splits.length > 1 ? '30px' : '0' }}>
                                    <label><User size={14} style={{ display: 'inline' }} /> Friend</label>
                                    <select 
                                        required 
                                        value={split.friendId} 
                                        onChange={e => handleSplitChange(index, 'friendId', e.target.value)}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="">Select a Friend...</option>
                                        {friends.map(f => (
                                            <option key={f._id} value={f._id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="form-group">
                                    <label><DollarSign size={14} style={{ display: 'inline' }} /> Amount</label>
                                    <input
                                        type="number"
                                        required
                                        min="0.01"
                                        step="0.01"
                                        max={maxSplit}
                                        placeholder="0.00"
                                        value={split.amount}
                                        onChange={e => handleSplitChange(index, 'amount', e.target.value)}
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label><FileText size={14} style={{ display: 'inline' }} /> Notes (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="What for?"
                                        value={split.notes}
                                        onChange={e => handleSplitChange(index, 'notes', e.target.value)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button type="button" className="btn btn-ghost" onClick={addSplitRow} style={{ color: 'var(--primary-light)', padding: '8px 0' }}>
                            <Plus size={16} /> Add Another Friend
                        </button>
                        <div style={{ fontSize: '0.9rem', color: totalEntering > maxSplit ? 'var(--expense)' : 'var(--text-secondary)' }}>
                            Total: <strong>{formatCurrency(totalEntering)}</strong> / {formatCurrency(maxSplit)}
                        </div>
                    </div>

                    <div className="modal-actions" style={{ padding: '24px', borderTop: '1px solid var(--border-color)', marginTop: '16px' }}>
                        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading || friends.length === 0 || totalEntering > maxSplit}>
                            {loading ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                            Split Now
                        </button>
                    </div>
                    {friends.length === 0 && <p style={{ color: 'var(--expense)', fontSize: '0.8rem', padding: '0 24px 24px' }}>Please add a friend in the Money Owed page first.</p>}
                </form>
            </div>
        </div>
    );
}

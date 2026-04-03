import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X } from 'lucide-react';

export default function TransactionModal({ transaction, onClose, onSave }) {
    const { categories, accounts } = useApp();
    const isEdit = !!transaction?._id;

    const defaultAccount = accounts.find(a => a.isDefault)?.name || accounts[0]?.name || 'Cash';

    const [form, setForm] = useState({
        title: '',
        amount: '',
        type: 'expense',
        category: '',
        account: defaultAccount,
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (transaction) {
            setForm({
                title: transaction.title || '',
                amount: transaction.amount || '',
                type: transaction.type || 'expense',
                category: transaction.category || '',
                account: transaction.account || defaultAccount,
                date: transaction.date
                    ? new Date(transaction.date).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0],
                notes: transaction.notes || ''
            });
        }
    }, [transaction]);

    const filteredCategories = categories.filter(c => c.type === form.type);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave({
                ...form,
                amount: parseFloat(form.amount)
            });
            onClose();
        } catch (err) {
            console.error('Save error:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{isEdit ? 'Edit Transaction' : 'Add Transaction'}</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {/* Type toggle */}
                    <div className="type-toggle">
                        <button
                            type="button"
                            className={`type-btn ${form.type === 'expense' ? 'active expense' : ''}`}
                            onClick={() => setForm({ ...form, type: 'expense', category: '' })}
                        >
                            Expense
                        </button>
                        <button
                            type="button"
                            className={`type-btn ${form.type === 'income' ? 'active income' : ''}`}
                            onClick={() => setForm({ ...form, type: 'income', category: '' })}
                        >
                            Income
                        </button>
                    </div>

                    <div className="form-group">
                        <label>Title</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="e.g., Grocery shopping"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Amount</label>
                            <input
                                type="number"
                                value={form.amount}
                                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Date</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Category</label>
                            <select
                                value={form.category}
                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                required
                            >
                                <option value="">Select category</option>
                                {filteredCategories.map(cat => (
                                    <option key={cat._id} value={cat.name}>
                                        {cat.icon} {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Account</label>
                            <select
                                value={form.account}
                                onChange={(e) => setForm({ ...form, account: e.target.value })}
                                required
                            >
                                {accounts.map(acc => (
                                    <option key={acc._id} value={acc.name}>
                                        {acc.icon} {acc.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Notes (optional)</label>
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            placeholder="Add any notes..."
                            rows={2}
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`btn btn-primary ${form.type === 'income' ? 'btn-income' : ''}`}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : isEdit ? 'Update' : 'Add'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

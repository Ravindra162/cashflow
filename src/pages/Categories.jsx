import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { addCategory, updateCategory, deleteCategory } from '../services/api';
import { Plus, Edit3, Trash2, X } from 'lucide-react';

const PRESET_COLORS = [
    '#FF6B6B', '#4ECDC4', '#A855F7', '#F093FB', '#FFA726',
    '#00D68F', '#29B6F6', '#66BB6A', '#EC407A', '#5C6BC0',
    '#8D6E63', '#78909C', '#26A69A', '#AB47BC', '#26C6DA'
];

const PRESET_ICONS = [
    '🍕', '🚗', '🛍️', '🎬', '💡', '🏥', '📚', '🛒',
    '💅', '🏠', '📦', '💰', '💻', '📈', '🎁', '✈️',
    '🎮', '☕', '📱', '🎵', '🏋️', '🐕', '👶', '💊'
];

export default function Categories() {
    const { categories, fetchCategories } = useApp();
    const [showModal, setShowModal] = useState(false);
    const [editCat, setEditCat] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [form, setForm] = useState({
        name: '', icon: '📦', color: '#6C5CE7', type: 'expense', budget: 0
    });

    const expenseCategories = categories.filter(c => c.type === 'expense');
    const incomeCategories = categories.filter(c => c.type === 'income');

    const openModal = (cat = null) => {
        if (cat) {
            setEditCat(cat);
            setForm({
                name: cat.name,
                icon: cat.icon,
                color: cat.color,
                type: cat.type,
                budget: cat.budget || 0
            });
        } else {
            setEditCat(null);
            setForm({ name: '', icon: '📦', color: '#6C5CE7', type: 'expense', budget: 0 });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editCat) {
                await updateCategory(editCat._id, form);
            } else {
                await addCategory(form);
            }
            setShowModal(false);
            fetchCategories();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to save');
        }
    };

    const handleDelete = async (id) => {
        if (deletingId === id) {
            await deleteCategory(id);
            setDeletingId(null);
            fetchCategories();
        } else {
            setDeletingId(id);
            setTimeout(() => setDeletingId(null), 3000);
        }
    };

    const formatCurrency = (val) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency', currency: 'INR', maximumFractionDigits: 0
        }).format(val);

    const CategoryGrid = ({ items, title }) => (
        <div className="category-section">
            <h3>{title}</h3>
            <div className="category-grid">
                {items.map(cat => (
                    <div key={cat._id} className="category-card" style={{ borderColor: cat.color + '44' }}>
                        <div className="cat-header">
                            <div className="cat-icon" style={{ background: cat.color + '22' }}>
                                {cat.icon}
                            </div>
                            <div className="cat-actions">
                                <button className="icon-btn" onClick={() => openModal(cat)}>
                                    <Edit3 size={14} />
                                </button>
                                <button
                                    className={`icon-btn delete ${deletingId === cat._id ? 'confirm' : ''}`}
                                    onClick={() => handleDelete(cat._id)}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="cat-name">{cat.name}</div>
                        {cat.budget > 0 && (
                            <div className="cat-budget">Budget: {formatCurrency(cat.budget)}/mo</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="categories-page">
            <div className="page-header">
                <div>
                    <h1>Categories</h1>
                    <p className="subtitle">{categories.length} categories</p>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    <Plus size={18} />
                    Add Category
                </button>
            </div>

            <CategoryGrid items={expenseCategories} title="Expense Categories" />
            <CategoryGrid items={incomeCategories} title="Income Categories" />

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editCat ? 'Edit Category' : 'Add Category'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="modal-form">
                            <div className="type-toggle">
                                <button
                                    type="button"
                                    className={`type-btn ${form.type === 'expense' ? 'active expense' : ''}`}
                                    onClick={() => setForm({ ...form, type: 'expense' })}
                                >
                                    Expense
                                </button>
                                <button
                                    type="button"
                                    className={`type-btn ${form.type === 'income' ? 'active income' : ''}`}
                                    onClick={() => setForm({ ...form, type: 'income' })}
                                >
                                    Income
                                </button>
                            </div>

                            <div className="form-group">
                                <label>Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="Category name"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Icon</label>
                                <div className="icon-picker">
                                    {PRESET_ICONS.map(icon => (
                                        <button
                                            key={icon}
                                            type="button"
                                            className={`icon-option ${form.icon === icon ? 'selected' : ''}`}
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
                                    {PRESET_COLORS.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            className={`color-option ${form.color === color ? 'selected' : ''}`}
                                            style={{ background: color }}
                                            onClick={() => setForm({ ...form, color })}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Monthly Budget (optional)</label>
                                <input
                                    type="number"
                                    value={form.budget}
                                    onChange={e => setForm({ ...form, budget: parseFloat(e.target.value) || 0 })}
                                    placeholder="0"
                                    min="0"
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">
                                    {editCat ? 'Update' : 'Add'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

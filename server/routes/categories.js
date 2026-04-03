import { Router } from 'express';
import Category from '../models/Category.js';

const router = Router();

// GET /api/categories
router.get('/', async (req, res) => {
    try {
        const { type } = req.query;
        const filter = type ? { type } : {};
        const categories = await Category.find(filter).sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/categories
router.post('/', async (req, res) => {
    try {
        const category = await Category.create(req.body);
        res.status(201).json(category);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Category already exists' });
        }
        res.status(400).json({ error: error.message });
    }
});

// PUT /api/categories/:id
router.put('/:id', async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!category) return res.status(404).json({ error: 'Not found' });
        res.json(category);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/categories/seed — seed default categories
router.post('/seed', async (req, res) => {
    try {
        const existing = await Category.countDocuments();
        if (existing > 0) {
            return res.json({ message: 'Categories already seeded', count: existing });
        }

        const defaults = [
            { name: 'Food & Dining', icon: '🍕', color: '#FF6B6B', type: 'expense', budget: 0 },
            { name: 'Transportation', icon: '🚗', color: '#4ECDC4', type: 'expense', budget: 0 },
            { name: 'Shopping', icon: '🛍️', color: '#A855F7', type: 'expense', budget: 0 },
            { name: 'Entertainment', icon: '🎬', color: '#F093FB', type: 'expense', budget: 0 },
            { name: 'Bills & Utilities', icon: '💡', color: '#FFA726', type: 'expense', budget: 0 },
            { name: 'Healthcare', icon: '🏥', color: '#26C6DA', type: 'expense', budget: 0 },
            { name: 'Education', icon: '📚', color: '#5C6BC0', type: 'expense', budget: 0 },
            { name: 'Groceries', icon: '🛒', color: '#66BB6A', type: 'expense', budget: 0 },
            { name: 'Personal Care', icon: '💅', color: '#EC407A', type: 'expense', budget: 0 },
            { name: 'Rent', icon: '🏠', color: '#8D6E63', type: 'expense', budget: 0 },
            { name: 'Others', icon: '📦', color: '#78909C', type: 'expense', budget: 0 },
            { name: 'Salary', icon: '💰', color: '#00D68F', type: 'income', budget: 0 },
            { name: 'Freelance', icon: '💻', color: '#29B6F6', type: 'income', budget: 0 },
            { name: 'Investments', icon: '📈', color: '#AB47BC', type: 'income', budget: 0 },
            { name: 'Other Income', icon: '🎁', color: '#26A69A', type: 'income', budget: 0 },
        ];

        await Category.insertMany(defaults);
        res.status(201).json({ message: 'Default categories seeded', count: defaults.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

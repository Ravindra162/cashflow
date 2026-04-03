import { Router } from 'express';
import Account from '../models/Account.js';

const router = Router();

// GET /api/accounts
router.get('/', async (req, res) => {
    try {
        const accounts = await Account.find().sort({ isDefault: -1, name: 1 });
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/accounts
router.post('/', async (req, res) => {
    try {
        const account = await Account.create(req.body);
        res.status(201).json(account);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Account name already exists' });
        }
        res.status(400).json({ error: error.message });
    }
});

// PUT /api/accounts/:id
router.put('/:id', async (req, res) => {
    try {
        const account = await Account.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!account) return res.status(404).json({ error: 'Not found' });
        res.json(account);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/accounts/:id
router.delete('/:id', async (req, res) => {
    try {
        const account = await Account.findByIdAndDelete(req.params.id);
        if (!account) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/accounts/seed — seed default accounts
router.post('/seed', async (req, res) => {
    try {
        const existing = await Account.countDocuments();
        if (existing > 0) {
            return res.json({ message: 'Accounts already seeded', count: existing });
        }

        const defaults = [
            { name: 'Cash', icon: '💵', color: '#66BB6A', isDefault: true },
            { name: 'Bank Account', icon: '🏦', color: '#29B6F6', isDefault: false },
            { name: 'UPI', icon: '📱', color: '#AB47BC', isDefault: false },
        ];

        await Account.insertMany(defaults);
        res.status(201).json({ message: 'Default accounts seeded', count: defaults.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/accounts/ensure — ensure an account exists by name, create if not
router.post('/ensure', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        let account = await Account.findOne({ name });
        if (!account) {
            account = await Account.create({ name, icon: '💳', color: '#78909C' });
        }
        res.json(account);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

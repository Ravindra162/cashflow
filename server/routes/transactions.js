import { Router } from 'express';
import Transaction from '../models/Transaction.js';

const router = Router();

// GET /api/transactions/all — get ALL transactions (for export)
router.get('/all', async (req, res) => {
    try {
        const transactions = await Transaction.find().sort({ date: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/transactions/all — delete ALL transactions (reset)
router.delete('/all', async (req, res) => {
    try {
        const result = await Transaction.deleteMany({});
        res.json({ message: 'All transactions deleted', deleted: result.deletedCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/transactions — list with filters
router.get('/', async (req, res) => {
    try {
        const { startDate, endDate, category, type, account, search, page = 1, limit = 50 } = req.query;
        const filter = {};

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }
        if (category) filter.category = category;
        if (type) filter.type = type;
        if (account) filter.account = account;
        if (search) {
            filter.title = { $regex: search, $options: 'i' };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [transactions, total] = await Promise.all([
            Transaction.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(parseInt(limit)),
            Transaction.countDocuments(filter)
        ]);

        res.json({
            transactions,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/transactions — add one
router.post('/', async (req, res) => {
    try {
        const transaction = await Transaction.create(req.body);
        res.status(201).json(transaction);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// POST /api/transactions/bulk — bulk insert (for Excel import)
router.post('/bulk', async (req, res) => {
    try {
        const { transactions } = req.body;
        if (!Array.isArray(transactions) || transactions.length === 0) {
            return res.status(400).json({ error: 'Transactions array is required' });
        }
        const result = await Transaction.insertMany(transactions, { ordered: false });
        res.status(201).json({ inserted: result.length });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PUT /api/transactions/:id — update
router.put('/:id', async (req, res) => {
    try {
        const transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!transaction) return res.status(404).json({ error: 'Not found' });
        res.json(transaction);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/transactions/:id — delete
router.delete('/:id', async (req, res) => {
    try {
        const transaction = await Transaction.findByIdAndDelete(req.params.id);
        if (!transaction) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

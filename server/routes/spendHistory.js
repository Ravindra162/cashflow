import { Router } from 'express';
import SpendHistory from '../models/SpendHistory.js';
import Transaction from '../models/Transaction.js';

const router = Router();

// GET /api/spend-history — list all spend history cards
router.get('/', async (req, res) => {
    try {
        const histories = await SpendHistory.find().sort({ createdAt: -1 });
        res.json(histories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/spend-history/:id — get one card with its transaction stats
router.get('/:id', async (req, res) => {
    try {
        const history = await SpendHistory.findById(req.params.id);
        if (!history) return res.status(404).json({ error: 'Not found' });

        const dateFilter = {
            date: { $gte: history.startDate, $lte: history.endDate }
        };

        // Get summary
        const summaryResult = await Transaction.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const income = summaryResult.find(r => r._id === 'income') || { total: 0, count: 0 };
        const expense = summaryResult.find(r => r._id === 'expense') || { total: 0, count: 0 };

        // Get category breakdown
        const categoryBreakdown = await Transaction.aggregate([
            { $match: { ...dateFilter, type: 'expense' } },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { total: -1 } }
        ]);

        // Get transactions for this period
        const transactions = await Transaction.find(dateFilter).sort({ date: -1 });

        res.json({
            ...history.toObject(),
            summary: {
                income: income.total,
                expense: expense.total,
                balance: income.total - expense.total,
                totalTransactions: income.count + expense.count
            },
            categoryBreakdown,
            transactions
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/spend-history — create new
router.post('/', async (req, res) => {
    try {
        const history = await SpendHistory.create(req.body);
        res.status(201).json(history);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PUT /api/spend-history/:id — update
router.put('/:id', async (req, res) => {
    try {
        const history = await SpendHistory.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!history) return res.status(404).json({ error: 'Not found' });
        res.json(history);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/spend-history/:id — delete
router.delete('/:id', async (req, res) => {
    try {
        const history = await SpendHistory.findByIdAndDelete(req.params.id);
        if (!history) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

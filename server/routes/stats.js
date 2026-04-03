import { Router } from 'express';
import Transaction from '../models/Transaction.js';

const router = Router();

// GET /api/stats/summary — totals for a period
router.get('/summary', async (req, res) => {
    try {
        const { startDate, endDate, account } = req.query;
        const filter = {};

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }
        if (account) filter.account = account;

        const result = await Transaction.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const income = result.find(r => r._id === 'income') || { total: 0, count: 0 };
        const expense = result.find(r => r._id === 'expense') || { total: 0, count: 0 };

        res.json({
            income: income.total,
            expense: expense.total,
            balance: income.total - expense.total,
            incomeCount: income.count,
            expenseCount: expense.count,
            totalTransactions: income.count + expense.count
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/stats/by-category — spending per category
router.get('/by-category', async (req, res) => {
    try {
        const { startDate, endDate, type = 'expense', account } = req.query;
        const filter = { type };

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }
        if (account) filter.account = account;

        const result = await Transaction.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { total: -1 } }
        ]);

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/stats/monthly — monthly trend
router.get('/monthly', async (req, res) => {
    try {
        const { year, account } = req.query;
        const matchYear = year ? parseInt(year) : new Date().getFullYear();

        const matchFilter = {
            date: {
                $gte: new Date(`${matchYear}-01-01`),
                $lte: new Date(`${matchYear}-12-31`)
            }
        };
        if (account) matchFilter.account = account;

        const result = await Transaction.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: {
                        month: { $month: '$date' },
                        type: '$type'
                    },
                    total: { $sum: '$amount' }
                }
            },
            { $sort: { '_id.month': 1 } }
        ]);

        // Format into array of { month, income, expense }
        const months = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            monthName: new Date(2026, i, 1).toLocaleString('default', { month: 'short' }),
            income: 0,
            expense: 0
        }));

        result.forEach(r => {
            const idx = r._id.month - 1;
            months[idx][r._id.type] = r.total;
        });

        res.json(months);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/stats/by-account — balance per account
router.get('/by-account', async (req, res) => {
    try {
        const result = await Transaction.aggregate([
            {
                $group: {
                    _id: { account: '$account', type: '$type' },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.account': 1 } }
        ]);

        // Reshape into per-account summaries
        const accountMap = {};
        result.forEach(r => {
            const acc = r._id.account || 'Cash';
            if (!accountMap[acc]) {
                accountMap[acc] = { account: acc, income: 0, expense: 0, balance: 0, transactions: 0 };
            }
            accountMap[acc][r._id.type] = r.total;
            accountMap[acc].transactions += r.count;
        });

        // Calculate balance
        Object.values(accountMap).forEach(a => {
            a.balance = a.income - a.expense;
        });

        res.json(Object.values(accountMap).sort((a, b) => b.balance - a.balance));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

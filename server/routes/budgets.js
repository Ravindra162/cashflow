import { Router } from 'express';
import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';

const router = Router();

// Helper: get date range for a budget's current active period
function getDateRange(budget) {
    const now = new Date();
    let start, end;

    switch (budget.period) {
        case 'weekly': {
            const day = now.getDay();
            start = new Date(now);
            start.setDate(now.getDate() - day);
            start.setHours(0, 0, 0, 0);
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            break;
        }
        case 'monthly': {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
        }
        case 'yearly': {
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;
        }
        case 'custom': {
            start = budget.startDate ? new Date(budget.startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
            end = budget.endDate ? new Date(budget.endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
        }
        default:
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    return { start, end };
}

// GET /api/budgets — list all budgets
router.get('/', async (req, res) => {
    try {
        const budgets = await Budget.find().sort({ createdAt: -1 });
        res.json(budgets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/budgets/status — budgets with current spending calculated
router.get('/status', async (req, res) => {
    try {
        const budgets = await Budget.find();
        const results = [];

        for (const budget of budgets) {
            const { start, end } = getDateRange(budget);
            const filter = {
                type: 'expense',
                date: { $gte: start, $lte: end }
            };

            // If not a total budget, filter by category
            if (budget.category !== '__ALL__') {
                filter.category = budget.category;
            }

            const agg = await Transaction.aggregate([
                { $match: filter },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            const spent = agg.length > 0 ? agg[0].total : 0;
            const percentage = Math.round((spent / budget.limit) * 100);
            const remaining = Math.max(0, budget.limit - spent);

            let status = 'ok';
            if (percentage >= 100) status = 'exceeded';
            else if (percentage >= budget.alertAt) status = 'warning';

            results.push({
                _id: budget._id,
                category: budget.category,
                limit: budget.limit,
                period: budget.period,
                startDate: budget.startDate,
                endDate: budget.endDate,
                alertAt: budget.alertAt,
                spent,
                percentage,
                remaining,
                status,
                periodLabel: budget.period === 'custom'
                    ? `${start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} — ${end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
                    : budget.period.charAt(0).toUpperCase() + budget.period.slice(1)
            });
        }

        // Sort: exceeded first, then warning, then ok
        const order = { exceeded: 0, warning: 1, ok: 2 };
        results.sort((a, b) => order[a.status] - order[b.status]);

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/budgets — create budget
router.post('/', async (req, res) => {
    try {
        const { category, limit, period, startDate, endDate, alertAt } = req.body;

        // Check for duplicate category+period
        const existing = await Budget.findOne({ category, period });
        if (existing) {
            return res.status(400).json({ error: `Budget for "${category}" (${period}) already exists` });
        }

        const budget = await Budget.create({
            category, limit, period,
            startDate: period === 'custom' ? startDate : null,
            endDate: period === 'custom' ? endDate : null,
            alertAt: alertAt || 80
        });
        res.status(201).json(budget);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PUT /api/budgets/:id — update budget
router.put('/:id', async (req, res) => {
    try {
        const budget = await Budget.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!budget) return res.status(404).json({ error: 'Budget not found' });
        res.json(budget);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/budgets/:id — delete budget
router.delete('/:id', async (req, res) => {
    try {
        const budget = await Budget.findByIdAndDelete(req.params.id);
        if (!budget) return res.status(404).json({ error: 'Budget not found' });
        res.json({ message: 'Budget deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

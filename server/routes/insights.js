import { Router } from 'express';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';

const router = Router();

router.post('/generate', async (req, res) => {
    try {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'OpenRouter API key not configured. Add OPENROUTER_API_KEY to your .env' });
        }

        // Gather data: current month
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // Previous month
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        // Current month summary
        const currentSummary = await Transaction.aggregate([
            { $match: { date: { $gte: currentMonthStart, $lte: currentMonthEnd } } },
            { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);

        // Previous month summary
        const prevSummary = await Transaction.aggregate([
            { $match: { date: { $gte: prevMonthStart, $lte: prevMonthEnd } } },
            { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);

        // Current month by category
        const currentCategories = await Transaction.aggregate([
            { $match: { type: 'expense', date: { $gte: currentMonthStart, $lte: currentMonthEnd } } },
            { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
            { $limit: 10 }
        ]);

        // Previous month by category
        const prevCategories = await Transaction.aggregate([
            { $match: { type: 'expense', date: { $gte: prevMonthStart, $lte: prevMonthEnd } } },
            { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } }
        ]);

        // Top 5 largest transactions this month
        const topTransactions = await Transaction.find({
            type: 'expense',
            date: { $gte: currentMonthStart, $lte: currentMonthEnd }
        }).sort({ amount: -1 }).limit(5).lean();

        // Budget status
        const budgets = await Budget.find().lean();

        // Format data
        const curIncome = currentSummary.find(s => s._id === 'income')?.total || 0;
        const curExpense = currentSummary.find(s => s._id === 'expense')?.total || 0;
        const prevIncome = prevSummary.find(s => s._id === 'income')?.total || 0;
        const prevExpense = prevSummary.find(s => s._id === 'expense')?.total || 0;

        const monthName = now.toLocaleString('default', { month: 'long' });
        const prevMonthName = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString('default', { month: 'long' });

        const prompt = `You are a personal finance advisor analyzing spending data for a user's expense tracker app called CashFlow. Analyze the following data and provide exactly 4 concise, actionable insights.

## Current Month (${monthName})
- Total Income: ₹${curIncome.toLocaleString('en-IN')}
- Total Expenses: ₹${curExpense.toLocaleString('en-IN')}
- Net Savings: ₹${(curIncome - curExpense).toLocaleString('en-IN')}

## Previous Month (${prevMonthName})
- Total Income: ₹${prevIncome.toLocaleString('en-IN')}
- Total Expenses: ₹${prevExpense.toLocaleString('en-IN')}

## Top Spending Categories (${monthName})
${currentCategories.map((c, i) => `${i + 1}. ${c._id}: ₹${c.total.toLocaleString('en-IN')} (${c.count} transactions)`).join('\n')}

## Previous Month Categories
${prevCategories.map(c => `- ${c._id}: ₹${c.total.toLocaleString('en-IN')}`).join('\n')}

## Largest Single Expenses This Month
${topTransactions.map(t => `- ${t.title}: ₹${t.amount.toLocaleString('en-IN')} (${t.category})`).join('\n')}

${budgets.length > 0 ? `## Active Budgets\n${budgets.map(b => `- ${b.category}: ₹${b.limit.toLocaleString('en-IN')} limit (${b.period})`).join('\n')}` : ''}

Rules:
- Respond ONLY with valid JSON, no markdown code fences, no extra text
- Format: { "insights": [ { "type": "warning|tip|positive|info", "title": "Short title (max 6 words)", "body": "1-2 sentence insight with specific numbers and actionable advice" } ] }
- Types: "warning" for overspending/risks, "tip" for savings opportunities, "positive" for good trends, "info" for interesting patterns
- Use ₹ symbol and Indian number formatting
- Be specific with percentages and amounts, reference actual category names
- If there's no data, provide general financial tips`;

        const modelsToTry = [
            'minimax/minimax-m2.5:free', // Requested by user (may fail due to privacy)
            'meta-llama/llama-3.3-70b-instruct:free', // Extremely powerful and usually reliable
            'google/gemma-3-27b-it:free',
            'nousresearch/hermes-3-llama-3.1-405b:free'
        ];

        let responseText;
        let lastErrorMsg;

        for (const modelId of modelsToTry) {
            try {
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://cashflow-app.vercel.app',
                        'X-Title': 'CashFlow Expense Tracker'
                    },
                    body: JSON.stringify({
                        model: modelId,
                        messages: [
                            { role: 'system', content: 'You are a financial analyst. Respond ONLY with valid JSON. No markdown fences.' },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.7,
                        max_tokens: 800
                    })
                });

                if (!response.ok) {
                    const errorBody = await response.text();
                    throw new Error(`OpenRouter API error (${response.status}) for ${modelId}: ${errorBody}`);
                }

                const data = await response.json();
                responseText = data.choices?.[0]?.message?.content?.trim();

                if (responseText) {
                    break; // Success, exit loop
                }
            } catch (err) {
                lastErrorMsg = err.message;
                console.warn(`Model ${modelId} failed, trying next...`);
            }
        }

        if (!responseText) {
            console.warn('All AI models failed, using deterministic local insights fallback. Last error:', lastErrorMsg);
            
            const localInsights = [];
            
            // 1. Expense trend
            if (curExpense > prevExpense * 1.1) {
                localInsights.push({
                    type: 'warning',
                    title: 'Expenses Trending Up',
                    body: `Your spending this month (₹${curExpense.toLocaleString('en-IN')}) is noticeably higher than last month. Consider reviewing your casual expenses.`
                });
            } else if (curExpense < prevExpense * 0.9 && curExpense > 0) {
                localInsights.push({
                    type: 'positive',
                    title: 'Great Savings Score',
                    body: `You've spent less this month compared to last month. Keep up the disciplined spending!`
                });
            } else {
                localInsights.push({
                    type: 'info',
                    title: 'Consistent Spending',
                    body: `Your expenses are tracking very similarly to last month's pace.`
                });
            }
            
            // 2. Savings rate
            const totalIncome = curIncome > 0 ? curIncome : 1; // avoid div by zero
            const savingsRate = ((curIncome - curExpense) / totalIncome) * 100;
            if (savingsRate > 20) {
                localInsights.push({
                    type: 'positive',
                    title: 'Healthy Savings Rate',
                    body: `You are saving over 20% of your income. Excellent financial buffer!`
                });
            } else if (savingsRate < 5 && curIncome > 0) {
                 localInsights.push({
                    type: 'tip',
                    title: 'Boost Your Savings',
                    body: `Your savings buffer is thin. Try to funnel at least 10-15% of your income into savings right when you get paid.`
                });
            }

            // 3. Category analysis
            if (currentCategories.length > 0) {
                localInsights.push({
                    type: 'info',
                    title: `Top Category: ${currentCategories[0]._id}`,
                    body: `You've spent ₹${currentCategories[0].total.toLocaleString('en-IN')} on ${currentCategories[0]._id} this month. Is this aligned with your goals?`
                });
            }

            // 4. General tip
            localInsights.push({
                type: 'tip',
                title: 'Review Subscriptions',
                body: `It's a good time to review your auto-renew subscriptions. Cancel anything you haven't used in the past 30 days.`
            });

            return res.json({ insights: localInsights.slice(0, 4) });
        }

        // Parse JSON from the response (handle potential markdown fences)
        let parsed;
        try {
            const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            parsed = JSON.parse(jsonStr);
        } catch {
            const match = responseText.match(/\{[\s\S]*\}/);
            if (match) {
                parsed = JSON.parse(match[0]);
            } else {
                throw new Error('Failed to parse AI response');
            }
        }

        res.json(parsed);
    } catch (error) {
        console.error('Insights generation error:', error);
        res.status(500).json({ error: 'Failed to generate insights: ' + error.message });
    }
});

export default router;

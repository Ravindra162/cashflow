import { Router } from 'express';
import Split from '../models/Split.js';
import Transaction from '../models/Transaction.js';

const router = Router();

// GET /api/splits
router.get('/', async (req, res) => {
    try {
        const splits = await Split.find().populate('friend').sort({ createdAt: -1 });
        res.json(splits);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/splits
router.post('/', async (req, res) => {
    try {
        const { friendId, amount, notes, transactionId } = req.body;
        
        let split;
        
        // If it's a split tied to a transaction
        if (transactionId) {
            const transaction = await Transaction.findById(transactionId);
            if (!transaction) {
                return res.status(404).json({ error: 'Transaction not found' });
            }
            // Ensure we don't over-commit the pending split
            const maxAllowed = transaction.amount - (transaction.pendingSplitAmount || 0);
            if (Number(amount) > maxAllowed) {
                return res.status(400).json({ error: 'Split amount exceeds remaining transaction amount' });
            }
            transaction.pendingSplitAmount = (transaction.pendingSplitAmount || 0) + Number(amount);
            await transaction.save();
            
            split = new Split({ friend: friendId, amount, notes, transactionId });
        } else {
            split = new Split({ friend: friendId, amount, notes });
        }

        await split.save();
        await split.populate('friend');
        res.status(201).json(split);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PUT /api/splits/:id
router.put('/:id', async (req, res) => {
    try {
        const { status, amount, notes } = req.body;
        const split = await Split.findById(req.params.id).populate('friend');
        
        if (!split) return res.status(404).json({ error: 'Split not found' });

        const previousStatus = split.status;
        const previousAmount = split.amount;

        // Update fields
        if (status !== undefined) split.status = status;
        if (notes !== undefined) split.notes = notes;
        if (amount !== undefined) split.amount = Number(amount);
        
        // Transaction logic
        if (split.transactionId) {
            const tx = await Transaction.findById(split.transactionId);
            if (tx) {
                // If the split amount changed and it's still pending
                if (amount !== undefined && Number(amount) !== previousAmount && split.status === 'pending' && previousStatus === 'pending') {
                    tx.pendingSplitAmount = (tx.pendingSplitAmount || 0) - previousAmount + Number(amount);
                    await tx.save();
                }

                // If changing to 'settled'
                if (split.status === 'settled' && previousStatus === 'pending') {
                    if (tx.originalAmount === null || tx.originalAmount === undefined) {
                        tx.originalAmount = tx.amount;
                    }
                    // Remove from pending, deduct from actual
                    tx.pendingSplitAmount = Math.max(0, (tx.pendingSplitAmount || 0) - previousAmount);
                    tx.amount = Math.max(0, tx.amount - split.amount);
                    
                    const noteAppend = ` [Settled: ₹${split.amount} from ${split.friend.name}]`;
                    tx.notes = tx.notes ? tx.notes + noteAppend : noteAppend.trim();
                    await tx.save();
                }
            }
        }

        await split.save();
        res.json(split);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/splits/:id
router.delete('/:id', async (req, res) => {
    try {
        const split = await Split.findById(req.params.id);
        if (!split) return res.status(404).json({ error: 'Split not found' });

        if (split.status === 'pending' && split.transactionId) {
            const tx = await Transaction.findById(split.transactionId);
            if (tx) {
                tx.pendingSplitAmount = Math.max(0, (tx.pendingSplitAmount || 0) - split.amount);
                await tx.save();
            }
        }

        await split.deleteOne();
        res.json({ message: 'Split deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

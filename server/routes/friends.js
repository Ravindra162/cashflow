import { Router } from 'express';
import Friend from '../models/Friend.js';

const router = Router();

// GET /api/friends
router.get('/', async (req, res) => {
    try {
        const friends = await Friend.find().sort({ name: 1 });
        res.json(friends);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/friends
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        
        let friend = await Friend.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (friend) {
            return res.status(400).json({ error: 'Friend already exists' });
        }
        
        friend = new Friend({ name });
        await friend.save();
        res.status(201).json(friend);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/friends/:id
router.delete('/:id', async (req, res) => {
    try {
        const friend = await Friend.findById(req.params.id);
        if (!friend) return res.status(404).json({ error: 'Friend not found' });

        await friend.deleteOne();
        res.json({ message: 'Friend deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

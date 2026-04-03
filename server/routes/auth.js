import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

// On first startup, hash the APP_PASSWORD if not already done
let hashedPassword = null;

async function getHashedPassword() {
    if (!hashedPassword) {
        hashedPassword = await bcrypt.hash(process.env.APP_PASSWORD, 10);
    }
    return hashedPassword;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }

        const hash = await getHashedPassword();
        const isValid = await bcrypt.compare(password, hash);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        const token = jwt.sign(
            { role: 'owner' },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({ token, message: 'Login successful' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/auth/verify — check if token is still valid
router.get('/verify', (req, res) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ valid: false });
    }
    try {
        jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
        res.json({ valid: true });
    } catch {
        res.status(401).json({ valid: false });
    }
});

export default router;

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import categoryRoutes from './routes/categories.js';
import statsRoutes from './routes/stats.js';
import spendHistoryRoutes from './routes/spendHistory.js';
import accountRoutes from './routes/accounts.js';
import splitRoutes from './routes/splits.js';
import friendRoutes from './routes/friends.js';
import budgetRoutes from './routes/budgets.js';
import insightRoutes from './routes/insights.js';
import auth from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Database Connection
const connectDB = async () => {
    if (mongoose.connections[0].readyState) return;
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
    }
};

// Top-level middleware to ensure DB connection in Vercel serverless functions
if (process.env.VERCEL) {
    app.use(async (req, res, next) => {
        await connectDB();
        next();
    });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', auth, transactionRoutes);
app.use('/api/categories', auth, categoryRoutes);
app.use('/api/stats', auth, statsRoutes);
app.use('/api/spend-history', auth, spendHistoryRoutes);
app.use('/api/accounts', auth, accountRoutes);
app.use('/api/splits', auth, splitRoutes);
app.use('/api/friends', auth, friendRoutes);
app.use('/api/budgets', auth, budgetRoutes);
app.use('/api/insights', auth, insightRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server locally (if not in Vercel)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    connectDB().then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    });
}

export default app;

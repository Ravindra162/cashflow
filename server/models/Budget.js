import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema({
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true
    },
    limit: {
        type: Number,
        required: [true, 'Budget limit is required'],
        min: 1
    },
    period: {
        type: String,
        enum: ['weekly', 'monthly', 'yearly', 'custom'],
        default: 'monthly'
    },
    startDate: {
        type: Date,
        default: null
    },
    endDate: {
        type: Date,
        default: null
    },
    alertAt: {
        type: Number,
        default: 80,
        min: 1,
        max: 100
    }
}, {
    timestamps: true
});

budgetSchema.index({ category: 1 });

export default mongoose.model('Budget', budgetSchema);

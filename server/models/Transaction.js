import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: 200
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: 0
    },
    type: {
        type: String,
        required: true,
        enum: ['expense', 'income'],
        default: 'expense'
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },
    account: {
        type: String,
        trim: true,
        default: 'Cash'
    }
}, {
    timestamps: true
});

transactionSchema.index({ date: -1 });
transactionSchema.index({ category: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ account: 1 });

export default mongoose.model('Transaction', transactionSchema);

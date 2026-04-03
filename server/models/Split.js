import mongoose from 'mongoose';

const splitSchema = new mongoose.Schema({
    friend: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Friend',
        required: [true, 'Friend is required']
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: 0.01
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'settled'],
        default: 'pending'
    },
    transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        default: null
    }
}, {
    timestamps: true
});

splitSchema.index({ status: 1 });
splitSchema.index({ friend: 1 });

export default mongoose.model('Split', splitSchema);

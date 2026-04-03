import mongoose from 'mongoose';

const spendHistorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: 100
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required']
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 200,
        default: ''
    }
}, {
    timestamps: true
});

spendHistorySchema.index({ startDate: -1 });

export default mongoose.model('SpendHistory', spendHistorySchema);

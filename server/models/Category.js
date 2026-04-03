import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
        unique: true,
        maxlength: 50
    },
    icon: {
        type: String,
        default: '📦'
    },
    color: {
        type: String,
        default: '#6C5CE7',
        match: /^#[0-9A-Fa-f]{6}$/
    },
    type: {
        type: String,
        required: true,
        enum: ['expense', 'income'],
        default: 'expense'
    },
    budget: {
        type: Number,
        min: 0,
        default: 0
    }
}, {
    timestamps: true
});

export default mongoose.model('Category', categorySchema);

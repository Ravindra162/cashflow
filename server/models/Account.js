import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Account name is required'],
        trim: true,
        unique: true,
        maxlength: 50
    },
    icon: {
        type: String,
        default: '💳'
    },
    color: {
        type: String,
        default: '#6C5CE7',
        match: /^#[0-9A-Fa-f]{6}$/
    },
    balance: {
        type: Number,
        default: 0
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

export default mongoose.model('Account', accountSchema);

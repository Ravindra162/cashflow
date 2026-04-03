import mongoose from 'mongoose';

const friendSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Friend name is required'],
        trim: true,
        maxlength: 100,
        unique: true
    }
}, {
    timestamps: true
});

export default mongoose.model('Friend', friendSchema);

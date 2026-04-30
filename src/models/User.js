const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'manager', 'driver', 'audit', 'viewer'],
        default: 'viewer'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    phone: String,
    address: String,
    lastLogin: Date
}, {
    timestamps: true
});

// Pre-save hook to hash password - CORRECTED VERSION
userSchema.pre('save', async function(next) {
    try {
        console.log('Pre-save hook triggered for user:', this.email);
        
        // Only hash if password is modified
        if (!this.isModified('password')) {
            console.log('Password not modified, skipping hash');
            return; // Just return, don't call next()
        }
        
        console.log('Hashing password...');
        const salt = await bcrypt.genSalt(10);
        console.log('Salt generated');
        
        this.password = await bcrypt.hash(this.password, salt);
        console.log('Password hashed successfully');
        
        // Don't call next() here - the promise resolves automatically
    } catch (error) {
        console.error('Error in pre-save hook:', error);
        throw error; // Throw the error instead of calling next(error)
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        console.log('Comparing password for user:', this.email);
        const isMatch = await bcrypt.compare(candidatePassword, this.password);
        console.log('Password comparison result:', isMatch);
        return isMatch;
    } catch (error) {
        console.error('Error comparing password:', error);
        throw error;
    }
};

// Handle any errors after save (optional)
userSchema.post('save', function(error, doc, next) {
    if (error) {
        console.error('Error after save:', error);
        next(error);
    } else {
        next();
    }
});

module.exports = mongoose.model('User', userSchema);
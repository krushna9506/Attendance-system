const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'teacher', 'student'],
    default: 'student'
  },
  department: {
    type: String,
    required: [true, 'Department is required']
  },
  studentId: {
    type: String,
    sparse: true,
    unique: true
  },
  faceDescriptor: {
    type: [Number],
    select: false
  },
  faceRegistered: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Update face registration status
userSchema.methods.updateFaceRegistration = async function(descriptor) {
  this.faceDescriptor = descriptor;
  this.faceRegistered = true;
  await this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User; 
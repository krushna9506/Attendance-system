const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  checkInTime: {
    type: Date
  },
  checkOutTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['present', 'late', 'absent', 'excused', 'pending'],
    default: 'pending'
  },
  verificationMethod: {
    type: String,
    enum: ['face', 'qr', 'manual'],
    required: [true, 'Verification method is required']
  },
  verificationScore: {
    type: Number,
    min: 0,
    max: 1
  },
  qrToken: {
    type: String
  },
  deviceInfo: {
    ip: String,
    userAgent: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    }
  },
  notes: {
    type: String
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
attendanceSchema.index({ event: 1, user: 1 }, { unique: true });
attendanceSchema.index({ checkInTime: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ 'deviceInfo.location': '2dsphere' });

// Virtual for attendance duration in minutes
attendanceSchema.virtual('duration').get(function() {
  if (!this.checkInTime || !this.checkOutTime) return null;
  return Math.round((this.checkOutTime - this.checkInTime) / (1000 * 60));
});

// Method to check out
attendanceSchema.methods.checkOut = async function() {
  this.checkOutTime = new Date();
  await this.save();
};

// Method to update verification
attendanceSchema.methods.updateVerification = async function(method, score, token) {
  this.verificationMethod = method;
  if (score) this.verificationScore = score;
  if (token) this.qrToken = token;
  await this.save();
};

// Method to update device info
attendanceSchema.methods.updateDeviceInfo = async function(ip, userAgent, location) {
  this.deviceInfo = {
    ip,
    userAgent,
    location: {
      type: 'Point',
      coordinates: location
    }
  };
  await this.save();
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance; 
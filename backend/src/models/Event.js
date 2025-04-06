const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required']
  },
  endTime: {
    type: Date,
    required: [true, 'End time is required']
  },
  location: {
    type: String,
    required: [true, 'Location is required']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  qrCode: {
    type: String
  },
  qrToken: {
    type: String
  },
  qrExpiryTime: {
    type: Date
  },
  verificationMethods: {
    type: [String],
    enum: ['face', 'qr', 'manual'],
    default: ['qr']
  },
  settings: {
    allowLateCheckIn: {
      type: Boolean,
      default: true
    },
    lateCheckInThreshold: {
      type: Number,
      default: 15 // minutes
    },
    requireFaceVerification: {
      type: Boolean,
      default: false
    },
    requireQRVerification: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
eventSchema.index({ startTime: 1, endTime: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ creator: 1 });

// Virtual for event duration in minutes
eventSchema.virtual('duration').get(function() {
  return Math.round((this.endTime - this.startTime) / (1000 * 60));
});

// Method to check if event is active
eventSchema.methods.isActive = function() {
  const now = new Date();
  return now >= this.startTime && now <= this.endTime;
};

// Method to check if event is in late check-in period
eventSchema.methods.isInLateCheckInPeriod = function() {
  if (!this.settings.allowLateCheckIn) return false;
  
  const now = new Date();
  const lateThreshold = new Date(this.startTime.getTime() + (this.settings.lateCheckInThreshold * 60000));
  return now > this.startTime && now <= lateThreshold;
};

// Method to update QR code
eventSchema.methods.updateQRCode = async function(qrCode, token, expiryTime) {
  this.qrCode = qrCode;
  this.qrToken = token;
  this.qrExpiryTime = expiryTime;
  await this.save();
};

const Event = mongoose.model('Event', eventSchema);

module.exports = Event; 
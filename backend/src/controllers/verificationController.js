const { APIError } = require('../utils/errorUtils');
const logger = require('../utils/logger');
const { verifyFace, extractFaceFeatures } = require('../utils/faceRecognitionUtils');
const { verifyQRToken, generateAttendanceQRCode } = require('../utils/qrCodeUtils');
const User = require('../models/user');
const Event = require('../models/event');
const Attendance = require('../models/attendance');
const { sendEmail } = require('../utils/emailUtils');

// Verify attendance using face recognition
const verifyAttendanceWithFace = async (req, res) => {
  try {
    const { eventId, userId } = req.params;
    const { imageData } = req.body;

    // Check if event exists and is active
    const event = await Event.findById(eventId);
    if (!event) {
      throw new APIError(404, 'Event not found');
    }
    if (event.status !== 'active') {
      throw new APIError(400, 'Event is not active');
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new APIError(404, 'User not found');
    }

    // Check if user has already marked attendance
    const existingAttendance = await Attendance.findOne({
      event: eventId,
      user: userId,
      status: { $in: ['present', 'late'] }
    });
    if (existingAttendance) {
      throw new APIError(400, 'Attendance already marked');
    }

    // Convert base64 image to buffer
    const imageBuffer = Buffer.from(imageData.split(',')[1], 'base64');

    // Verify face against stored descriptor
    const verificationResult = await verifyFace(imageBuffer, user.faceDescriptor);
    
    if (!verificationResult.isVerified) {
      logger.warn(`Face verification failed for user ${userId} at event ${eventId}`);
      throw new APIError(400, 'Face verification failed');
    }

    // Create attendance record
    const attendance = new Attendance({
      event: eventId,
      user: userId,
      checkInTime: new Date(),
      status: 'present',
      verificationMethod: 'face',
      verificationScore: verificationResult.similarity
    });
    await attendance.save();

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Attendance Confirmation',
      text: `Your attendance has been marked for the event: ${event.title}`
    });

    logger.info(`Face verification successful for user ${userId} at event ${eventId}`);
    
    res.status(200).json({
      success: true,
      message: 'Attendance marked successfully',
      data: {
        attendanceId: attendance._id,
        checkInTime: attendance.checkInTime,
        verificationScore: verificationResult.similarity
      }
    });
  } catch (error) {
    logger.error('Error in face verification:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

// Verify attendance using QR code
const verifyAttendanceWithQRCode = async (req, res) => {
  try {
    const { eventId, userId } = req.params;
    const { qrToken } = req.body;

    // Check if event exists and is active
    const event = await Event.findById(eventId);
    if (!event) {
      throw new APIError(404, 'Event not found');
    }
    if (event.status !== 'active') {
      throw new APIError(400, 'Event is not active');
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new APIError(404, 'User not found');
    }

    // Check if user has already marked attendance
    const existingAttendance = await Attendance.findOne({
      event: eventId,
      user: userId,
      status: { $in: ['present', 'late'] }
    });
    if (existingAttendance) {
      throw new APIError(400, 'Attendance already marked');
    }

    // Verify QR token
    const isTokenValid = verifyQRToken(qrToken, event.qrToken);
    if (!isTokenValid) {
      logger.warn(`Invalid QR token for user ${userId} at event ${eventId}`);
      throw new APIError(400, 'Invalid QR code');
    }

    // Check if QR code has expired
    if (event.qrExpiryTime && new Date() > event.qrExpiryTime) {
      throw new APIError(400, 'QR code has expired');
    }

    // Create attendance record
    const attendance = new Attendance({
      event: eventId,
      user: userId,
      checkInTime: new Date(),
      status: 'present',
      verificationMethod: 'qr'
    });
    await attendance.save();

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Attendance Confirmation',
      text: `Your attendance has been marked for the event: ${event.title}`
    });

    logger.info(`QR verification successful for user ${userId} at event ${eventId}`);
    
    res.status(200).json({
      success: true,
      message: 'Attendance marked successfully',
      data: {
        attendanceId: attendance._id,
        checkInTime: attendance.checkInTime
      }
    });
  } catch (error) {
    logger.error('Error in QR verification:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

// Register user face
const registerUserFace = async (req, res) => {
  try {
    const { userId } = req.params;
    const { imageData } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new APIError(404, 'User not found');
    }

    // Convert base64 image to buffer
    const imageBuffer = Buffer.from(imageData.split(',')[1], 'base64');

    // Extract face features
    const features = await extractFaceFeatures(imageBuffer);
    
    // Update user with face descriptor
    user.faceDescriptor = features.descriptor;
    await user.save();

    logger.info(`Face registered successfully for user ${userId}`);
    
    res.status(200).json({
      success: true,
      message: 'Face registered successfully'
    });
  } catch (error) {
    logger.error('Error registering face:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

// Generate attendance QR code
const generateAttendanceVerificationQR = async (req, res) => {
  try {
    const { eventId, userId } = req.params;
    
    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      throw new APIError(404, 'Event not found');
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new APIError(404, 'User not found');
    }

    // Create a temporary attendance record
    const attendance = new Attendance({
      event: eventId,
      user: userId,
      status: 'pending',
      verificationMethod: 'qr'
    });
    await attendance.save();

    // Generate QR code for attendance verification
    const { qrCode, token } = await generateAttendanceQRCode(
      attendance._id,
      eventId,
      userId
    );

    // Update attendance with QR token
    attendance.qrToken = token;
    await attendance.save();

    logger.info(`Attendance QR code generated for user ${userId} at event ${eventId}`);
    
    res.status(200).json({
      success: true,
      data: {
        qrCode,
        attendanceId: attendance._id
      }
    });
  } catch (error) {
    logger.error('Error generating attendance QR code:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  verifyAttendanceWithFace,
  verifyAttendanceWithQRCode,
  registerUserFace,
  generateAttendanceVerificationQR
}; 
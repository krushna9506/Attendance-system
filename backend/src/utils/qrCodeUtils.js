const QRCode = require('qrcode');
const crypto = require('crypto');
const { APIError } = require('./errorUtils');
const logger = require('./logger');

// Generate a unique token for QR code
const generateQRToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate QR code data URL
const generateQRCode = async (data, options = {}) => {
  try {
    const defaultOptions = {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    };

    const qrOptions = { ...defaultOptions, ...options };
    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(data), qrOptions);
    
    return qrDataUrl;
  } catch (error) {
    logger.error('Error generating QR code:', error);
    throw new APIError(500, 'Error generating QR code');
  }
};

// Generate QR code for event
const generateEventQRCode = async (eventId, expiryTime) => {
  try {
    const token = generateQRToken();
    const qrData = {
      eventId,
      token,
      expiryTime,
      timestamp: Date.now()
    };

    const qrCode = await generateQRCode(qrData);
    
    return {
      qrCode,
      token,
      expiryTime
    };
  } catch (error) {
    logger.error('Error generating event QR code:', error);
    throw new APIError(500, 'Error generating event QR code');
  }
};

// Verify QR code token
const verifyQRToken = (token, storedToken) => {
  try {
    return token === storedToken;
  } catch (error) {
    logger.error('Error verifying QR token:', error);
    throw new APIError(500, 'Error verifying QR token');
  }
};

// Generate QR code for user profile
const generateUserProfileQRCode = async (userId, userData) => {
  try {
    const qrData = {
      userId,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      timestamp: Date.now()
    };

    const qrCode = await generateQRCode(qrData);
    return qrCode;
  } catch (error) {
    logger.error('Error generating user profile QR code:', error);
    throw new APIError(500, 'Error generating user profile QR code');
  }
};

// Generate QR code for attendance verification
const generateAttendanceQRCode = async (attendanceId, eventId, userId) => {
  try {
    const token = generateQRToken();
    const qrData = {
      attendanceId,
      eventId,
      userId,
      token,
      timestamp: Date.now()
    };

    const qrCode = await generateQRCode(qrData);
    
    return {
      qrCode,
      token
    };
  } catch (error) {
    logger.error('Error generating attendance QR code:', error);
    throw new APIError(500, 'Error generating attendance QR code');
  }
};

module.exports = {
  generateQRCode,
  generateEventQRCode,
  verifyQRToken,
  generateUserProfileQRCode,
  generateAttendanceQRCode
}; 
const qrcode = require('qrcode');
const crypto = require('crypto');
const logger = require('./logger');

/**
 * Generate a QR code for attendance
 * @param {Object} data - Data to encode in the QR code
 * @param {string} data.eventId - Event ID
 * @param {string} data.eventName - Event name
 * @param {Date} data.expiryTime - Expiry time for the QR code
 * @returns {Promise<string>} - Base64 encoded QR code image
 */
const generateAttendanceQRCode = async (data) => {
  try {
    // Add a signature to prevent tampering
    const signature = crypto
      .createHmac('sha256', process.env.QR_SECRET || 'default-secret')
      .update(JSON.stringify(data))
      .digest('hex');
    
    const qrData = {
      ...data,
      signature,
      timestamp: new Date().toISOString()
    };
    
    // Generate QR code as data URL
    const qrCodeDataUrl = await qrcode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300
    });
    
    logger.info('QR code generated successfully', { eventId: data.eventId });
    return qrCodeDataUrl;
  } catch (error) {
    logger.error('Error generating QR code', { error: error.message, data });
    throw error;
  }
};

/**
 * Validate a QR code for attendance
 * @param {string} qrCodeData - Decoded QR code data
 * @returns {Object} - Validated data or null if invalid
 */
const validateAttendanceQRCode = (qrCodeData) => {
  try {
    const data = JSON.parse(qrCodeData);
    
    // Check if QR code has expired
    const expiryTime = new Date(data.expiryTime);
    if (expiryTime < new Date()) {
      logger.warn('Expired QR code scanned', { 
        eventId: data.eventId,
        expiryTime: data.expiryTime
      });
      return null;
    }
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.QR_SECRET || 'default-secret')
      .update(JSON.stringify({
        eventId: data.eventId,
        eventName: data.eventName,
        expiryTime: data.expiryTime
      }))
      .digest('hex');
    
    if (data.signature !== expectedSignature) {
      logger.warn('Invalid QR code signature', { eventId: data.eventId });
      return null;
    }
    
    logger.info('QR code validated successfully', { eventId: data.eventId });
    return {
      eventId: data.eventId,
      eventName: data.eventName,
      timestamp: data.timestamp
    };
  } catch (error) {
    logger.error('Error validating QR code', { error: error.message });
    return null;
  }
};

module.exports = {
  generateAttendanceQRCode,
  validateAttendanceQRCode
}; 
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { body, param } = require('express-validator');
const {
  verifyAttendanceWithFace,
  verifyAttendanceWithQRCode,
  registerUserFace,
  generateAttendanceVerificationQR
} = require('../controllers/verificationController');

// Register user face
router.post(
  '/users/:userId/register-face',
  auth,
  [
    param('userId').isMongoId().withMessage('Invalid user ID'),
    body('imageData')
      .isString()
      .notEmpty()
      .withMessage('Image data is required')
  ],
  validate,
  registerUserFace
);

// Verify attendance with face recognition
router.post(
  '/events/:eventId/users/:userId/verify-face',
  auth,
  [
    param('eventId').isMongoId().withMessage('Invalid event ID'),
    param('userId').isMongoId().withMessage('Invalid user ID'),
    body('imageData')
      .isString()
      .notEmpty()
      .withMessage('Image data is required')
  ],
  validate,
  verifyAttendanceWithFace
);

// Verify attendance with QR code
router.post(
  '/events/:eventId/users/:userId/verify-qr',
  auth,
  [
    param('eventId').isMongoId().withMessage('Invalid event ID'),
    param('userId').isMongoId().withMessage('Invalid user ID'),
    body('qrToken')
      .isString()
      .notEmpty()
      .withMessage('QR token is required')
  ],
  validate,
  verifyAttendanceWithQRCode
);

// Generate attendance verification QR code
router.post(
  '/events/:eventId/users/:userId/generate-qr',
  auth,
  [
    param('eventId').isMongoId().withMessage('Invalid event ID'),
    param('userId').isMongoId().withMessage('Invalid user ID')
  ],
  validate,
  generateAttendanceVerificationQR
);

module.exports = router; 
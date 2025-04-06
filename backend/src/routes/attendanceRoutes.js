const express = require('express');
const { body, query } = require('express-validator');
const { validate } = require('../middleware/validator');
const {
  markAttendanceWithQRCode,
  markAttendanceManually,
  getUserAttendance,
  getEventAttendance,
  updateAttendance,
  checkOut
} = require('../controllers/attendanceController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Mark attendance with QR code (students only)
router.post(
  '/qr-code',
  authorize(['student']),
  [
    body('qrCode').notEmpty().withMessage('QR code is required')
  ],
  validate,
  markAttendanceWithQRCode
);

// Mark attendance manually (admin and teachers only)
router.post(
  '/manual',
  authorize(['admin', 'teacher']),
  [
    body('eventId').isUUID().withMessage('Valid event ID is required'),
    body('userId').isUUID().withMessage('Valid user ID is required'),
    body('status').isIn(['present', 'late', 'absent', 'excused']).withMessage('Invalid status'),
    body('notes').optional().isString()
  ],
  validate,
  markAttendanceManually
);

// Get user's attendance records
router.get(
  '/user/:userId',
  [
    query('status').optional().isIn(['present', 'late', 'absent', 'excused']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validate,
  getUserAttendance
);

// Get event's attendance records
router.get(
  '/event/:eventId',
  [
    query('status').optional().isIn(['present', 'late', 'absent', 'excused'])
  ],
  validate,
  getEventAttendance
);

// Update attendance record (admin and teachers only)
router.patch(
  '/:id',
  authorize(['admin', 'teacher']),
  [
    body('status').optional().isIn(['present', 'late', 'absent', 'excused']),
    body('notes').optional().isString()
  ],
  validate,
  updateAttendance
);

// Check out from event
router.post(
  '/:id/checkout',
  [
    body('notes').optional().isString()
  ],
  validate,
  checkOut
);

module.exports = router; 
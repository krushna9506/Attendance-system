const express = require('express');
const { body, query } = require('express-validator');
const { validate } = require('../middleware/validator');
const {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  generateEventQRCode
} = require('../controllers/eventController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Create event (admin and teachers only)
router.post(
  '/',
  authorize(['admin', 'teacher']),
  [
    body('name').notEmpty().withMessage('Event name is required'),
    body('description').optional().isString(),
    body('startTime').isISO8601().withMessage('Valid start time is required'),
    body('endTime').isISO8601().withMessage('Valid end time is required'),
    body('location').notEmpty().withMessage('Location is required')
  ],
  validate,
  createEvent
);

// Get all events (with optional filters)
router.get(
  '/',
  [
    query('status').optional().isIn(['scheduled', 'active', 'completed', 'cancelled']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validate,
  getAllEvents
);

// Get event by ID
router.get('/:id', getEventById);

// Update event (admin and event creator only)
router.patch(
  '/:id',
  [
    body('name').optional().notEmpty().withMessage('Event name cannot be empty'),
    body('description').optional().isString(),
    body('startTime').optional().isISO8601(),
    body('endTime').optional().isISO8601(),
    body('location').optional().notEmpty().withMessage('Location cannot be empty'),
    body('status').optional().isIn(['scheduled', 'active', 'completed', 'cancelled'])
  ],
  validate,
  updateEvent
);

// Delete event (admin and event creator only)
router.delete('/:id', deleteEvent);

// Generate QR code for event (admin and event creator only)
router.post('/:id/qr-code', generateEventQRCode);

module.exports = router; 
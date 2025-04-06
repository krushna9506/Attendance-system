const express = require('express');
const { body, query } = require('express-validator');
const { validate } = require('../middleware/validator');
const {
  trackEngagement,
  getEventEngagementAnalytics,
  getUserEngagementHistory,
  updateEngagementStatus,
  handleActivityPulse,
  generateReport,
  generateChart
} = require('../controllers/engagementController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Track engagement for an event
router.post(
  '/events/:eventId/track',
  [
    body('activityMetrics').isObject().withMessage('Activity metrics are required'),
    body('activityMetrics.interactions').isInt({ min: 0 }).withMessage('Invalid interactions count'),
    body('activityMetrics.responses').isInt({ min: 0 }).withMessage('Invalid responses count'),
    body('activityMetrics.participation').isFloat({ min: 0, max: 100 }).withMessage('Invalid participation percentage')
  ],
  validate,
  trackEngagement
);

// Handle activity pulse from frontend
router.post(
  '/events/:eventId/pulse',
  [
    body('deviceInfo').isObject().withMessage('Device info is required'),
    body('deviceInfo.ip').isIP().withMessage('Valid IP address is required'),
    body('deviceInfo.userAgent').isString().withMessage('User agent is required'),
    body('deviceInfo.location').optional().isString(),
    body('activityMetrics').isObject().withMessage('Activity metrics are required'),
    body('activityMetrics.interactions').isInt({ min: 0 }).withMessage('Invalid interactions count'),
    body('activityMetrics.responses').isInt({ min: 0 }).withMessage('Invalid responses count'),
    body('activityMetrics.participation').isFloat({ min: 0, max: 100 }).withMessage('Invalid participation percentage')
  ],
  validate,
  handleActivityPulse
);

// Get engagement analytics for an event
router.get(
  '/events/:eventId/analytics',
  authorize(['admin', 'teacher']),
  [
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date')
  ],
  validate,
  getEventEngagementAnalytics
);

// Get user's engagement history
router.get(
  '/users/:userId/history',
  [
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date')
  ],
  validate,
  getUserEngagementHistory
);

// Generate engagement report
router.get(
  '/events/:eventId/report',
  authorize(['admin', 'teacher']),
  [
    query('format').optional().isIn(['pdf', 'csv']).withMessage('Invalid report format')
  ],
  validate,
  generateReport
);

// Generate engagement chart
router.get(
  '/events/:eventId/chart',
  authorize(['admin', 'teacher']),
  [
    query('type').optional().isIn(['pie', 'bar']).withMessage('Invalid chart type')
  ],
  validate,
  generateChart
);

// Update engagement status
router.patch(
  '/:id/status',
  [
    body('status').isIn(['active', 'completed', 'disengaged']).withMessage('Invalid status'),
    body('notes').optional().isString().withMessage('Notes must be a string')
  ],
  validate,
  updateEngagementStatus
);

module.exports = router; 
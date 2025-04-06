const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { activityPulseSchema, dateRangeSchema, reportFormatSchema } = require('../validations/activityValidation');

// Activity tracking routes
router.post('/track', authenticate, validate(activityPulseSchema), activityController.trackActivity);

// Engagement statistics routes
router.get('/stats', authenticate, validate(dateRangeSchema), activityController.getEngagementStats);
router.get('/anomalies', authenticate, validate(dateRangeSchema), activityController.getAnomalies);

// Report generation routes
router.get('/report', authenticate, validate({ ...dateRangeSchema, ...reportFormatSchema }), activityController.generateReport);
router.get('/chart/engagement', authenticate, validate(dateRangeSchema), activityController.getEngagementChart);
router.get('/chart/time-distribution', authenticate, validate(dateRangeSchema), activityController.getTimeDistributionChart);

module.exports = router; 
const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const AuthController = require('../controllers/authController');
const ClassController = require('../controllers/classController');
const activityRoutes = require('./activityRoutes');

const router = express.Router();

// Auth routes
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.get('/auth/profile', auth, AuthController.getProfile);
router.put('/auth/profile', auth, AuthController.updateProfile);
router.put('/auth/change-password', auth, AuthController.changePassword);

// Class routes
router.post('/classes', auth, authorize('teacher'), ClassController.createClass);
router.put('/classes/:id', auth, authorize('teacher'), ClassController.updateClass);
router.get('/classes/:id', auth, ClassController.getClass);
router.get('/classes', auth, authorize('teacher'), ClassController.getTeacherClasses);
router.post('/classes/:id/qr-codes', auth, authorize('teacher'), ClassController.generateQRCodes);
router.get('/classes/:id/attendance', auth, authorize('teacher'), ClassController.getClassAttendance);
router.post('/classes/attendance', auth, authorize('student'), ClassController.markAttendance);

// Activity tracking routes
router.use('/activity', activityRoutes);

module.exports = router; 
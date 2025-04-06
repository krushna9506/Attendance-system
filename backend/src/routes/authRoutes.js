const express = require('express');
const { body } = require('express-validator');
const { authLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validator');
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('role').optional().isIn(['admin', 'teacher', 'student']).withMessage('Invalid role')
  ],
  validate,
  register
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  login
);

router.post(
  '/forgot-password',
  authLimiter,
  [
    body('email').isEmail().withMessage('Please provide a valid email')
  ],
  validate,
  forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
  ],
  validate,
  resetPassword
);

// Protected routes
router.get('/profile', auth, getProfile);

router.patch(
  '/profile',
  auth,
  [
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('email').optional().isEmail().withMessage('Please provide a valid email')
  ],
  validate,
  updateProfile
);

router.post(
  '/change-password',
  auth,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
  ],
  validate,
  changePassword
);

module.exports = router; 
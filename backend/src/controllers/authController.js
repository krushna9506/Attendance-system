const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models');
const { APIError } = require('../middleware/errorHandler');
const { sendPasswordResetEmail } = require('../utils/emailService');
const logger = require('../utils/logger');

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return next(new APIError(400, 'Email already in use'));
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: role || 'student'
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    logger.info('User registered successfully', { userId: user.id });
    
    res.status(201).json({
      status: 'success',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return next(new APIError(401, 'Invalid email or password'));
    }

    // Check if user is active
    if (!user.isActive) {
      return next(new APIError(401, 'Account is deactivated'));
    }

    // Check password
    const isPasswordValid = await user.isValidPassword(password);
    if (!isPasswordValid) {
      return next(new APIError(401, 'Invalid email or password'));
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    logger.info('User logged in successfully', { userId: user.id });
    
    res.status(200).json({
      status: 'success',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return res.status(200).json({
        status: 'success',
        message: 'If your email is registered, you will receive a password reset link'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send reset email
    await sendPasswordResetEmail(user, resetToken);

    logger.info('Password reset requested', { userId: user.id });
    
    res.status(200).json({
      status: 'success',
      message: 'If your email is registered, you will receive a password reset link'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    // Find user with valid reset token
    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return next(new APIError(400, 'Invalid or expired reset token'));
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    logger.info('Password reset successful', { userId: user.id });
    
    res.status(200).json({
      status: 'success',
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] }
    });

    if (!user) {
      return next(new APIError(404, 'User not found'));
    }

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, email } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return next(new APIError(404, 'User not found'));
    }

    // Check if email is already in use by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return next(new APIError(400, 'Email already in use'));
      }
    }

    // Update user
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;

    await user.save();

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;
    delete userResponse.resetPasswordToken;
    delete userResponse.resetPasswordExpires;

    logger.info('User profile updated', { userId: user.id });
    
    res.status(200).json({
      status: 'success',
      data: {
        user: userResponse
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return next(new APIError(404, 'User not found'));
    }

    // Check current password
    const isPasswordValid = await user.isValidPassword(currentPassword);
    if (!isPasswordValid) {
      return next(new APIError(401, 'Current password is incorrect'));
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info('Password changed successfully', { userId: user.id });
    
    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword
}; 
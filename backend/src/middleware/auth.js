const jwt = require('jsonwebtoken');
const { APIError } = require('./errorHandler');
const logger = require('../utils/logger');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new APIError(401, 'No token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Add user to request object
    req.user = decoded;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid token attempt', { token: req.headers.authorization });
      next(new APIError(401, 'Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      logger.warn('Expired token attempt', { token: req.headers.authorization });
      next(new APIError(401, 'Token expired'));
    } else {
      next(error);
    }
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.warn('Unauthorized access attempt', {
        user: req.user.id,
        requiredRoles: roles,
        userRole: req.user.role
      });
      return next(new APIError(403, 'You do not have permission to perform this action'));
    }
    next();
  };
};

module.exports = {
  auth,
  authorize
}; 
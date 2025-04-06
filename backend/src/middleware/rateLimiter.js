const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Create a limiter for general API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    res.status(429).json({
      status: 'error',
      message: 'Too many requests from this IP, please try again after 15 minutes'
    });
  }
});

// Create a stricter limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 login attempts per hour
  message: 'Too many login attempts from this IP, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    res.status(429).json({
      status: 'error',
      message: 'Too many login attempts from this IP, please try again after an hour'
    });
  }
});

// Create a limiter for QR code generation
const qrCodeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 QR code generations per minute
  message: {
    status: 'error',
    message: 'Too many QR code generation attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`QR code rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      status: 'error',
      message: 'Too many QR code generation attempts, please try again later'
    });
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  qrCodeLimiter
}; 
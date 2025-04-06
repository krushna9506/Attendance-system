const Joi = require('joi');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');
const { APIError } = require('./errorHandler');

// Validation schemas
const schemas = {
  // Auth schemas
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    role: Joi.string().valid('teacher', 'student').required()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  updateProfile: Joi.object({
    firstName: Joi.string(),
    lastName: Joi.string(),
    email: Joi.string().email()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required()
  }),

  // Class schemas
  createClass: Joi.object({
    name: Joi.string().required(),
    schedule: Joi.string().required(),
    mode: Joi.string().valid('online', 'offline').required(),
    location: Joi.object({
      latitude: Joi.number().required(),
      longitude: Joi.number().required(),
      address: Joi.string().required()
    }).when('mode', {
      is: 'offline',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }),

  updateClass: Joi.object({
    name: Joi.string(),
    schedule: Joi.string(),
    mode: Joi.string().valid('online', 'offline'),
    location: Joi.object({
      latitude: Joi.number(),
      longitude: Joi.number(),
      address: Joi.string()
    }),
    status: Joi.string().valid('scheduled', 'active', 'completed')
  }),

  // Attendance schemas
  markAttendance: Joi.object({
    classId: Joi.string().uuid().required(),
    qrCodeId: Joi.string().uuid().required(),
    faceImageData: Joi.string().base64().required()
  })
};

// Validation middleware factory
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.param,
      message: err.msg
    }));
    
    return next(new APIError(400, 'Validation error', errorMessages));
  }
  next();
};

module.exports = {
  schemas,
  validate
}; 
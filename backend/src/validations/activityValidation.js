const Joi = require('joi');

const activityPulseSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  sessionId: Joi.string().uuid().required(),
  activityType: Joi.string().valid('active', 'idle').required(),
  deviceInfo: Joi.object({
    userAgent: Joi.string().required(),
    platform: Joi.string().required(),
    screenResolution: Joi.string().required(),
    timezone: Joi.string().required()
  }).required(),
  ipAddress: Joi.string().ip().required()
});

const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
});

const reportFormatSchema = Joi.object({
  format: Joi.string().valid('pdf', 'csv').required()
});

module.exports = {
  activityPulseSchema,
  dateRangeSchema,
  reportFormatSchema
}; 
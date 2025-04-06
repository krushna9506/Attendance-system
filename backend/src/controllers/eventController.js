const { Event, User, Attendance } = require('../models');
const { APIError } = require('../middleware/errorHandler');
const { generateAttendanceQRCode } = require('../utils/qrCode');
const { getCurrentDateTime } = require('../utils/dateUtils');
const logger = require('../utils/logger');

/**
 * Create a new event
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const createEvent = async (req, res, next) => {
  try {
    const { name, description, startTime, endTime, location } = req.body;
    
    // Create event
    const event = await Event.create({
      name,
      description,
      startTime,
      endTime,
      location,
      createdBy: req.user.id,
      status: 'scheduled'
    });
    
    logger.info('Event created successfully', { eventId: event.id });
    
    res.status(201).json({
      status: 'success',
      data: {
        event
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getAllEvents = async (req, res, next) => {
  try {
    const { status, startDate, endDate } = req.query;
    
    // Build query
    const where = {};
    if (status) where.status = status;
    if (startDate && endDate) {
      where.startTime = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    // Get events
    const events = await Event.findAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ],
      order: [['startTime', 'DESC']]
    });
    
    res.status(200).json({
      status: 'success',
      results: events.length,
      data: {
        events
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get event by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const event = await Event.findByPk(id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Attendance, as: 'attendances', include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }] }
      ]
    });
    
    if (!event) {
      return next(new APIError(404, 'Event not found'));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        event
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update event
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, startTime, endTime, location, status } = req.body;
    
    // Find event
    const event = await Event.findByPk(id);
    if (!event) {
      return next(new APIError(404, 'Event not found'));
    }
    
    // Check if user has permission to update
    if (event.createdBy !== req.user.id && req.user.role !== 'admin') {
      return next(new APIError(403, 'You do not have permission to update this event'));
    }
    
    // Update event
    if (name) event.name = name;
    if (description) event.description = description;
    if (startTime) event.startTime = startTime;
    if (endTime) event.endTime = endTime;
    if (location) event.location = location;
    if (status) event.status = status;
    
    await event.save();
    
    logger.info('Event updated successfully', { eventId: event.id });
    
    res.status(200).json({
      status: 'success',
      data: {
        event
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete event
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find event
    const event = await Event.findByPk(id);
    if (!event) {
      return next(new APIError(404, 'Event not found'));
    }
    
    // Check if user has permission to delete
    if (event.createdBy !== req.user.id && req.user.role !== 'admin') {
      return next(new APIError(403, 'You do not have permission to delete this event'));
    }
    
    // Delete event
    await event.destroy();
    
    logger.info('Event deleted successfully', { eventId: id });
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate QR code for event
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const generateEventQRCode = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find event
    const event = await Event.findByPk(id);
    if (!event) {
      return next(new APIError(404, 'Event not found'));
    }
    
    // Check if user has permission
    if (event.createdBy !== req.user.id && req.user.role !== 'admin') {
      return next(new APIError(403, 'You do not have permission to generate QR code for this event'));
    }
    
    // Check if event is active
    if (event.status !== 'active') {
      return next(new APIError(400, 'QR code can only be generated for active events'));
    }
    
    // Set expiry time to 1 hour from now
    const expiryTime = new Date(getCurrentDateTime().getTime() + 60 * 60 * 1000);
    
    // Generate QR code
    const qrCodeData = {
      eventId: event.id,
      eventName: event.name,
      expiryTime: expiryTime.toISOString()
    };
    
    const qrCode = await generateAttendanceQRCode(qrCodeData);
    
    // Update event with QR code
    event.qrCode = qrCode;
    event.qrCodeExpiry = expiryTime;
    await event.save();
    
    logger.info('QR code generated successfully', { eventId: event.id });
    
    res.status(200).json({
      status: 'success',
      data: {
        qrCode,
        expiryTime
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  generateEventQRCode
}; 
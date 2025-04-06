const { Op } = require('sequelize');
const { Event, User, Attendance } = require('../models');
const { APIError } = require('../middleware/errorHandler');
const { validateAttendanceQRCode } = require('../utils/qrCode');
const { getCurrentDateTime, isDateInRange } = require('../utils/dateUtils');
const { sendAttendanceConfirmationEmail } = require('../utils/emailService');
const logger = require('../utils/logger');

/**
 * Mark attendance using QR code
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const markAttendanceWithQRCode = async (req, res, next) => {
  try {
    const { qrCodeData } = req.body;
    
    // Validate QR code
    const validatedData = validateAttendanceQRCode(qrCodeData);
    if (!validatedData) {
      return next(new APIError(400, 'Invalid or expired QR code'));
    }
    
    const { eventId, eventName } = validatedData;
    
    // Find event
    const event = await Event.findByPk(eventId);
    if (!event) {
      return next(new APIError(404, 'Event not found'));
    }
    
    // Check if event is active
    if (event.status !== 'active') {
      return next(new APIError(400, 'Event is not active'));
    }
    
    // Check if user already marked attendance
    const existingAttendance = await Attendance.findOne({
      where: {
        userId: req.user.id,
        eventId
      }
    });
    
    if (existingAttendance) {
      return next(new APIError(400, 'Attendance already marked for this event'));
    }
    
    // Create attendance record
    const attendance = await Attendance.create({
      userId: req.user.id,
      eventId,
      checkInTime: getCurrentDateTime(),
      status: 'present',
      verificationMethod: 'qr_code'
    });
    
    // Send confirmation email
    try {
      await sendAttendanceConfirmationEmail(req.user, event);
    } catch (emailError) {
      logger.error('Failed to send attendance confirmation email', { 
        error: emailError.message,
        userId: req.user.id,
        eventId
      });
    }
    
    logger.info('Attendance marked successfully with QR code', { 
      userId: req.user.id,
      eventId
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        attendance
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark attendance manually (for admins/teachers)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const markAttendanceManually = async (req, res, next) => {
  try {
    const { userId, eventId, status, notes } = req.body;
    
    // Find event
    const event = await Event.findByPk(eventId);
    if (!event) {
      return next(new APIError(404, 'Event not found'));
    }
    
    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      return next(new APIError(404, 'User not found'));
    }
    
    // Check if user already marked attendance
    const existingAttendance = await Attendance.findOne({
      where: {
        userId,
        eventId
      }
    });
    
    if (existingAttendance) {
      return next(new APIError(400, 'Attendance already marked for this user and event'));
    }
    
    // Create attendance record
    const attendance = await Attendance.create({
      userId,
      eventId,
      checkInTime: getCurrentDateTime(),
      status: status || 'present',
      verificationMethod: 'manual',
      notes,
      verifiedBy: req.user.id
    });
    
    logger.info('Attendance marked manually', { 
      userId,
      eventId,
      markedBy: req.user.id
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        attendance
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get attendance records for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getUserAttendance = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, status } = req.query;
    
    // Check if user has permission
    if (req.user.id !== userId && req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return next(new APIError(403, 'You do not have permission to view this user\'s attendance'));
    }
    
    // Build query
    const where = { userId };
    if (status) where.status = status;
    if (startDate && endDate) {
      where.checkInTime = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    // Get attendance records
    const attendances = await Attendance.findAll({
      where,
      include: [
        { model: Event, as: 'event', attributes: ['id', 'name', 'startTime', 'endTime', 'location'] }
      ],
      order: [['checkInTime', 'DESC']]
    });
    
    res.status(200).json({
      status: 'success',
      results: attendances.length,
      data: {
        attendances
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get attendance records for an event
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getEventAttendance = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { status } = req.query;
    
    // Find event
    const event = await Event.findByPk(eventId);
    if (!event) {
      return next(new APIError(404, 'Event not found'));
    }
    
    // Check if user has permission
    if (event.createdBy !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return next(new APIError(403, 'You do not have permission to view attendance for this event'));
    }
    
    // Build query
    const where = { eventId };
    if (status) where.status = status;
    
    // Get attendance records
    const attendances = await Attendance.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ],
      order: [['checkInTime', 'ASC']]
    });
    
    res.status(200).json({
      status: 'success',
      results: attendances.length,
      data: {
        attendances
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update attendance record
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const updateAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    // Find attendance record
    const attendance = await Attendance.findByPk(id, {
      include: [{ model: Event, as: 'event' }]
    });
    
    if (!attendance) {
      return next(new APIError(404, 'Attendance record not found'));
    }
    
    // Check if user has permission
    if (attendance.event.createdBy !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return next(new APIError(403, 'You do not have permission to update this attendance record'));
    }
    
    // Update attendance
    if (status) attendance.status = status;
    if (notes) attendance.notes = notes;
    
    await attendance.save();
    
    logger.info('Attendance record updated', { 
      attendanceId: id,
      updatedBy: req.user.id
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        attendance
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check out from an event
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const checkOut = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    
    // Find attendance record
    const attendance = await Attendance.findOne({
      where: {
        userId: req.user.id,
        eventId,
        checkOutTime: null
      },
      include: [{ model: Event, as: 'event' }]
    });
    
    if (!attendance) {
      return next(new APIError(404, 'No active attendance record found for this event'));
    }
    
    // Check if event is still active
    if (attendance.event.status !== 'active') {
      return next(new APIError(400, 'Event is no longer active'));
    }
    
    // Update check out time
    attendance.checkOutTime = getCurrentDateTime();
    await attendance.save();
    
    logger.info('User checked out from event', { 
      userId: req.user.id,
      eventId
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        attendance
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  markAttendanceWithQRCode,
  markAttendanceManually,
  getUserAttendance,
  getEventAttendance,
  updateAttendance,
  checkOut
}; 
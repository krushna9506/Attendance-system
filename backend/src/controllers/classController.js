const { Class, User, Attendance } = require('../models');
const QRCodeService = require('../services/qrCodeService');
const AttendanceService = require('../services/attendanceService');
const logger = require('../utils/logger');

class ClassController {
  static async createClass(req, res) {
    try {
      const { name, schedule, mode, location } = req.body;
      const teacherId = req.user.id;

      const classData = await Class.create({
        name,
        teacherId,
        schedule,
        mode,
        location,
        status: 'scheduled'
      });

      res.status(201).json({
        status: 'success',
        data: { class: classData }
      });
    } catch (error) {
      logger.error('Error creating class:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error creating class'
      });
    }
  }

  static async updateClass(req, res) {
    try {
      const { id } = req.params;
      const { name, schedule, mode, location, status } = req.body;

      const classData = await Class.findOne({
        where: { id, teacherId: req.user.id }
      });

      if (!classData) {
        return res.status(404).json({
          status: 'error',
          message: 'Class not found'
        });
      }

      await classData.update({
        name: name || classData.name,
        schedule: schedule || classData.schedule,
        mode: mode || classData.mode,
        location: location || classData.location,
        status: status || classData.status
      });

      res.json({
        status: 'success',
        data: { class: classData }
      });
    } catch (error) {
      logger.error('Error updating class:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error updating class'
      });
    }
  }

  static async getClass(req, res) {
    try {
      const { id } = req.params;
      const classData = await Class.findByPk(id, {
        include: [
          {
            model: User,
            as: 'teacher',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      if (!classData) {
        return res.status(404).json({
          status: 'error',
          message: 'Class not found'
        });
      }

      res.json({
        status: 'success',
        data: { class: classData }
      });
    } catch (error) {
      logger.error('Error getting class:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error getting class'
      });
    }
  }

  static async getTeacherClasses(req, res) {
    try {
      const classes = await Class.findAll({
        where: { teacherId: req.user.id },
        order: [['createdAt', 'DESC']]
      });

      res.json({
        status: 'success',
        data: { classes }
      });
    } catch (error) {
      logger.error('Error getting teacher classes:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error getting classes'
      });
    }
  }

  static async generateQRCodes(req, res) {
    try {
      const { id } = req.params;
      const classData = await Class.findOne({
        where: { id, teacherId: req.user.id }
      });

      if (!classData) {
        return res.status(404).json({
          status: 'error',
          message: 'Class not found'
        });
      }

      const qrCodes = await QRCodeService.generateClassQRCodes(id);

      res.json({
        status: 'success',
        data: { qrCodes }
      });
    } catch (error) {
      logger.error('Error generating QR codes:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error generating QR codes'
      });
    }
  }

  static async getClassAttendance(req, res) {
    try {
      const { id } = req.params;
      const classData = await Class.findOne({
        where: { id, teacherId: req.user.id }
      });

      if (!classData) {
        return res.status(404).json({
          status: 'error',
          message: 'Class not found'
        });
      }

      const attendance = await AttendanceService.getClassAttendance(id);
      const stats = await AttendanceService.getAttendanceStats(id);

      res.json({
        status: 'success',
        data: { attendance, stats }
      });
    } catch (error) {
      logger.error('Error getting class attendance:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error getting attendance'
      });
    }
  }

  static async markAttendance(req, res) {
    try {
      const { classId, qrCodeId, faceImageData } = req.body;
      const studentId = req.user.id;
      const ipAddress = req.ip;

      const attendance = await AttendanceService.markAttendance(
        studentId,
        classId,
        qrCodeId,
        faceImageData,
        ipAddress
      );

      res.json({
        status: 'success',
        data: { attendance }
      });
    } catch (error) {
      logger.error('Error marking attendance:', error);
      res.status(500).json({
        status: 'error',
        message: error.message || 'Error marking attendance'
      });
    }
  }
}

module.exports = ClassController; 
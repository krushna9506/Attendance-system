const { Attendance, Class, User } = require('../models');
const QRCodeService = require('./qrCodeService');
const FaceRecognitionService = require('./faceRecognitionService');
const LocationService = require('./locationService');
const logger = require('../utils/logger');

class AttendanceService {
  static async markAttendance(studentId, classId, qrCodeId, faceImageData, ipAddress) {
    try {
      // Verify QR code
      const qrCode = await QRCodeService.verifyQRCode(qrCodeId, studentId);
      
      // Get class details
      const classData = await Class.findByPk(classId);
      if (!classData) {
        throw new Error('Class not found');
      }

      // Verify face recognition
      const faceVerification = await FaceRecognitionService.verifyFace(studentId, faceImageData);
      if (!faceVerification.isMatch) {
        throw new Error('Face verification failed');
      }

      // Verify location for offline classes
      let locationVerification = null;
      if (classData.mode === 'offline') {
        const classLocation = await LocationService.validateClassLocation(classId);
        locationVerification = await LocationService.verifyLocation(ipAddress, classLocation);
        
        if (!locationVerification.isWithinRange) {
          throw new Error('Location verification failed');
        }
      }

      // Create attendance record
      const attendance = await Attendance.create({
        studentId,
        classId,
        qrCodeId,
        status: 'present',
        verificationMethod: classData.mode === 'offline' ? 'both' : 'qr',
        faceVerificationData: faceVerification,
        ipAddress,
        location: locationVerification,
        timestamp: new Date()
      });

      // Deactivate used QR code
      await QRCodeService.deactivateQRCode(qrCodeId);

      return attendance;
    } catch (error) {
      logger.error('Error marking attendance:', error);
      throw error;
    }
  }

  static async getStudentAttendance(studentId, filters = {}) {
    try {
      const where = { studentId };
      
      if (filters.classId) {
        where.classId = filters.classId;
      }
      
      if (filters.startDate && filters.endDate) {
        where.timestamp = {
          [Op.between]: [filters.startDate, filters.endDate]
        };
      }

      const attendance = await Attendance.findAll({
        where,
        include: [
          {
            model: Class,
            attributes: ['name', 'mode']
          }
        ],
        order: [['timestamp', 'DESC']]
      });

      return attendance;
    } catch (error) {
      logger.error('Error getting student attendance:', error);
      throw error;
    }
  }

  static async getClassAttendance(classId) {
    try {
      const attendance = await Attendance.findAll({
        where: { classId },
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ],
        order: [['timestamp', 'ASC']]
      });

      return attendance;
    } catch (error) {
      logger.error('Error getting class attendance:', error);
      throw error;
    }
  }

  static async getAttendanceStats(classId) {
    try {
      const stats = await Attendance.findAll({
        where: { classId },
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status']
      });

      return stats;
    } catch (error) {
      logger.error('Error getting attendance stats:', error);
      throw error;
    }
  }
}

module.exports = AttendanceService; 
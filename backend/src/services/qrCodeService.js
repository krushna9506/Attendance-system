const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { QRCode: QRCodeModel, Class } = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const { Attendance } = require('../models');

class QRCodeService {
  static async generateQRCode(classId, sequence) {
    try {
      const classData = await Class.findByPk(classId);
      if (!classData) {
        throw new Error('Class not found');
      }

      // Deactivate previous QR code
      await QRCodeModel.update(
        { isActive: false },
        { 
          where: { 
            classId,
            isActive: true
          }
        }
      );

      const uniqueId = uuidv4();
      const qrData = {
        classId,
        sequence,
        timestamp: Date.now(),
        uniqueId
      };

      const qrCodeString = await QRCode.toDataURL(JSON.stringify(qrData));
      
      const qrCode = await QRCodeModel.create({
        classId,
        code: qrCodeString,
        sequence,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 5000), // 5 seconds validity
        isActive: true,
        metadata: {
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 5000)
        }
      });

      return qrCode;
    } catch (error) {
      logger.error('Error generating QR code:', error);
      throw error;
    }
  }

  static async getCurrentQRCode(classId) {
    try {
      const qrCode = await QRCodeModel.findOne({
        where: {
          classId,
          isActive: true,
          validUntil: {
            [Op.gt]: new Date()
          }
        },
        order: [['createdAt', 'DESC']]
      });

      return qrCode;
    } catch (error) {
      logger.error('Error getting current QR code:', error);
      throw error;
    }
  }

  static async generateClassQRCodes(classId) {
    try {
      const classData = await Class.findByPk(classId);
      if (!classData) {
        throw new Error('Class not found');
      }

      const qrCodes = [];
      const numberOfCodes = classData.mode === 'online' ? 3 : 1;
      const interval = classData.mode === 'online' 
        ? classData.qrCodeInterval 
        : 10 * 60 * 1000; // 10 minutes for offline mode

      for (let i = 0; i < numberOfCodes; i++) {
        const qrCode = await this.generateQRCode(classId, i + 1);
        qrCodes.push(qrCode);

        // Schedule next QR code generation
        if (i < numberOfCodes - 1) {
          setTimeout(() => {
            this.generateQRCode(classId, i + 2);
          }, interval);
        }
      }

      return qrCodes;
    } catch (error) {
      logger.error('Error generating class QR codes:', error);
      throw error;
    }
  }

  static async verifyQRCode(qrCodeId, studentId) {
    try {
      const qrCode = await QRCodeModel.findOne({
        where: {
          id: qrCodeId,
          isActive: true,
          validUntil: {
            [Op.gt]: new Date()
          }
        }
      });

      if (!qrCode) {
        throw new Error('Invalid or expired QR code');
      }

      // Check if student has already used this QR code
      const existingAttendance = await Attendance.findOne({
        where: {
          qrCodeId,
          studentId
        }
      });

      if (existingAttendance) {
        throw new Error('QR code already used');
      }

      return qrCode;
    } catch (error) {
      logger.error('Error verifying QR code:', error);
      throw error;
    }
  }

  static async deactivateQRCode(qrCodeId) {
    try {
      await QRCodeModel.update(
        { isActive: false },
        { where: { id: qrCodeId } }
      );
    } catch (error) {
      logger.error('Error deactivating QR code:', error);
      throw error;
    }
  }
}

module.exports = QRCodeService; 
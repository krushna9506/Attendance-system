const QRCodeService = require('./qrCodeService');
const logger = require('../utils/logger');

class SocketService {
  constructor(io) {
    this.io = io;
    this.activeClasses = new Map(); // Map to store active class QR code intervals
  }

  initialize() {
    this.io.on('connection', (socket) => {
      logger.info('New client connected:', socket.id);

      socket.on('joinClass', async (classId) => {
        try {
          socket.join(`class:${classId}`);
          logger.info(`Client ${socket.id} joined class ${classId}`);

          // If this is the first client joining the class, start QR code generation
          if (!this.activeClasses.has(classId)) {
            await this.startQRCodeGeneration(classId);
          }

          // Send current QR code to the newly joined client
          const currentQRCode = await QRCodeService.getCurrentQRCode(classId);
          if (currentQRCode) {
            socket.emit('qrCodeUpdate', {
              classId,
              qrCode: currentQRCode
            });
          }
        } catch (error) {
          logger.error('Error in joinClass:', error);
          socket.emit('error', { message: 'Error joining class' });
        }
      });

      socket.on('leaveClass', (classId) => {
        socket.leave(`class:${classId}`);
        logger.info(`Client ${socket.id} left class ${classId}`);

        // If no clients are in the class, stop QR code generation
        const room = this.io.sockets.adapter.rooms.get(`class:${classId}`);
        if (!room || room.size === 0) {
          this.stopQRCodeGeneration(classId);
        }
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected:', socket.id);
      });
    });
  }

  async startQRCodeGeneration(classId) {
    try {
      // Generate initial QR code
      const qrCode = await QRCodeService.generateQRCode(classId, 1);
      this.broadcastQRCode(classId, qrCode);

      // Set up interval for QR code refresh
      const interval = setInterval(async () => {
        try {
          const newQRCode = await QRCodeService.generateQRCode(classId);
          this.broadcastQRCode(classId, newQRCode);
        } catch (error) {
          logger.error('Error generating QR code:', error);
        }
      }, 3000); // Refresh every 3 seconds

      this.activeClasses.set(classId, interval);
      logger.info(`Started QR code generation for class ${classId}`);
    } catch (error) {
      logger.error('Error starting QR code generation:', error);
      throw error;
    }
  }

  stopQRCodeGeneration(classId) {
    const interval = this.activeClasses.get(classId);
    if (interval) {
      clearInterval(interval);
      this.activeClasses.delete(classId);
      logger.info(`Stopped QR code generation for class ${classId}`);
    }
  }

  broadcastQRCode(classId, qrCode) {
    this.io.to(`class:${classId}`).emit('qrCodeUpdate', {
      classId,
      qrCode
    });
  }
}

module.exports = SocketService; 
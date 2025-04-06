const cv = require('opencv4nodejs');
const { User } = require('../models');
const logger = require('../utils/logger');

class FaceRecognitionService {
  static async initializeFaceDetector() {
    try {
      const faceDetector = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_DEFAULT);
      const faceRecognizer = new cv.LBPHFaceRecognizer();
      return { faceDetector, faceRecognizer };
    } catch (error) {
      logger.error('Error initializing face detector:', error);
      throw error;
    }
  }

  static async detectFace(imageData) {
    try {
      const { faceDetector } = await this.initializeFaceDetector();
      const image = cv.imdecode(Buffer.from(imageData, 'base64'));
      const grayImage = image.cvtColor(cv.COLOR_BGR2GRAY);
      const faces = faceDetector.detectMultiScale(grayImage);

      if (faces.length === 0) {
        throw new Error('No face detected');
      }

      if (faces.length > 1) {
        throw new Error('Multiple faces detected');
      }

      return faces[0];
    } catch (error) {
      logger.error('Error detecting face:', error);
      throw error;
    }
  }

  static async verifyFace(studentId, imageData) {
    try {
      const student = await User.findOne({
        where: { id: studentId, role: 'student' }
      });

      if (!student || !student.faceData) {
        throw new Error('Student face data not found');
      }

      const { faceRecognizer } = await this.initializeFaceDetector();
      const face = await this.detectFace(imageData);
      
      // Compare with stored face data
      const storedFaceData = JSON.parse(student.faceData);
      const confidence = this.calculateFaceSimilarity(face, storedFaceData);

      const threshold = process.env.FACE_RECOGNITION_CONFIDENCE_THRESHOLD || 0.6;
      const isMatch = confidence >= threshold;

      return {
        isMatch,
        confidence,
        threshold
      };
    } catch (error) {
      logger.error('Error verifying face:', error);
      throw error;
    }
  }

  static async registerFace(studentId, imageData) {
    try {
      const face = await this.detectFace(imageData);
      const faceData = JSON.stringify(face);

      await User.update(
        { faceData },
        { where: { id: studentId } }
      );

      return true;
    } catch (error) {
      logger.error('Error registering face:', error);
      throw error;
    }
  }

  static calculateFaceSimilarity(face1, face2) {
    // Implement face similarity calculation using appropriate metrics
    // This is a simplified version - you should use a more robust method
    const distance = Math.sqrt(
      Math.pow(face1.x - face2.x, 2) +
      Math.pow(face1.y - face2.y, 2) +
      Math.pow(face1.width - face2.width, 2) +
      Math.pow(face1.height - face2.height, 2)
    );

    const maxDistance = Math.sqrt(
      Math.pow(face1.width, 2) +
      Math.pow(face1.height, 2)
    );

    return 1 - (distance / maxDistance);
  }
}

module.exports = FaceRecognitionService; 
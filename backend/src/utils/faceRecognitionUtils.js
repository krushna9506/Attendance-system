const faceapi = require('face-api.js');
const canvas = require('canvas');
const { Canvas, Image, ImageData } = canvas;
const { APIError } = require('./errorUtils');
const logger = require('./logger');

// Initialize face-api with canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Load face detection models
const loadModels = async () => {
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromDisk('models'),
      faceapi.nets.faceLandmark68Net.loadFromDisk('models'),
      faceapi.nets.faceRecognitionNet.loadFromDisk('models'),
      faceapi.nets.faceExpressionNet.loadFromDisk('models')
    ]);
    logger.info('Face recognition models loaded successfully');
  } catch (error) {
    logger.error('Error loading face recognition models:', error);
    throw new APIError(500, 'Error initializing face recognition');
  }
};

// Detect faces in an image
const detectFaces = async (imageBuffer) => {
  try {
    const img = await canvas.loadImage(imageBuffer);
    const detections = await faceapi.detectAllFaces(img)
      .withFaceLandmarks()
      .withFaceExpressions();
    
    return detections.map(detection => ({
      confidence: detection.detection.score,
      landmarks: detection.landmarks,
      expressions: detection.expressions
    }));
  } catch (error) {
    logger.error('Error detecting faces:', error);
    throw new APIError(500, 'Error detecting faces');
  }
};

// Compare two face images
const compareFaces = async (image1Buffer, image2Buffer) => {
  try {
    const img1 = await canvas.loadImage(image1Buffer);
    const img2 = await canvas.loadImage(image2Buffer);
    
    const detection1 = await faceapi.detectSingleFace(img1)
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    const detection2 = await faceapi.detectSingleFace(img2)
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    if (!detection1 || !detection2) {
      throw new APIError(400, 'No face detected in one or both images');
    }
    
    const distance = faceapi.euclideanDistance(
      detection1.descriptor,
      detection2.descriptor
    );
    
    // Convert distance to similarity score (0-1)
    const similarity = 1 - distance;
    
    return {
      similarity,
      isMatch: similarity > 0.6 // Threshold for face matching
    };
  } catch (error) {
    logger.error('Error comparing faces:', error);
    throw new APIError(500, 'Error comparing faces');
  }
};

// Extract face features
const extractFaceFeatures = async (imageBuffer) => {
  try {
    const img = await canvas.loadImage(imageBuffer);
    const detection = await faceapi.detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    if (!detection) {
      throw new APIError(400, 'No face detected in image');
    }
    
    return {
      descriptor: detection.descriptor,
      landmarks: detection.landmarks,
      expressions: detection.expressions
    };
  } catch (error) {
    logger.error('Error extracting face features:', error);
    throw new APIError(500, 'Error extracting face features');
  }
};

// Verify face against stored descriptor
const verifyFace = async (imageBuffer, storedDescriptor) => {
  try {
    const features = await extractFaceFeatures(imageBuffer);
    const distance = faceapi.euclideanDistance(
      features.descriptor,
      storedDescriptor
    );
    
    const similarity = 1 - distance;
    return {
      similarity,
      isVerified: similarity > 0.6
    };
  } catch (error) {
    logger.error('Error verifying face:', error);
    throw new APIError(500, 'Error verifying face');
  }
};

module.exports = {
  loadModels,
  detectFaces,
  compareFaces,
  extractFaceFeatures,
  verifyFace
}; 
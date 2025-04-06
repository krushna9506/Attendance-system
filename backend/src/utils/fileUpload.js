const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { APIError } = require('../middleware/errorHandler');
const logger = require('./logger');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Allow only images and PDFs
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new APIError(400, 'Invalid file type. Only JPEG, PNG, GIF and PDF files are allowed.'), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

// Middleware to handle file upload errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      logger.warn('File size limit exceeded', { 
        ip: req.ip,
        file: req.file 
      });
      return next(new APIError(400, 'File size too large. Maximum size is 5MB.'));
    }
    logger.error('Multer error', { error: err });
    return next(new APIError(400, 'File upload error'));
  }
  next(err);
};

module.exports = {
  upload,
  handleUploadError
}; 
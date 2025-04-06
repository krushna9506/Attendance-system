require('dotenv').config();

module.exports = {
  // Server configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'attendance_system',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  // Email configuration
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    from: process.env.EMAIL_FROM || 'noreply@attendance-system.com'
  },

  // File upload configuration
  upload: {
    maxSize: process.env.UPLOAD_MAX_SIZE || 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
    uploadDir: process.env.UPLOAD_DIR || 'uploads'
  },

  // QR Code configuration
  qrCode: {
    expiryMinutes: process.env.QR_CODE_EXPIRY_MINUTES || 30
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX || 100 // limit each IP to 100 requests per windowMs
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log'
  }
}; 
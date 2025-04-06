const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');
const { sequelize } = require('./models');
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const engagementRoutes = require('./routes/engagementRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const { loadModels } = require('./utils/faceRecognitionUtils');

const app = express();

// Load face recognition models
loadModels().catch(error => {
  console.error('Error loading face recognition models:', error);
});

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('dev')); // HTTP request logging

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/engagement', engagementRoutes);
app.use('/api/verification', verificationRoutes);

// Error handling
app.use(errorHandler);

// Database connection and server startup
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');
    
    // Sync database models
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    logger.info('Database models synchronized successfully.');

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger.info('Connected to MongoDB');

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Unable to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app; 
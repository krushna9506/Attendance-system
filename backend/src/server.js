require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const compression = require('compression');
const { sequelize } = require('./models');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const corsOptions = require('./config/cors');
const swagger = require('./middleware/swagger');
const SocketService = require('./services/socketService');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: corsOptions
});

// Initialize Socket.IO service
const socketService = new SocketService(io);
socketService.initialize();

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API documentation
app.use('/api-docs', swagger.serve, swagger.setup);

// Rate limiting
app.use('/api', apiLimiter);

// Routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// Database connection and server start
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');
    
    // Sync database models
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    logger.info('Database models synchronized.');

    server.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`API documentation available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Promise Rejection:', error);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed. Process terminated.');
    process.exit(0);
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('New client connected');

  socket.on('join-class', (classId) => {
    socket.join(`class-${classId}`);
    logger.info(`Client joined class: ${classId}`);
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected');
  });
}); 
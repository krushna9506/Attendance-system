const Redis = require('ioredis');
const { logger } = require('./logger');
const config = require('../config/config');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

// Session tracking
const SESSION_PREFIX = 'session:';
const DEVICE_PREFIX = 'device:';
const ALERT_PREFIX = 'alert:';

const storeSession = async (userId, sessionData) => {
  const key = `${SESSION_PREFIX}${userId}`;
  await redis.hmset(key, {
    ...sessionData,
    lastUpdated: Date.now()
  });
  await redis.expire(key, 24 * 60 * 60); // 24 hours
};

const getSession = async (userId) => {
  const key = `${SESSION_PREFIX}${userId}`;
  return await redis.hgetall(key);
};

const trackDevice = async (userId, deviceInfo) => {
  const key = `${DEVICE_PREFIX}${userId}`;
  const deviceHistory = await redis.lrange(key, 0, -1);
  
  // Add new device info
  await redis.lpush(key, JSON.stringify({
    ...deviceInfo,
    timestamp: Date.now()
  }));
  
  // Keep only last 10 devices
  await redis.ltrim(key, 0, 9);
  
  return deviceHistory.map(device => JSON.parse(device));
};

const checkDeviceAnomaly = async (userId, currentDevice) => {
  const deviceHistory = await trackDevice(userId, currentDevice);
  
  if (deviceHistory.length < 2) return false;
  
  // Check for suspicious patterns
  const recentDevices = deviceHistory.slice(0, 3);
  const locations = new Set(recentDevices.map(d => d.location));
  
  // Alert if multiple locations in short time
  if (locations.size > 1) {
    await createAlert(userId, 'suspicious_location', {
      message: 'Multiple locations detected in short time',
      devices: recentDevices
    });
    return true;
  }
  
  return false;
};

const createAlert = async (userId, type, data) => {
  const key = `${ALERT_PREFIX}${userId}`;
  const alert = {
    type,
    data,
    timestamp: Date.now()
  };
  
  await redis.lpush(key, JSON.stringify(alert));
  await redis.ltrim(key, 0, 99); // Keep last 100 alerts
  await redis.expire(key, 7 * 24 * 60 * 60); // 7 days
  
  return alert;
};

const getAlerts = async (userId) => {
  const key = `${ALERT_PREFIX}${userId}`;
  const alerts = await redis.lrange(key, 0, -1);
  return alerts.map(alert => JSON.parse(alert));
};

// Cache management
const cacheData = async (key, data, ttl = 3600) => {
  await redis.setex(key, ttl, JSON.stringify(data));
};

const getCachedData = async (key) => {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};

const invalidateCache = async (pattern) => {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(keys);
  }
};

module.exports = {
  redis,
  storeSession,
  getSession,
  trackDevice,
  checkDeviceAnomaly,
  createAlert,
  getAlerts,
  cacheData,
  getCachedData,
  invalidateCache
}; 
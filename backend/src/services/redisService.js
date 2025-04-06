const Redis = require('ioredis');
const logger = require('../utils/logger');

class RedisService {
  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    this.client.on('error', (err) => logger.error('Redis Client Error:', err));
    this.client.on('connect', () => logger.info('Redis Client Connected'));
  }

  async storeActivityPulse(userId, sessionId, data) {
    try {
      const key = `activity:${userId}:${sessionId}`;
      const timestamp = Date.now();
      
      // Store activity data with timestamp
      await this.client.hset(key, timestamp.toString(), JSON.stringify({
        ...data,
        timestamp,
        type: 'pulse'
      }));

      // Set expiry for activity data (7 days)
      await this.client.expire(key, 7 * 24 * 60 * 60);

      // Update session data
      await this.updateSessionData(userId, sessionId, data);
    } catch (error) {
      logger.error('Error storing activity pulse:', error);
      throw error;
    }
  }

  async updateSessionData(userId, sessionId, data) {
    try {
      const sessionKey = `session:${userId}:${sessionId}`;
      const currentData = await this.client.get(sessionKey);
      const parsedData = currentData ? JSON.parse(currentData) : {
        startTime: Date.now(),
        pulseCount: 0,
        activeTime: 0,
        idleTime: 0,
        ipHistory: [],
        deviceHistory: []
      };

      // Update session statistics
      parsedData.pulseCount += 1;
      parsedData.activeTime += data.isActive ? 120 : 0; // 2 minutes in seconds
      parsedData.idleTime += data.isActive ? 0 : 120;

      // Track IP and device history
      if (!parsedData.ipHistory.includes(data.ip)) {
        parsedData.ipHistory.push(data.ip);
      }
      if (!parsedData.deviceHistory.includes(data.deviceId)) {
        parsedData.deviceHistory.push(data.deviceId);
      }

      // Calculate engagement score
      const totalTime = parsedData.activeTime + parsedData.idleTime;
      parsedData.engagementScore = totalTime > 0 
        ? (parsedData.activeTime / totalTime) * 100 
        : 100;

      // Store updated session data
      await this.client.set(sessionKey, JSON.stringify(parsedData));
      await this.client.expire(sessionKey, 7 * 24 * 60 * 60);

      // Check for anomalies and low engagement
      await this.checkAnomalies(userId, sessionId, parsedData);
    } catch (error) {
      logger.error('Error updating session data:', error);
      throw error;
    }
  }

  async checkAnomalies(userId, sessionId, sessionData) {
    try {
      const anomalyKey = `anomaly:${userId}:${sessionId}`;
      const anomalies = [];

      // Check engagement score
      if (sessionData.engagementScore < 70) {
        anomalies.push({
          type: 'low_engagement',
          score: sessionData.engagementScore,
          timestamp: Date.now()
        });
      }

      // Check multiple IPs
      if (sessionData.ipHistory.length > 1) {
        anomalies.push({
          type: 'multiple_ips',
          ips: sessionData.ipHistory,
          timestamp: Date.now()
        });
      }

      // Check multiple devices
      if (sessionData.deviceHistory.length > 1) {
        anomalies.push({
          type: 'multiple_devices',
          devices: sessionData.deviceHistory,
          timestamp: Date.now()
        });
      }

      if (anomalies.length > 0) {
        await this.client.rpush(anomalyKey, ...anomalies.map(a => JSON.stringify(a)));
        await this.client.expire(anomalyKey, 7 * 24 * 60 * 60);
      }
    } catch (error) {
      logger.error('Error checking anomalies:', error);
      throw error;
    }
  }

  async getSessionData(userId, sessionId) {
    try {
      const sessionKey = `session:${userId}:${sessionId}`;
      const data = await this.client.get(sessionKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Error getting session data:', error);
      throw error;
    }
  }

  async getAnomalies(userId, sessionId) {
    try {
      const anomalyKey = `anomaly:${userId}:${sessionId}`;
      const anomalies = await this.client.lrange(anomalyKey, 0, -1);
      return anomalies.map(a => JSON.parse(a));
    } catch (error) {
      logger.error('Error getting anomalies:', error);
      throw error;
    }
  }

  async getEngagementStats(userId, timeRange) {
    try {
      const pattern = `session:${userId}:*`;
      const keys = await this.client.keys(pattern);
      const stats = {
        totalSessions: keys.length,
        averageEngagement: 0,
        lowEngagementCount: 0,
        anomalyCount: 0,
        sessionData: []
      };

      for (const key of keys) {
        const data = JSON.parse(await this.client.get(key));
        if (data.startTime >= timeRange.start && data.startTime <= timeRange.end) {
          stats.sessionData.push(data);
          stats.averageEngagement += data.engagementScore;
          if (data.engagementScore < 70) stats.lowEngagementCount++;
        }
      }

      if (stats.sessionData.length > 0) {
        stats.averageEngagement /= stats.sessionData.length;
      }

      return stats;
    } catch (error) {
      logger.error('Error getting engagement stats:', error);
      throw error;
    }
  }
}

module.exports = new RedisService(); 
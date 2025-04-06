const { redis, storeSession, checkDeviceAnomaly, createAlert } = require('./redisUtils');
const { logger } = require('./logger');

const ACTIVITY_THRESHOLD = 70; // 70% engagement threshold
const PULSE_INTERVAL = 120000; // 2 minutes in milliseconds

/**
 * Process activity pulse from frontend
 * @param {Object} pulseData - Activity data from frontend
 * @returns {Object} - Processed engagement data
 */
const processActivityPulse = async (pulseData) => {
  const {
    userId,
    eventId,
    deviceInfo,
    activityMetrics,
    timestamp = Date.now()
  } = pulseData;

  // Check for device anomalies
  const isAnomaly = await checkDeviceAnomaly(userId, deviceInfo);
  if (isAnomaly) {
    logger.warn(`Suspicious activity detected for user ${userId}`);
  }

  // Calculate real-time engagement score
  const engagementScore = calculateEngagementScore(activityMetrics);

  // Store session data
  await storeSession(userId, {
    eventId,
    deviceInfo,
    activityMetrics,
    engagementScore,
    timestamp,
    isAnomaly
  });

  // Check if engagement is below threshold
  if (engagementScore < ACTIVITY_THRESHOLD) {
    await createAlert(userId, 'low_engagement', {
      message: 'Engagement score below threshold',
      score: engagementScore,
      threshold: ACTIVITY_THRESHOLD
    });
  }

  return {
    engagementScore,
    isAnomaly,
    timestamp
  };
};

/**
 * Calculate engagement score based on activity metrics
 * @param {Object} metrics - Activity metrics object
 * @returns {number} - Engagement score (0-100)
 */
const calculateEngagementScore = (metrics) => {
  const weights = {
    interactions: 0.4,    // 40% weight for interactions
    responses: 0.3,       // 30% weight for responses
    participation: 0.3    // 30% weight for participation
  };

  // Normalize each metric to 0-100 scale
  const normalizedMetrics = {
    interactions: normalizeMetric(metrics.interactions, 0, 50),  // 0-50 interactions
    responses: normalizeMetric(metrics.responses, 0, 20),        // 0-20 responses
    participation: normalizeMetric(metrics.participation, 0, 100) // 0-100% participation
  };

  // Calculate weighted score
  const score = Object.entries(weights).reduce((total, [metric, weight]) => {
    return total + (normalizedMetrics[metric] * weight);
  }, 0);

  return Math.round(score);
};

/**
 * Normalize a metric value to 0-100 scale
 * @param {number} value - Current value
 * @param {number} min - Minimum expected value
 * @param {number} max - Maximum expected value
 * @returns {number} - Normalized value (0-100)
 */
const normalizeMetric = (value, min, max) => {
  if (value <= min) return 0;
  if (value >= max) return 100;
  return ((value - min) / (max - min)) * 100;
};

/**
 * Calculate engagement trends over time
 * @param {Array} engagements - Array of engagement records
 * @returns {Object} - Trend analysis
 */
const calculateEngagementTrends = (engagements) => {
  if (!engagements.length) return null;

  // Sort engagements by date
  const sortedEngagements = [...engagements].sort((a, b) => 
    new Date(a.checkInTime) - new Date(b.checkInTime)
  );

  // Calculate moving average
  const windowSize = 5;
  const movingAverage = [];
  for (let i = 0; i < sortedEngagements.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = sortedEngagements.slice(start, i + 1);
    const average = window.reduce((sum, e) => sum + e.engagementScore, 0) / window.length;
    movingAverage.push({
      date: sortedEngagements[i].checkInTime,
      score: Math.round(average)
    });
  }

  // Calculate trend direction
  const firstHalf = sortedEngagements.slice(0, Math.floor(sortedEngagements.length / 2));
  const secondHalf = sortedEngagements.slice(Math.floor(sortedEngagements.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, e) => sum + e.engagementScore, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, e) => sum + e.engagementScore, 0) / secondHalf.length;
  
  const trend = secondAvg - firstAvg;
  const trendDirection = trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable';

  return {
    movingAverage,
    trendDirection,
    trendPercentage: Math.abs(Math.round((trend / firstAvg) * 100))
  };
};

/**
 * Generate engagement insights
 * @param {Object} analytics - Engagement analytics data
 * @returns {Array} - Array of insight objects
 */
const generateEngagementInsights = (analytics) => {
  const insights = [];

  // High disengagement rate insight
  const disengagementRate = (analytics.disengagedUsers / analytics.totalParticipants) * 100;
  if (disengagementRate > 20) {
    insights.push({
      type: 'warning',
      message: `High disengagement rate (${Math.round(disengagementRate)}%). Consider reviewing event format or content.`
    });
  }

  // Low average engagement insight
  if (analytics.averageEngagementScore < 50) {
    insights.push({
      type: 'warning',
      message: 'Low average engagement score. Consider implementing more interactive elements.'
    });
  }

  // High engagement distribution insight
  if (analytics.engagementDistribution.high > analytics.engagementDistribution.medium + analytics.engagementDistribution.low) {
    insights.push({
      type: 'success',
      message: 'Excellent engagement levels across participants.'
    });
  }

  // Duration insight
  if (analytics.averageDuration < 30) {
    insights.push({
      type: 'info',
      message: 'Short average participation duration. Consider adjusting event length or format.'
    });
  }

  return insights;
};

module.exports = {
  processActivityPulse,
  calculateEngagementScore,
  calculateEngagementTrends,
  generateEngagementInsights
}; 
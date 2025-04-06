const { User, Event, Engagement } = require('../models');
const { APIError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const { processActivityPulse, calculateEngagementScore, calculateEngagementTrends, generateEngagementInsights } = require('../utils/engagementUtils');
const { generateChart, generatePDFReport, generateCSVReport } = require('../utils/reportUtils');
const { getAlerts } = require('../utils/redisUtils');

// Track user engagement for an event
const trackEngagement = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { activityMetrics } = req.body;
    const userId = req.user.id;

    // Check if event exists
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new APIError('Event not found', 404);
    }

    // Check if user is registered for the event
    const attendance = await Attendance.findOne({
      where: { userId, eventId }
    });
    if (!attendance) {
      throw new APIError('User not registered for this event', 400);
    }

    // Calculate engagement score
    const engagementScore = calculateEngagementScore(activityMetrics);

    // Update or create engagement record
    const [engagement, created] = await Engagement.findOrCreate({
      where: { userId, eventId },
      defaults: {
        checkInTime: new Date(),
        activityMetrics,
        engagementScore,
        status: 'active'
      }
    });

    if (!created) {
      // Update existing engagement
      await engagement.update({
        activityMetrics,
        engagementScore,
        status: engagementScore < 30 ? 'disengaged' : 'active'
      });
    }

    logger.info(`Engagement tracked for user ${userId} in event ${eventId}`);
    res.status(200).json({
      success: true,
      data: engagement
    });
  } catch (error) {
    next(error);
  }
};

// Process activity pulse from frontend
const handleActivityPulse = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { deviceInfo, activityMetrics } = req.body;
    const userId = req.user.id;

    // Process the activity pulse
    const result = await processActivityPulse({
      userId,
      eventId,
      deviceInfo,
      activityMetrics
    });

    logger.info(`Activity pulse processed for user ${userId} in event ${eventId}`);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// Get engagement analytics for an event
const getEventEngagementAnalytics = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { startDate, endDate } = req.query;

    // Check if user has permission to view analytics
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new APIError('Event not found', 404);
    }

    if (event.createdBy !== req.user.id && req.user.role !== 'admin') {
      throw new APIError('Unauthorized to view analytics', 403);
    }

    // Build query
    const query = {
      where: { eventId },
      include: [{
        model: User,
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    };

    if (startDate && endDate) {
      query.where.checkInTime = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Get engagement records
    const engagements = await Engagement.findAll(query);

    // Calculate analytics
    const analytics = {
      totalParticipants: engagements.length,
      averageEngagementScore: engagements.reduce((acc, curr) => acc + curr.engagementScore, 0) / engagements.length,
      engagementDistribution: {
        high: engagements.filter(e => e.engagementScore >= 70).length,
        medium: engagements.filter(e => e.engagementScore >= 30 && e.engagementScore < 70).length,
        low: engagements.filter(e => e.engagementScore < 30).length
      },
      averageDuration: engagements.reduce((acc, curr) => acc + (curr.duration || 0), 0) / engagements.length,
      disengagedUsers: engagements.filter(e => e.status === 'disengaged').length
    };

    // Generate insights
    analytics.insights = generateEngagementInsights(analytics);

    // Calculate trends
    analytics.trends = calculateEngagementTrends(engagements);

    logger.info(`Engagement analytics retrieved for event ${eventId}`);
    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

// Get user engagement history
const getUserEngagementHistory = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    // Check if user has permission to view history
    if (userId !== req.user.id && req.user.role !== 'admin') {
      throw new APIError('Unauthorized to view engagement history', 403);
    }

    // Build query
    const query = {
      where: { userId },
      include: [{
        model: Event,
        attributes: ['id', 'name', 'startTime', 'endTime']
      }]
    };

    if (startDate && endDate) {
      query.where.checkInTime = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Get engagement records
    const engagements = await Engagement.findAll(query);

    // Get alerts
    const alerts = await getAlerts(userId);

    logger.info(`Engagement history retrieved for user ${userId}`);
    res.status(200).json({
      success: true,
      data: {
        engagements,
        alerts
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update engagement status (e.g., when user checks out)
const updateEngagementStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const engagement = await Engagement.findByPk(id);
    if (!engagement) {
      throw new APIError('Engagement record not found', 404);
    }

    // Check if user has permission to update
    if (engagement.userId !== req.user.id && req.user.role !== 'admin') {
      throw new APIError('Unauthorized to update engagement', 403);
    }

    // Calculate duration if checking out
    if (status === 'completed' && !engagement.checkOutTime) {
      const checkOutTime = new Date();
      const duration = Math.round((checkOutTime - engagement.checkInTime) / (1000 * 60)); // in minutes
      await engagement.update({
        checkOutTime,
        duration,
        status,
        notes
      });
    } else {
      await engagement.update({ status, notes });
    }

    logger.info(`Engagement status updated for record ${id}`);
    res.status(200).json({
      success: true,
      data: engagement
    });
  } catch (error) {
    next(error);
  }
};

// Generate engagement report
const generateReport = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { format = 'pdf' } = req.query;

    // Check if user has permission to generate report
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new APIError('Event not found', 404);
    }

    if (event.createdBy !== req.user.id && req.user.role !== 'admin') {
      throw new APIError('Unauthorized to generate report', 403);
    }

    // Get engagement data
    const engagements = await Engagement.findAll({
      where: { eventId },
      include: [{
        model: User,
        attributes: ['id', 'firstName', 'lastName']
      }, {
        model: Event,
        attributes: ['id', 'name']
      }]
    });

    let report;
    let contentType;
    let filename;

    if (format === 'pdf') {
      report = await generatePDFReport({
        totalParticipants: engagements.length,
        averageEngagementScore: engagements.reduce((acc, curr) => acc + curr.engagementScore, 0) / engagements.length,
        averageDuration: engagements.reduce((acc, curr) => acc + (curr.duration || 0), 0) / engagements.length,
        engagementDistribution: {
          high: engagements.filter(e => e.engagementScore >= 70).length,
          medium: engagements.filter(e => e.engagementScore >= 30 && e.engagementScore < 70).length,
          low: engagements.filter(e => e.engagementScore < 30).length
        },
        insights: generateEngagementInsights({
          totalParticipants: engagements.length,
          averageEngagementScore: engagements.reduce((acc, curr) => acc + curr.engagementScore, 0) / engagements.length,
          disengagedUsers: engagements.filter(e => e.status === 'disengaged').length
        })
      });
      contentType = 'application/pdf';
      filename = `engagement-report-${eventId}.pdf`;
    } else {
      report = await generateCSVReport(engagements);
      contentType = 'text/csv';
      filename = `engagement-report-${eventId}.csv`;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(report);
  } catch (error) {
    next(error);
  }
};

// Generate engagement chart
const generateChart = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { type = 'pie' } = req.query;

    // Check if user has permission to generate chart
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new APIError('Event not found', 404);
    }

    if (event.createdBy !== req.user.id && req.user.role !== 'admin') {
      throw new APIError('Unauthorized to generate chart', 403);
    }

    // Get engagement data
    const engagements = await Engagement.findAll({
      where: { eventId }
    });

    // Prepare chart data
    const chartData = type === 'pie' ? [
      { label: 'High Engagement', value: engagements.filter(e => e.engagementScore >= 70).length },
      { label: 'Medium Engagement', value: engagements.filter(e => e.engagementScore >= 30 && e.engagementScore < 70).length },
      { label: 'Low Engagement', value: engagements.filter(e => e.engagementScore < 30).length }
    ] : [
      { label: 'Average Score', value: engagements.reduce((acc, curr) => acc + curr.engagementScore, 0) / engagements.length },
      { label: 'Disengaged', value: engagements.filter(e => e.status === 'disengaged').length }
    ];

    // Generate chart
    const chart = await generateChart(chartData, type);

    res.setHeader('Content-Type', 'image/png');
    res.send(chart);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  trackEngagement,
  handleActivityPulse,
  getEventEngagementAnalytics,
  getUserEngagementHistory,
  updateEngagementStatus,
  generateReport,
  generateChart
}; 
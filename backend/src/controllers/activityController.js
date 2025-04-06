const redisService = require('../services/redisService');
const reportService = require('../services/reportService');
const logger = require('../utils/logger');

class ActivityController {
  async trackActivity(req, res) {
    try {
      const { userId, sessionId, activityType, deviceInfo, ipAddress } = req.body;
      
      await redisService.storeActivityPulse({
        userId,
        sessionId,
        activityType,
        deviceInfo,
        ipAddress,
        timestamp: Date.now()
      });

      res.status(200).json({ message: 'Activity pulse recorded successfully' });
    } catch (error) {
      logger.error('Error tracking activity:', error);
      res.status(500).json({ error: 'Failed to track activity' });
    }
  }

  async getEngagementStats(req, res) {
    try {
      const { userId, startDate, endDate } = req.query;
      
      const stats = await redisService.getEngagementStats(userId, startDate, endDate);
      res.status(200).json(stats);
    } catch (error) {
      logger.error('Error getting engagement stats:', error);
      res.status(500).json({ error: 'Failed to get engagement statistics' });
    }
  }

  async getAnomalies(req, res) {
    try {
      const { userId, startDate, endDate } = req.query;
      
      const anomalies = await redisService.getAnomalies(userId, startDate, endDate);
      res.status(200).json(anomalies);
    } catch (error) {
      logger.error('Error getting anomalies:', error);
      res.status(500).json({ error: 'Failed to get anomalies' });
    }
  }

  async generateReport(req, res) {
    try {
      const { userId, startDate, endDate, format } = req.query;
      
      const stats = await redisService.getEngagementStats(userId, startDate, endDate);
      const anomalies = await redisService.getAnomalies(userId, startDate, endDate);
      
      const reportData = {
        ...stats,
        anomalies,
        anomalyCount: anomalies.length
      };

      let report;
      let filename;
      let contentType;

      if (format === 'pdf') {
        report = await reportService.generatePDFReport(userId, reportData);
        filename = `engagement_report_${userId}_${Date.now()}.pdf`;
        contentType = 'application/pdf';
      } else if (format === 'csv') {
        report = await reportService.generateCSVReport(reportData);
        filename = `engagement_report_${userId}_${Date.now()}.csv`;
        contentType = 'text/csv';
      } else {
        return res.status(400).json({ error: 'Invalid report format' });
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      
      if (format === 'pdf') {
        const fileStream = require('fs').createReadStream(report);
        fileStream.pipe(res);
        
        fileStream.on('end', async () => {
          await reportService.cleanupTempFiles();
        });
      } else {
        res.send(report);
      }
    } catch (error) {
      logger.error('Error generating report:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  }

  async getEngagementChart(req, res) {
    try {
      const { userId, startDate, endDate } = req.query;
      
      const stats = await redisService.getEngagementStats(userId, startDate, endDate);
      const chartBuffer = await reportService.generateEngagementChart(stats);
      
      res.setHeader('Content-Type', 'image/png');
      res.send(chartBuffer);
    } catch (error) {
      logger.error('Error generating engagement chart:', error);
      res.status(500).json({ error: 'Failed to generate engagement chart' });
    }
  }

  async getTimeDistributionChart(req, res) {
    try {
      const { userId, startDate, endDate } = req.query;
      
      const stats = await redisService.getEngagementStats(userId, startDate, endDate);
      const chartBuffer = await reportService.generatePieChart(stats);
      
      res.setHeader('Content-Type', 'image/png');
      res.send(chartBuffer);
    } catch (error) {
      logger.error('Error generating time distribution chart:', error);
      res.status(500).json({ error: 'Failed to generate time distribution chart' });
    }
  }
}

module.exports = new ActivityController(); 
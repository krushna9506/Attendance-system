const PDFDocument = require('pdfkit');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class ReportService {
  constructor() {
    this.chartJSCanvas = new ChartJSNodeCanvas({
      width: 800,
      height: 400,
      backgroundColour: 'white'
    });
  }

  async generateEngagementChart(data) {
    try {
      const configuration = {
        type: 'bar',
        data: {
          labels: data.sessionData.map((_, index) => `Session ${index + 1}`),
          datasets: [
            {
              label: 'Engagement Score',
              data: data.sessionData.map(session => session.engagementScore),
              backgroundColor: data.sessionData.map(session => 
                session.engagementScore >= 70 ? 'rgba(75, 192, 192, 0.6)' : 'rgba(255, 99, 132, 0.6)'
              )
            }
          ]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              max: 100
            }
          },
          plugins: {
            title: {
              display: true,
              text: 'Session Engagement Scores'
            }
          }
        }
      };

      return await this.chartJSCanvas.renderToBuffer(configuration);
    } catch (error) {
      logger.error('Error generating engagement chart:', error);
      throw error;
    }
  }

  async generatePieChart(data) {
    try {
      const configuration = {
        type: 'pie',
        data: {
          labels: ['Active Time', 'Idle Time'],
          datasets: [{
            data: [
              data.sessionData.reduce((sum, session) => sum + session.activeTime, 0),
              data.sessionData.reduce((sum, session) => sum + session.idleTime, 0)
            ],
            backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)']
          }]
        },
        options: {
          plugins: {
            title: {
              display: true,
              text: 'Active vs Idle Time Distribution'
            }
          }
        }
      };

      return await this.chartJSCanvas.renderToBuffer(configuration);
    } catch (error) {
      logger.error('Error generating pie chart:', error);
      throw error;
    }
  }

  async generatePDFReport(userId, data) {
    try {
      const doc = new PDFDocument();
      const filePath = path.join(__dirname, `../../temp/report_${userId}_${Date.now()}.pdf`);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Title
      doc.fontSize(20).text('Engagement Report', { align: 'center' });
      doc.moveDown();

      // Summary
      doc.fontSize(14).text('Summary');
      doc.fontSize(12)
        .text(`Total Sessions: ${data.totalSessions}`)
        .text(`Average Engagement: ${data.averageEngagement.toFixed(2)}%`)
        .text(`Low Engagement Sessions: ${data.lowEngagementCount}`)
        .text(`Anomalies Detected: ${data.anomalyCount}`);
      doc.moveDown();

      // Add charts
      const engagementChart = await this.generateEngagementChart(data);
      doc.image(engagementChart, {
        fit: [500, 250],
        align: 'center'
      });
      doc.moveDown();

      const pieChart = await this.generatePieChart(data);
      doc.image(pieChart, {
        fit: [500, 250],
        align: 'center'
      });
      doc.moveDown();

      // Session details
      doc.fontSize(14).text('Session Details');
      data.sessionData.forEach((session, index) => {
        doc.fontSize(12)
          .text(`Session ${index + 1}:`)
          .text(`  Engagement Score: ${session.engagementScore.toFixed(2)}%`)
          .text(`  Active Time: ${(session.activeTime / 60).toFixed(2)} minutes`)
          .text(`  Idle Time: ${(session.idleTime / 60).toFixed(2)} minutes`)
          .moveDown(0.5);
      });

      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
      });
    } catch (error) {
      logger.error('Error generating PDF report:', error);
      throw error;
    }
  }

  async generateCSVReport(data) {
    try {
      const fields = [
        'sessionId',
        'startTime',
        'engagementScore',
        'activeTime',
        'idleTime',
        'pulseCount',
        'ipCount',
        'deviceCount'
      ];

      const csvData = data.sessionData.map(session => ({
        sessionId: session.id,
        startTime: new Date(session.startTime).toISOString(),
        engagementScore: session.engagementScore.toFixed(2),
        activeTime: (session.activeTime / 60).toFixed(2),
        idleTime: (session.idleTime / 60).toFixed(2),
        pulseCount: session.pulseCount,
        ipCount: session.ipHistory.length,
        deviceCount: session.deviceHistory.length
      }));

      const parser = new Parser({ fields });
      return parser.parse(csvData);
    } catch (error) {
      logger.error('Error generating CSV report:', error);
      throw error;
    }
  }

  async cleanupTempFiles() {
    try {
      const tempDir = path.join(__dirname, '../../temp');
      const files = await fs.promises.readdir(tempDir);
      
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.promises.stat(filePath);
        
        if (stats.ctimeMs < oneHourAgo) {
          await fs.promises.unlink(filePath);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up temp files:', error);
    }
  }
}

module.exports = new ReportService(); 
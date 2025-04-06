const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const { createCanvas } = require('canvas');
const { logger } = require('./logger');
const { cacheData, getCachedData } = require('./redisUtils');

/**
 * Generate engagement charts
 * @param {Object} data - Engagement data
 * @param {string} type - Chart type ('pie' or 'bar')
 * @returns {Buffer} - Chart image buffer
 */
const generateChart = async (data, type = 'pie') => {
  const cacheKey = `chart:${type}:${JSON.stringify(data)}`;
  const cachedChart = await getCachedData(cacheKey);
  if (cachedChart) return Buffer.from(cachedChart, 'base64');

  const width = 800;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (type === 'pie') {
    await generatePieChart(ctx, data, width, height);
  } else {
    await generateBarChart(ctx, data, width, height);
  }

  const buffer = canvas.toBuffer('image/png');
  await cacheData(cacheKey, buffer.toString('base64'), 3600); // Cache for 1 hour
  return buffer;
};

/**
 * Generate pie chart
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} data - Chart data
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
const generatePieChart = async (ctx, data, width, height) => {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.4;

  let startAngle = 0;
  const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];

  // Draw pie slices
  data.forEach((item, index) => {
    const sliceAngle = (item.value / data.reduce((sum, d) => sum + d.value, 0)) * Math.PI * 2;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    
    ctx.fillStyle = colors[index % colors.length];
    ctx.fill();
    
    startAngle += sliceAngle;
  });

  // Draw legend
  const legendX = width * 0.7;
  const legendY = height * 0.2;
  data.forEach((item, index) => {
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillRect(legendX, legendY + index * 30, 20, 20);
    
    ctx.fillStyle = '#000';
    ctx.font = '14px Arial';
    ctx.fillText(item.label, legendX + 30, legendY + index * 30 + 15);
  });
};

/**
 * Generate bar chart
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} data - Chart data
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
const generateBarChart = async (ctx, data, width, height) => {
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const barWidth = chartWidth / data.length;
  const maxValue = Math.max(...data.map(d => d.value));

  // Draw axes
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.strokeStyle = '#000';
  ctx.stroke();

  // Draw bars
  data.forEach((item, index) => {
    const barHeight = (item.value / maxValue) * chartHeight;
    const x = padding + index * barWidth;
    const y = height - padding - barHeight;

    ctx.fillStyle = '#36A2EB';
    ctx.fillRect(x, y, barWidth - 10, barHeight);

    // Draw label
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(item.label, x + barWidth / 2, height - padding + 20);
  });
};

/**
 * Generate PDF report
 * @param {Object} data - Report data
 * @returns {Buffer} - PDF buffer
 */
const generatePDFReport = async (data) => {
  const doc = new PDFDocument();
  const chunks = [];

  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => Buffer.concat(chunks));

  // Add header
  doc.fontSize(20).text('Engagement Report', { align: 'center' });
  doc.moveDown();

  // Add summary
  doc.fontSize(16).text('Summary');
  doc.fontSize(12).text(`Total Participants: ${data.totalParticipants}`);
  doc.text(`Average Engagement Score: ${data.averageEngagementScore}%`);
  doc.text(`Average Duration: ${data.averageDuration} minutes`);
  doc.moveDown();

  // Add distribution
  doc.fontSize(16).text('Engagement Distribution');
  const distribution = data.engagementDistribution;
  doc.fontSize(12).text(`High Engagement: ${distribution.high} participants`);
  doc.text(`Medium Engagement: ${distribution.medium} participants`);
  doc.text(`Low Engagement: ${distribution.low} participants`);
  doc.moveDown();

  // Add insights
  if (data.insights && data.insights.length > 0) {
    doc.fontSize(16).text('Insights');
    data.insights.forEach(insight => {
      doc.fontSize(12).text(`• ${insight.message}`);
    });
  }

  doc.end();
  return Buffer.concat(chunks);
};

/**
 * Generate CSV report
 * @param {Array} data - Report data
 * @returns {string} - CSV string
 */
const generateCSVReport = async (data) => {
  const fields = [
    'userId',
    'firstName',
    'lastName',
    'eventId',
    'eventName',
    'checkInTime',
    'checkOutTime',
    'duration',
    'engagementScore',
    'status'
  ];

  const parser = new Parser({ fields });
  return parser.parse(data);
};

module.exports = {
  generateChart,
  generatePDFReport,
  generateCSVReport
}; 
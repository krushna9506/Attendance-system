const nodemailer = require('nodemailer');
const logger = require('./logger');

// Create a transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text email body
 * @param {string} options.html - HTML email body
 * @returns {Promise<Object>} - Info about the sent email
 */
const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully', { 
      messageId: info.messageId,
      to: options.to,
      subject: options.subject
    });
    
    return info;
  } catch (error) {
    logger.error('Error sending email', { 
      error: error.message,
      to: options.to,
      subject: options.subject
    });
    throw error;
  }
};

/**
 * Send a password reset email
 * @param {Object} user - User object
 * @param {string} resetToken - Password reset token
 * @returns {Promise<Object>} - Info about the sent email
 */
const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const options = {
    to: user.email,
    subject: 'Password Reset Request',
    text: `You requested a password reset. Please click the following link to reset your password: ${resetUrl}`,
    html: `
      <h1>Password Reset Request</h1>
      <p>You requested a password reset. Please click the following link to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>If you did not request this, please ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
    `
  };
  
  return sendEmail(options);
};

/**
 * Send an attendance confirmation email
 * @param {Object} user - User object
 * @param {Object} event - Event object
 * @returns {Promise<Object>} - Info about the sent email
 */
const sendAttendanceConfirmationEmail = async (user, event) => {
  const options = {
    to: user.email,
    subject: `Attendance Confirmation - ${event.name}`,
    text: `Your attendance has been recorded for ${event.name} on ${new Date().toLocaleDateString()}.`,
    html: `
      <h1>Attendance Confirmation</h1>
      <p>Your attendance has been recorded for <strong>${event.name}</strong> on ${new Date().toLocaleDateString()}.</p>
      <p>Thank you for attending!</p>
    `
  };
  
  return sendEmail(options);
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendAttendanceConfirmationEmail
}; 
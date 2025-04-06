const moment = require('moment-timezone');

/**
 * Get the current date and time in the specified timezone
 * @param {string} timezone - Timezone (default: 'UTC')
 * @returns {Date} - Current date and time
 */
const getCurrentDateTime = (timezone = 'UTC') => {
  return moment().tz(timezone).toDate();
};

/**
 * Format a date for display
 * @param {Date} date - Date to format
 * @param {string} format - Format string (default: 'YYYY-MM-DD HH:mm:ss')
 * @param {string} timezone - Timezone (default: 'UTC')
 * @returns {string} - Formatted date string
 */
const formatDateTime = (date, format = 'YYYY-MM-DD HH:mm:ss', timezone = 'UTC') => {
  return moment(date).tz(timezone).format(format);
};

/**
 * Check if a date is within a specific time range
 * @param {Date} date - Date to check
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {boolean} - True if date is within range
 */
const isDateInRange = (date, startDate, endDate) => {
  const momentDate = moment(date);
  return momentDate.isBetween(startDate, endDate, null, '[]');
};

/**
 * Get the start and end of a day
 * @param {Date} date - Date to get start/end for
 * @param {string} timezone - Timezone (default: 'UTC')
 * @returns {Object} - Object with start and end dates
 */
const getDayBoundaries = (date, timezone = 'UTC') => {
  const momentDate = moment(date).tz(timezone);
  return {
    start: momentDate.startOf('day').toDate(),
    end: momentDate.endOf('day').toDate()
  };
};

/**
 * Get the start and end of a week
 * @param {Date} date - Date within the week
 * @param {string} timezone - Timezone (default: 'UTC')
 * @returns {Object} - Object with start and end dates
 */
const getWeekBoundaries = (date, timezone = 'UTC') => {
  const momentDate = moment(date).tz(timezone);
  return {
    start: momentDate.startOf('week').toDate(),
    end: momentDate.endOf('week').toDate()
  };
};

/**
 * Get the start and end of a month
 * @param {Date} date - Date within the month
 * @param {string} timezone - Timezone (default: 'UTC')
 * @returns {Object} - Object with start and end dates
 */
const getMonthBoundaries = (date, timezone = 'UTC') => {
  const momentDate = moment(date).tz(timezone);
  return {
    start: momentDate.startOf('month').toDate(),
    end: momentDate.endOf('month').toDate()
  };
};

/**
 * Calculate the duration between two dates in minutes
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} - Duration in minutes
 */
const calculateDurationMinutes = (startDate, endDate) => {
  return moment(endDate).diff(moment(startDate), 'minutes');
};

/**
 * Check if a date is today
 * @param {Date} date - Date to check
 * @param {string} timezone - Timezone (default: 'UTC')
 * @returns {boolean} - True if date is today
 */
const isToday = (date, timezone = 'UTC') => {
  return moment(date).tz(timezone).isSame(moment().tz(timezone), 'day');
};

module.exports = {
  getCurrentDateTime,
  formatDateTime,
  isDateInRange,
  getDayBoundaries,
  getWeekBoundaries,
  getMonthBoundaries,
  calculateDurationMinutes,
  isToday
}; 
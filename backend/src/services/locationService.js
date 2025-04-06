const axios = require('axios');
const logger = require('../utils/logger');

class LocationService {
  static async verifyLocation(studentIp, classLocation) {
    try {
      // Get student's location from IP
      const studentLocation = await this.getLocationFromIP(studentIp);
      
      // Calculate distance between student and class location
      const distance = this.calculateDistance(
        studentLocation.latitude,
        studentLocation.longitude,
        classLocation.latitude,
        classLocation.longitude
      );

      const maxDistance = process.env.IP_VERIFICATION_RADIUS || 50; // meters
      const isWithinRange = distance <= maxDistance;

      return {
        isWithinRange,
        distance,
        maxDistance,
        studentLocation,
        classLocation
      };
    } catch (error) {
      logger.error('Error verifying location:', error);
      throw error;
    }
  }

  static async getLocationFromIP(ip) {
    try {
      // Use a geolocation service (e.g., ipapi.co)
      const response = await axios.get(`https://ipapi.co/${ip}/json/`);
      
      return {
        latitude: response.data.latitude,
        longitude: response.data.longitude,
        city: response.data.city,
        country: response.data.country_name
      };
    } catch (error) {
      logger.error('Error getting location from IP:', error);
      throw new Error('Unable to verify location');
    }
  }

  static calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula to calculate distance between two points
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  static async validateClassLocation(classId) {
    try {
      const classData = await Class.findByPk(classId);
      if (!classData || !classData.location) {
        throw new Error('Invalid class location');
      }

      return classData.location;
    } catch (error) {
      logger.error('Error validating class location:', error);
      throw error;
    }
  }
}

module.exports = LocationService; 
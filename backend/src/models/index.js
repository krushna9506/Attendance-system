const { Sequelize } = require('sequelize');
const config = require('../config/database');
const User = require('./User');
const Event = require('./Event');
const Attendance = require('./Attendance');

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: 'postgres',
    logging: config.logging,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const models = {
  User: require('./User')(sequelize),
  Class: require('./Class')(sequelize),
  QRCode: require('./QRCode')(sequelize),
  Attendance: require('./Attendance')(sequelize)
};

// Set up associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Define relationships
User.hasMany(Event, { foreignKey: 'createdBy', as: 'createdEvents' });
Event.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(Attendance, { foreignKey: 'userId', as: 'attendances' });
Attendance.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Event.hasMany(Attendance, { foreignKey: 'eventId', as: 'attendances' });
Attendance.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

User.hasMany(Attendance, { foreignKey: 'verifiedBy', as: 'verifiedAttendances' });
Attendance.belongsTo(User, { foreignKey: 'verifiedBy', as: 'verifier' });

module.exports = {
  sequelize,
  ...models,
  User,
  Event,
  Attendance
}; 
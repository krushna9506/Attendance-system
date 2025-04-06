const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Class extends Model {
    static associate(models) {
      Class.belongsTo(models.User, { foreignKey: 'teacherId', as: 'teacher' });
      Class.hasMany(models.Attendance, { foreignKey: 'classId' });
      Class.hasMany(models.QRCode, { foreignKey: 'classId' });
    }
  }

  Class.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    teacherId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    schedule: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    mode: {
      type: DataTypes.ENUM('online', 'offline'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'in-progress', 'completed', 'cancelled'),
      defaultValue: 'scheduled'
    },
    location: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    qrCodeInterval: {
      type: DataTypes.INTEGER,
      defaultValue: 900000 // 15 minutes in milliseconds
    },
    qrCodeRefreshRate: {
      type: DataTypes.INTEGER,
      defaultValue: 3000 // 3 seconds in milliseconds
    }
  }, {
    sequelize,
    modelName: 'Class',
    indexes: [
      {
        fields: ['teacherId']
      },
      {
        fields: ['status']
      }
    ]
  });

  return Class;
}; 
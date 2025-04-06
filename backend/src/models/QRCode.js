const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class QRCode extends Model {
    static associate(models) {
      QRCode.belongsTo(models.Class, { foreignKey: 'classId' });
      QRCode.hasMany(models.Attendance, { foreignKey: 'qrCodeId' });
    }
  }

  QRCode.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    classId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Classes',
        key: 'id'
      }
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false
    },
    sequence: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    validFrom: {
      type: DataTypes.DATE,
      allowNull: false
    },
    validUntil: {
      type: DataTypes.DATE,
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'QRCode',
    indexes: [
      {
        fields: ['classId']
      },
      {
        fields: ['validFrom', 'validUntil']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  return QRCode;
}; 
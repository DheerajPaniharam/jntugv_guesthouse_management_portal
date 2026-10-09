const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('AuditLog', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    action: { type: DataTypes.STRING, allowNull: false },
    actorId: { type: DataTypes.STRING, allowNull: false },
    actorName: { type: DataTypes.STRING, allowNull: false },
    actorRole: { type: DataTypes.STRING, allowNull: false },
    targetId: { type: DataTypes.STRING },
    targetType: { type: DataTypes.STRING, defaultValue: 'GuestEntry' },
    summary: { type: DataTypes.STRING },
    details: { type: DataTypes.JSON },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    timestamps: false
  });
};

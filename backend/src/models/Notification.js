const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('Notification', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        userId: { type: DataTypes.UUID, allowNull: false },
        message: { type: DataTypes.STRING, allowNull: false },
        type: { type: DataTypes.ENUM('INFO', 'SUCCESS', 'WARNING', 'ERROR'), defaultValue: 'INFO' },
        isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
        relatedGuestEntryId: { type: DataTypes.UUID, allowNull: true }
    });
};

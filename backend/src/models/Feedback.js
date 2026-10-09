
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Feedback', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    userName: { type: DataTypes.STRING, allowNull: false },
    type: { 
      type: DataTypes.ENUM('Suggestion', 'Complaint', 'Compliment'),
      defaultValue: 'Suggestion'
    },
    rating: { type: DataTypes.INTEGER, defaultValue: 5 },
    comment: { type: DataTypes.TEXT, allowNull: false }
  });
};

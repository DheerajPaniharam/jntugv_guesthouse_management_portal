
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('User', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { 
      type: DataTypes.ENUM('Student', 'Staff', 'Outsider', 'Admin'), 
      defaultValue: 'Student' 
    },
    contactNumber: { type: DataTypes.STRING },
    idProof: { type: DataTypes.TEXT }, // Path or Base64
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: true },
    resetToken: { type: DataTypes.STRING, allowNull: true },
    resetTokenExpires: { type: DataTypes.DATE, allowNull: true }
  });
};

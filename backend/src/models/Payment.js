
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Payment', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    bookingId: { type: DataTypes.UUID, allowNull: true },
    slNo: { type: DataTypes.STRING, allowNull: true },
    orderId: { type: DataTypes.STRING, allowNull: false },
    paymentId: { type: DataTypes.STRING, allowNull: true },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    currency: { type: DataTypes.STRING, defaultValue: 'INR' },
    paymentMethod: { type: DataTypes.STRING, defaultValue: 'UPI' },
    status: { type: DataTypes.ENUM('Pending', 'Paid', 'Failed', 'Refunded'), defaultValue: 'Pending' },
    payerName: { type: DataTypes.STRING },
    payerEmail: { type: DataTypes.STRING },
    payerPhone: { type: DataTypes.STRING },
    gateway: { type: DataTypes.STRING, defaultValue: 'SIMULATED_GATEWAY' },
    signature: { type: DataTypes.STRING },
    rawResponse: { type: DataTypes.TEXT }
  });
};

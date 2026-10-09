
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('GuestEntry', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    slNo: { type: DataTypes.STRING, unique: true },
    guestName: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.TEXT, allowNull: false },
    nationality: { type: DataTypes.STRING, defaultValue: 'Indian' },
    purposeOfVisit: { type: DataTypes.STRING },
    bookingFor: { type: DataTypes.ENUM('Self', 'Others'), defaultValue: 'Self' },
    category: { type: DataTypes.STRING },
    roomType: { type: DataTypes.STRING, defaultValue: 'AC Room' },
    arrivalDateTime: { type: DataTypes.DATE, allowNull: false },
    departureDateTime: { type: DataTypes.DATE, allowNull: false },
    numDays: { type: DataTypes.INTEGER },
    roomNo: { type: DataTypes.STRING, allowNull: false },
    numMale: { type: DataTypes.INTEGER, defaultValue: 0 },
    numFemale: { type: DataTypes.INTEGER, defaultValue: 0 },
    numChildren: { type: DataTypes.INTEGER, defaultValue: 0 },
    isUniversityGuest: { type: DataTypes.BOOLEAN, defaultValue: false },
    paymentType: { type: DataTypes.ENUM('Personal', 'Departmental'), defaultValue: 'Personal' },
    departmentName: { type: DataTypes.STRING },
    budgetHead: { type: DataTypes.STRING },
    sanctionOrderNo: { type: DataTypes.STRING },
    approvingAuthority: { type: DataTypes.STRING },
    totalAmount: { type: DataTypes.DECIMAL(10, 2) },
    paymentStatus: { type: DataTypes.ENUM('Pending', 'Paid', 'Failed', 'Refunded'), defaultValue: 'Pending' },
    paymentMethod: { type: DataTypes.STRING },
    transactionId: { type: DataTypes.STRING },
    paymentOrderId: { type: DataTypes.STRING },
    paidAt: { type: DataTypes.DATE },
    receiptNo: { type: DataTypes.STRING },
    receiptDate: { type: DataTypes.DATEONLY },
    remarks: { type: DataTypes.TEXT },
    status: { type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'), defaultValue: 'Pending' },
    submittedBy: { type: DataTypes.UUID },
    idProof: { type: DataTypes.TEXT }, // Base64 string for ID image
    requestLetter: { type: DataTypes.TEXT }, // Base64 string for PDF letter
    signature: { type: DataTypes.TEXT } // Base64 string for signature
  });
};

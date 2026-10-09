
import { EntryStatus, UserRole, PaymentType, AuditActionType } from '../types';

const now = new Date();
const todayStr = now.toISOString().split('T')[0];
const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const dayAfterStr = new Date(Date.now() + 172800000).toISOString().split('T')[0];

export const mockEntries = [
  {
    id: '1',
    slNo: 'G-2026-001',
    guestName: 'Prof. Amit Sharma',
    phoneNumber: '+91 9876543210',
    address: 'IIT Bombay, Powai, Mumbai, Maharashtra',
    nationality: 'Indian',
    purposeOfVisit: 'External PhD Thesis Examiner (Dept of CSE)',
    bookingFor: 'Self',
    category: 'Institute Guest (Official Work)',
    arrivalDateTime: `${yesterdayStr}T10:00`,
    departureDateTime: `${tomorrowStr}T12:00`,
    numDays: 2,
    roomNo: '101',
    roomType: 'AC Room',
    numMale: 1,
    numFemale: 0,
    numChildren: 0,
    isUniversityGuest: true,
    paymentType: PaymentType.DEPARTMENTAL,
    departmentName: 'Computer Science & Engineering',
    budgetHead: 'UGC-SAP-DRS-II',
    sanctionOrderNo: 'SO/CSE/2026/089',
    approvingAuthority: 'Prof. K. Venkatesh (HOD CSE - EMP-4102)',
    totalAmount: 0,
    status: EntryStatus.APPROVED,
    submittedBy: 'staff_1',
    createdAt: `${yesterdayStr}T08:30:00.000Z`,
    remarks: 'Official guest approved by Registrar for PhD Viva Examination',
    receiptNo: 'REC-5521',
    receiptDate: yesterdayStr
  },
  {
    id: '2',
    slNo: 'G-2026-002',
    guestName: 'Dr. Priya Sundaram',
    phoneNumber: '+91 9443322110',
    address: 'IISc Bangalore, Karnataka',
    nationality: 'Indian',
    purposeOfVisit: 'Guest Lecture on Quantum Computing',
    bookingFor: 'Self',
    category: 'Institute Guest (Official Work)',
    arrivalDateTime: `${todayStr}T14:00`,
    departureDateTime: `${dayAfterStr}T11:00`,
    numDays: 2,
    roomNo: '102',
    roomType: 'AC Room',
    numMale: 0,
    numFemale: 1,
    numChildren: 0,
    isUniversityGuest: true,
    paymentType: PaymentType.DEPARTMENTAL,
    departmentName: 'Physics & Nanotechnology',
    budgetHead: 'DST-SERB-QUANTUM-2024',
    sanctionOrderNo: 'DST/SO/PHY/2026/14',
    approvingAuthority: 'Dr. M. S. Rao (Dean R&D - EMP-3021)',
    totalAmount: 0,
    status: EntryStatus.APPROVED,
    submittedBy: 'staff_1',
    createdAt: `${todayStr}T09:15:00.000Z`,
    remarks: 'Keynote Speaker for National Physics Colloquium',
    receiptNo: 'REC-5522',
    receiptDate: todayStr
  },
  {
    id: '3',
    slNo: 'G-2026-003',
    guestName: 'Rahul Verma & Family',
    phoneNumber: '+91 8899776655',
    address: 'DLF Phase 3, Gurgaon, Haryana',
    nationality: 'Indian',
    purposeOfVisit: 'Convocation Ceremony (Parent of B.Tech Gold Medalist)',
    bookingFor: 'Others',
    category: 'Outsiders / Parents etc',
    arrivalDateTime: `${tomorrowStr}T15:00`,
    departureDateTime: `${new Date(Date.now() + 259200000).toISOString().split('T')[0]}T10:00`,
    numDays: 2,
    roomNo: '103',
    roomType: 'AC Room',
    numMale: 1,
    numFemale: 1,
    numChildren: 1,
    isUniversityGuest: false,
    paymentType: PaymentType.PERSONAL,
    totalAmount: 1000,
    status: EntryStatus.PENDING,
    submittedBy: 'guest_1',
    createdAt: `${todayStr}T10:45:00.000Z`,
    remarks: 'Parent attending annual convocation. Awaiting payment receipt.'
  }
];

export const INITIAL_ADMINS = [
  { id: 'ADM-001', password: 'admin123', name: 'Chief Registrar' },
  { id: 'ADM-002', password: 'password', name: 'Estate Manager' }
];

export const MOCK_USER_ACCOUNTS = [
  {
    id: 'staff_1',
    name: 'University Staff (Verified)',
    email: 'staff@uni.edu',
    password: 'staff123',
    role: UserRole.STAFF,
    contactNumber: '+91 9999988888',
    isVerified: true
  },
  {
    id: 'staff_pending',
    name: 'New Staff Member (Unverified)',
    email: 'pending-staff@uni.edu',
    password: 'staff123',
    role: UserRole.STAFF,
    contactNumber: '+91 9999900000',
    isVerified: false
  },
  {
    id: 'student_1',
    name: 'Campus Student',
    email: 'student@uni.edu',
    password: 'student123',
    role: UserRole.STUDENT,
    contactNumber: '+91 8888877777',
    isVerified: true
  },
  {
    id: 'guest_1',
    name: 'General Guest User',
    email: 'guest@uni.edu',
    password: 'guest123',
    role: UserRole.OUTSIDER,
    contactNumber: '+91 7777766666',
    isVerified: true
  }
];

export const MOCK_AUDIT_LOGS = [
  {
    id: 'aud_1',
    action: AuditActionType.BOOKING_CREATED,
    actorId: 'staff_1',
    actorName: 'University Staff (Verified)',
    actorRole: UserRole.STAFF,
    targetId: '1',
    targetType: 'GuestEntry',
    summary: 'Created booking G-2026-001 for Prof. Amit Sharma in Room 101 (AC Room)',
    details: {
      roomNo: '101',
      roomType: 'AC Room',
      category: 'Institute Guest (Official Work)',
      paymentType: 'Departmental',
      budgetHead: 'UGC-SAP-DRS-II',
      totalAmount: 0
    },
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'aud_2',
    action: AuditActionType.STATUS_UPDATED,
    actorId: 'ADM-001',
    actorName: 'Chief Registrar',
    actorRole: UserRole.ADMIN,
    targetId: '1',
    targetType: 'GuestEntry',
    summary: 'Approved booking G-2026-001 with Receipt REC-5521 (Official Voucher)',
    details: {
      previousStatus: 'Pending',
      newStatus: 'Approved',
      receiptNo: 'REC-5521',
      remarks: 'Approved by Registrar for Examiner Duty'
    },
    timestamp: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'aud_3',
    action: AuditActionType.BOOKING_CREATED,
    actorId: 'staff_1',
    actorName: 'University Staff (Verified)',
    actorRole: UserRole.STAFF,
    targetId: '2',
    targetType: 'GuestEntry',
    summary: 'Created booking G-2026-002 for Dr. Priya Sundaram in Room 102 (AC Room)',
    details: {
      roomNo: '102',
      roomType: 'AC Room',
      paymentType: 'Departmental',
      budgetHead: 'DST-SERB-QUANTUM-2024'
    },
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: 'aud_4',
    action: AuditActionType.STATUS_UPDATED,
    actorId: 'ADM-001',
    actorName: 'Chief Registrar',
    actorRole: UserRole.ADMIN,
    targetId: '2',
    targetType: 'GuestEntry',
    summary: 'Approved booking G-2026-002 with Receipt REC-5522',
    details: {
      previousStatus: 'Pending',
      newStatus: 'Approved',
      receiptNo: 'REC-5522'
    },
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
  },
  {
    id: 'aud_5',
    action: AuditActionType.BOOKING_CREATED,
    actorId: 'guest_1',
    actorName: 'General Guest User',
    actorRole: UserRole.OUTSIDER,
    targetId: '3',
    targetType: 'GuestEntry',
    summary: 'Created booking G-2026-003 for Rahul Verma in Room 103 (AC Room)',
    details: {
      roomNo: '103',
      roomType: 'AC Room',
      paymentType: 'Personal',
      totalAmount: 1000
    },
    timestamp: new Date(Date.now() - 3600000).toISOString()
  }
];


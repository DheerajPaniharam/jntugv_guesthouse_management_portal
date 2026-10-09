export const UserRole = {
    STUDENT: 'Student',
    STAFF: 'Staff',
    OUTSIDER: 'Outsider',
    ADMIN: 'Admin'
};

export const EntryStatus = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected'
};

export const PaymentType = {
    PERSONAL: 'Personal',
    DEPARTMENTAL: 'Departmental'
};

export const PaymentStatus = {
    PENDING: 'Pending',
    PAID: 'Paid',
    FAILED: 'Failed',
    REFUNDED: 'Refunded'
};

export const AuditActionType = {
    BOOKING_CREATED: 'BOOKING_CREATED',
    STATUS_UPDATED: 'STATUS_UPDATED',
    ROOM_REASSIGNED: 'ROOM_REASSIGNED',
    TARIFF_OVERRIDDEN: 'TARIFF_OVERRIDDEN',
    STAFF_VERIFIED: 'STAFF_VERIFIED',
    CONFIG_UPDATED: 'CONFIG_UPDATED',
    ENTRY_DELETED: 'ENTRY_DELETED',
    USER_REGISTERED: 'USER_REGISTERED',
    PAYMENT_PROCESSED: 'PAYMENT_PROCESSED'
};

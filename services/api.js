
import axios from 'axios';
import { EntryStatus, UserRole, PaymentType, PaymentStatus, AuditActionType } from '../types';
import { INITIAL_ADMINS, mockEntries, MOCK_USER_ACCOUNTS, MOCK_AUDIT_LOGS } from './mockData';

const IS_PROD = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const BASE_URL = IS_PROD
  ? `${window.location.origin}/api`
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

// Add interceptor to include token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const JNTUGV_LOGO = "/logo.png";

const DEFAULT_CONFIG = {
  logo: JNTUGV_LOGO,
  mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3793.2844883460833!2d83.3732049751804!3d18.05837698294979!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a3be373b9e4a8bb%3A0x6a2c5a08aa0d4b9b!2sJNTU-GV%20College%20of%20Engineering%20Vizianagaram!5e0!3m2!1sen!2sin!4v1710920000000!5m2!1sen!2sin",
  universityName: "Jawaharlal Nehru Technological University Gurajada Vizianagaram",
  teluguName: "జవహర్‌లాల్ నెహ్రూ సాంకేతిక విశ్వవిద్యాలయం గురజాడ విజయనగరం",
  universityAddress: "NH 43, Dwarapudi, Vizianagaram, Andhra Pradesh - 535003, India",
  shortName: "JNTU-GV",
  tagline: "Established by Andhra Pradesh Act No. 22 of 2021",
  // Registrar Block
  registrarTitle: "Registrar Peshi, JNTU-GV",
  registrarPhone: "08922 294316",
  registrarEmail1: "registrarpeshi@jntugv.edu.in",
  registrarEmail2: "pa2registrarjntugv@gmail.com"
};

export const DEFAULT_ROOMS = [
  { id: '101', roomNumber: '101', name: 'Room 101', type: 'AC Room', capacity: 2, baseTariff: 500.00, isActive: true },
  { id: '102', roomNumber: '102', name: 'Room 102', type: 'AC Room', capacity: 2, baseTariff: 500.00, isActive: true },
  { id: '103', roomNumber: '103', name: 'Room 103', type: 'AC Room', capacity: 2, baseTariff: 500.00, isActive: true },
  { id: '104', roomNumber: '104', name: 'Room 104', type: 'AC Room', capacity: 2, baseTariff: 500.00, isActive: true },
  { id: '105', roomNumber: '105', name: 'Room 105', type: 'AC Room', capacity: 2, baseTariff: 500.00, isActive: true },
  { id: '106', roomNumber: '106', name: 'Room 106', type: 'AC Room', capacity: 2, baseTariff: 500.00, isActive: true },
];

const getLocal = (key) => JSON.parse(localStorage.getItem(key) || 'null');
const setLocal = (key, val) => localStorage.setItem(key, JSON.stringify(val));

// Initialize local "database" nodes
if (!localStorage.getItem('guest_entries') || getLocal('guest_entries').length === 0) setLocal('guest_entries', mockEntries);
if (!localStorage.getItem('registered_users') || getLocal('registered_users').length === 0) {
  setLocal('registered_users', MOCK_USER_ACCOUNTS);
}
if (!localStorage.getItem('portal_system_config')) setLocal('portal_system_config', DEFAULT_CONFIG);
if (!localStorage.getItem('audit_logs') || getLocal('audit_logs').length === 0) {
  setLocal('audit_logs', MOCK_AUDIT_LOGS);
}
if (!localStorage.getItem('portal_rooms') || getLocal('portal_rooms').length === 0) {
  setLocal('portal_rooms', DEFAULT_ROOMS);
}

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

/**
 * Distinguishes true network downtime / server-down from real backend HTTP errors.
 * Returns true ONLY when client is offline or server failed to respond at network layer.
 */
export const isNetworkOrOfflineError = (error) => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (!error.response && (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.message?.includes('Network Error'))) {
    return true;
  }
  return false;
};

const handleApiError = (error, fallbackFn) => {
  if (isNetworkOrOfflineError(error)) {
    console.warn('⚡ Network offline / Server unreachable. Engaging local fallback node:', error.message);
    return fallbackFn();
  }
  const message = error.response?.data?.message || error.message || 'Institutional server operation failed.';
  const err = new Error(message);
  err.response = error.response;
  err.status = error.response?.status;
  throw err;
};

export const roomApi = {
  getAll: async (all = false) => {
    try {
      const { data } = await api.get(`/rooms${all ? '?all=true' : ''}`);
      return data;
    } catch (e) {
      return handleApiError(e, () => {
        const rooms = getLocal('portal_rooms') || DEFAULT_ROOMS;
        return all ? rooms : rooms.filter(r => r.isActive !== false);
      });
    }
  },
  getById: async (id) => {
    try {
      const { data } = await api.get(`/rooms/${id}`);
      return data;
    } catch (e) {
      return handleApiError(e, () => {
        const rooms = getLocal('portal_rooms') || DEFAULT_ROOMS;
        return rooms.find(r => r.id === id || r.roomNumber === id);
      });
    }
  },
  create: async (roomData) => {
    try {
      const { data } = await api.post('/rooms', roomData);
      return data;
    } catch (e) {
      return handleApiError(e, () => {
        const rooms = getLocal('portal_rooms') || DEFAULT_ROOMS;
        const newRoom = {
          id: roomData.roomNumber || String(Date.now()),
          roomNumber: String(roomData.roomNumber),
          name: roomData.name || `Room ${roomData.roomNumber}`,
          type: roomData.type || 'AC Room',
          capacity: Number(roomData.capacity) || 2,
          baseTariff: Number(roomData.baseTariff) || 500,
          isActive: roomData.isActive !== false,
          description: roomData.description || ''
        };
        setLocal('portal_rooms', [...rooms, newRoom]);
        return newRoom;
      });
    }
  },
  update: async (id, roomData) => {
    try {
      const { data } = await api.put(`/rooms/${id}`, roomData);
      return data;
    } catch (e) {
      return handleApiError(e, () => {
        const rooms = getLocal('portal_rooms') || DEFAULT_ROOMS;
        const updated = rooms.map(r => (r.id === id || r.roomNumber === id) ? { ...r, ...roomData } : r);
        setLocal('portal_rooms', updated);
        return updated.find(r => r.id === id || r.roomNumber === id);
      });
    }
  },
  delete: async (id) => {
    try {
      const { data } = await api.delete(`/rooms/${id}`);
      return data;
    } catch (e) {
      return handleApiError(e, () => {
        const rooms = getLocal('portal_rooms') || DEFAULT_ROOMS;
        const updated = rooms.filter(r => r.id !== id && r.roomNumber !== id);
        setLocal('portal_rooms', updated);
        return { message: 'Room removed locally.' };
      });
    }
  }
};

export const auditApi = {
  getAll: async () => {
    try {
      const { data } = await api.get('/audit');
      return data;
    } catch (e) {
      return handleApiError(e, () => getLocal('audit_logs') || []);
    }
  },
  getByTargetId: async (targetId) => {
    try {
      const { data } = await api.get(`/audit/target/${targetId}`);
      return data;
    } catch (e) {
      return handleApiError(e, () => {
        const logs = getLocal('audit_logs') || [];
        return logs.filter(l => l.targetId === targetId);
      });
    }
  },
  logAction: async ({ action, actor, targetId, targetType = 'GuestEntry', summary, details }) => {
    const user = actor || getLocal('user') || { id: 'ADM-001', name: 'Chief Registrar', role: UserRole.ADMIN };
    const newLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      action,
      actorId: user.id || 'ANONYMOUS',
      actorName: user.name || user.email || 'System User',
      actorRole: user.role || 'Guest',
      targetId: targetId || null,
      targetType,
      summary: summary || `Action ${action} executed`,
      details: details || {},
      timestamp: new Date().toISOString()
    };
    try {
      await api.post('/audit', newLog);
    } catch (e) {
      const logs = getLocal('audit_logs') || [];
      setLocal('audit_logs', [newLog, ...logs]);
    }
    return newLog;
  }
};

export const configApi = {
  get: () => {
    const saved = getLocal('portal_system_config');
    if (!saved) return DEFAULT_CONFIG;
    if (!saved.logo || saved.logo.includes('jntugv.png') || saved.logo.includes('placehold.jp')) {
      saved.logo = '/logo.png';
    }
    return saved;
  },
  update: async (newConfig) => {
    setLocal('portal_system_config', newConfig);
    localStorage.setItem('university_custom_logo', newConfig.logo);
    localStorage.setItem('university_map_url', newConfig.mapUrl);
    auditApi.logAction({
      action: AuditActionType.CONFIG_UPDATED,
      summary: 'Institutional portal branding and system parameters updated',
      details: { shortName: newConfig.shortName, universityName: newConfig.universityName }
    }).catch(console.error);
    return newConfig;
  }
};

export const guestApi = {
  getAll: async () => {
    try {
      const { data } = await api.get('/guests');
      return data;
    } catch (e) {
      return handleApiError(e, () => getLocal('guest_entries') || []);
    }
  },
  getById: async (id) => {
    try {
      const { data } = await api.get(`/guests/${id}`);
      return data;
    } catch (e) {
      return handleApiError(e, async () => {
        const all = await guestApi.getAll();
        return all.find(e => e.id === id);
      });
    }
  },
  create: async (formData) => {
    try {
      const isFormData = typeof FormData !== 'undefined' && formData instanceof FormData;
      const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
      const { data } = await api.post('/guests', formData, config);
      auditApi.logAction({
        action: AuditActionType.BOOKING_CREATED,
        targetId: data.id,
        summary: `Created booking ${data.slNo} for ${data.guestName} in Room ${data.roomNo} (AC Room)`,
        details: { roomNo: data.roomNo, category: data.category, paymentType: data.paymentType, totalAmount: data.totalAmount }
      }).catch(console.error);
      return data;
    } catch (e) {
      return handleApiError(e, async () => {
        const entries = getLocal('guest_entries') || [];
        const newEntry = {};
        if (typeof FormData !== 'undefined' && formData instanceof FormData) {
          for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
              newEntry[key] = await fileToBase64(value);
            } else {
              newEntry[key] = value;
            }
          }
        } else {
          Object.assign(newEntry, formData);
        }
        const entry = {
          ...newEntry,
          id: Math.random().toString(36).substr(2, 9),
          slNo: `G-${new Date().getFullYear()}-${(entries.length + 1).toString().padStart(3, '0')}`,
          status: EntryStatus.PENDING,
          createdAt: new Date().toISOString(),
          totalAmount: Number(newEntry.totalAmount || 0),
          numDays: Number(newEntry.numDays || 0),
          roomType: 'AC Room'
        };
        const updated = [entry, ...entries];
        setLocal('guest_entries', updated);
        auditApi.logAction({
          action: AuditActionType.BOOKING_CREATED,
          targetId: entry.id,
          summary: `Created booking ${entry.slNo} for ${entry.guestName} in Room ${entry.roomNo} (AC Room)`,
          details: {
            roomNo: entry.roomNo,
            category: entry.category,
            paymentType: entry.paymentType || PaymentType.PERSONAL,
            budgetHead: entry.budgetHead || null,
            totalAmount: entry.totalAmount
          }
        }).catch(console.error);
        return entry;
      });
    }
  },
  update: async (id, update) => {
    return guestApi.updateEntry(id, update);
  },
  updateEntry: async (id, update) => {
    try {
      const isFormData = typeof FormData !== 'undefined' && update instanceof FormData;
      const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
      const { data } = await api.put(`/guests/${id}`, update, config);
      auditApi.logAction({
        action: AuditActionType.STATUS_UPDATED,
        targetId: id,
        summary: `Updated registration record for ${data.guestName || id}`,
        details: { roomNo: data.roomNo, status: data.status }
      }).catch(console.error);
      return data;
    } catch (e) {
      return handleApiError(e, () => {
        const entries = getLocal('guest_entries') || [];
        const updated = entries.map((e) => e.id === id ? { ...e, ...update } : e);
        setLocal('guest_entries', updated);
        return updated.find((e) => e.id === id);
      });
    }
  },
  updateStatus: async (id, status, adminData) => {
    const existing = await guestApi.getById(id);
    const result = await guestApi.updateEntry(id, { status, ...adminData });
    auditApi.logAction({
      action: AuditActionType.STATUS_UPDATED,
      targetId: id,
      summary: `Updated status of ${existing?.slNo || id} to ${status}${adminData?.receiptNo ? ` (Receipt: ${adminData.receiptNo})` : ''}`,
      details: {
        previousStatus: existing?.status,
        newStatus: status,
        receiptNo: adminData?.receiptNo,
        remarks: adminData?.remarks
      }
    }).catch(console.error);
    return result;
  },
  submitFeedback: async (feedback) => {
    try {
      await api.post('/guests/feedback', feedback);
      return true;
    } catch (e) {
      return handleApiError(e, () => {
        const fbs = getLocal('feedbacks') || [];
        setLocal('feedbacks', [...fbs, { ...feedback, id: Date.now().toString(), createdAt: new Date().toISOString() }]);
        return true;
      });
    }
  },
  getFeedbacks: async () => {
    try {
      const { data } = await api.get('/guests/feedback');
      return data;
    } catch (e) {
      return handleApiError(e, () => getLocal('feedbacks') || []);
    }
  }
};

export const authApi = {
  getPersistenceMode: () => IS_PROD ? 'CLOUD' : 'LOCAL',
  login: async (credential, pass) => {
    try {
      const { data } = await api.post('/auth/login', { login: credential, password: pass });
      return data;
    } catch (e) {
      return handleApiError(e, () => {
        const adminMatch = INITIAL_ADMINS.find(a => a.id === credential && a.password === pass);
        if (adminMatch) {
          return {
            token: 'mock-jwt-token',
            user: { id: adminMatch.id, name: adminMatch.name, email: 'admin@university.edu', role: UserRole.ADMIN, isVerified: true }
          };
        }
        const users = getLocal('registered_users') || [];
        const userMatch = users.find((u) => (u.email === credential || u.id === credential) && u.password === pass);
        if (userMatch) {
          return {
            token: 'mock-jwt-token',
            user: { id: userMatch.id, name: userMatch.name, email: userMatch.email, role: userMatch.role, contactNumber: userMatch.contactNumber, isVerified: userMatch.isVerified }
          };
        }
        throw new Error("Invalid institutional credentials.");
      });
    }
  },
  forgotPassword: async (email) => {
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      return data;
    } catch (e) {
      return handleApiError(e, () => {
        const users = getLocal('registered_users') || [];
        const userMatch = users.find((u) => u.email === email);
        if (userMatch) return { message: 'MOCK RECOVERY: Link would be sent in prod.' };
        throw new Error("No account found.");
      });
    }
  },
  sendOtp: async (target, type = 'email') => {
    try {
      const { data } = await api.post('/auth/send-otp', { target, type });
      return data;
    } catch (e) {
      return handleApiError(e, () => {
        const array = new Uint32Array(1);
        window.crypto.getRandomValues(array);
        const mockOtp = (100000 + (array[0] % 900000)).toString();
        const otps = getLocal('active_otps') || {};
        otps[target.toLowerCase()] = { otp: mockOtp, expiresAt: Date.now() + 10 * 60 * 1000 };
        setLocal('active_otps', otps);
        return { success: true, message: `Verification code sent to ${type}.`, mockOtp };
      });
    }
  },
  verifyOtp: async (target, otp, type = 'email') => {
    try {
      const { data } = await api.post('/auth/verify-otp', { target, otp, type });
      return data;
    } catch (e) {
      return handleApiError(e, () => {
        const otps = getLocal('active_otps') || {};
        const record = otps[target.toLowerCase()];
        if (record && record.otp === otp.trim() && Date.now() <= record.expiresAt) {
          delete otps[target.toLowerCase()];
          setLocal('active_otps', otps);
          return { success: true, message: 'Verified successfully.' };
        }
        throw new Error("Invalid or expired verification code.");
      });
    }
  },
  resetPassword: async (token, password) => {
    try {
      const { data } = await api.post(`/auth/reset-password/${token}`, { password });
      return data;
    } catch (e) {
      return handleApiError(e, () => {
        const users = getLocal('registered_users') || [];
        if (token === 'mock-token' && users.length > 0) {
          users[0].password = password;
          setLocal('registered_users', users);
          return { message: 'Password reset successful.' };
        }
        throw new Error("Invalid token.");
      });
    }
  },
  register: async (formData) => {
    try {
      const { data } = await api.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return data;
    } catch (e) {
      return handleApiError(e, async () => {
        const users = getLocal('registered_users') || [];
        const newUser = {};
        for (const [key, value] of formData.entries()) {
          if (value instanceof File) {
            newUser[key] = await fileToBase64(value);
          } else {
            newUser[key] = value;
          }
        }
        const isPrivileged = newUser.role === UserRole.STAFF || newUser.role === UserRole.ADMIN;
        const user = {
          ...newUser,
          id: Math.random().toString(36).substr(2, 9),
          isVerified: !isPrivileged
        };
        setLocal('registered_users', [...users, user]);
        return { token: 'mock-jwt-token', user };
      });
    }
  },
  updatePassword: async (userId, currentPass, newPass) => {
    try {
      await api.put(`/auth/password/${userId}`, { currentPass, newPass });
      return true;
    } catch (e) {
      return handleApiError(e, () => {
        const users = getLocal('registered_users') || [];
        const updated = users.map((u) => u.id === userId ? { ...u, password: newPass } : u);
        setLocal('registered_users', updated);
        return true;
      });
    }
  },
  getPendingStaff: async () => {
    try {
      const { data } = await api.get('/auth/pending-staff');
      return data;
    } catch (e) {
      return handleApiError(e, () => {
        const users = getLocal('registered_users') || [];
        return users.filter((u) => u.role === UserRole.STAFF && !u.isVerified);
      });
    }
  },
  updateVerificationStatus: async (userId, isVerified) => {
    try {
      await api.put(`/auth/verify/${userId}`, { isVerified });
    } catch (e) {
      handleApiError(e, () => {
        const users = getLocal('registered_users') || [];
        const updated = users.map((u) => u.id === userId ? { ...u, isVerified } : u);
        setLocal('registered_users', updated);
      });
    }
    const targetUser = (getLocal('registered_users') || []).find(u => u.id === userId);
    auditApi.logAction({
      action: AuditActionType.STAFF_VERIFIED,
      targetId: userId,
      targetType: 'User',
      summary: `${isVerified ? 'Approved institutional clearance' : 'Revoked clearance'} for staff member ${targetUser?.name || targetUser?.email || userId}`,
      details: { userId, isVerified, email: targetUser?.email }
    }).catch(console.error);
    return true;
  },
  deleteUser: async (userId) => {
    try {
      await api.delete(`/auth/user/${userId}`);
      return true;
    } catch (e) {
      return handleApiError(e, () => {
        const users = getLocal('registered_users') || [];
        const updated = users.filter((u) => u.id !== userId);
        setLocal('registered_users', updated);
        return true;
      });
    }
  },
  verifyAdmin: async (adminId, pass) => {
    try {
      const { data } = await api.post('/auth/verify-admin', { adminId, password: pass });
      return data.isValid;
    } catch (e) {
      return handleApiError(e, () => {
        return INITIAL_ADMINS.some(a => a.id === adminId && a.password === pass);
      });
    }
  },
};

export const notificationApi = {
  getAll: async () => {
    try {
      const { data } = await api.get('/notifications');
      return data;
    } catch (e) {
      return handleApiError(e, () => getLocal('notifications') || []);
    }
  },
  markAsRead: async (id) => {
    try {
      const { data } = await api.put(`/notifications/${id}/read`);
      return data;
    } catch (e) {
      return handleApiError(e, () => {
        const notifs = getLocal('notifications') || [];
        const updated = notifs.map(n => n.id === id ? { ...n, isRead: true } : n);
        setLocal('notifications', updated);
        return updated.find(n => n.id === id);
      });
    }
  },
  markAllAsRead: async () => {
    try {
      const { data } = await api.put('/notifications/read-all');
      return data;
    } catch (e) {
      return handleApiError(e, () => {
        const notifs = getLocal('notifications') || [];
        const updated = notifs.map(n => ({ ...n, isRead: true }));
        setLocal('notifications', updated);
        return { message: 'All marked read local' };
      });
    }
  }
};

export const paymentApi = {
  getConfig: async () => {
    try {
      const { data } = await api.get('/payments/config');
      return data;
    } catch (e) {
      return handleApiError(e, () => ({
        keyId: 'rzp_test_jntugv_sandbox',
        isSandbox: true,
        currency: 'INR',
        merchantName: 'JNTU-GV Guest House Estate Desk',
        supportedMethods: ['UPI', 'CARDS', 'NETBANKING', 'QR']
      }));
    }
  },
  createOrder: async (orderData) => {
    try {
      const { data } = await api.post('/payments/create-order', orderData);
      return data;
    } catch (e) {
      return handleApiError(e, () => {
        const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
        return {
          orderId,
          amount: parseFloat(orderData.amount || 0),
          currency: 'INR',
          keyId: 'rzp_test_jntugv_sandbox',
          isSandbox: true
        };
      });
    }
  },
  verifyPayment: async (verifyData) => {
    try {
      const { data } = await api.post('/payments/verify', verifyData);
      return data;
    } catch (e) {
      return handleApiError(e, async () => {
        const generatedPaymentId = verifyData.paymentId || `pay_jntugv_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
        const officialReceiptNo = `REC-${Date.now().toString().slice(-4)}`;
        const officialReceiptDate = new Date().toISOString().split('T')[0];

        if (verifyData.bookingId) {
          const entries = getLocal('guest_entries') || [];
          const updated = entries.map(entry => {
            if (entry.id === verifyData.bookingId) {
              return {
                ...entry,
                paymentStatus: PaymentStatus.PAID,
                paymentMethod: verifyData.paymentMethod || 'UPI',
                transactionId: generatedPaymentId,
                paymentOrderId: verifyData.orderId,
                paidAt: new Date().toISOString(),
                receiptNo: entry.receiptNo || officialReceiptNo,
                receiptDate: entry.receiptDate || officialReceiptDate
              };
            }
            return entry;
          });
          setLocal('guest_entries', updated);

          auditApi.logAction({
            action: AuditActionType.PAYMENT_PROCESSED,
            targetId: verifyData.bookingId,
            summary: `Online payment settled via ${verifyData.paymentMethod || 'UPI'} (${generatedPaymentId})`,
            details: {
              orderId: verifyData.orderId,
              paymentId: generatedPaymentId,
              paymentMethod: verifyData.paymentMethod || 'UPI',
              paymentStatus: PaymentStatus.PAID
            }
          }).catch(console.error);
        }

        return {
          success: true,
          message: 'Payment verified and settled (offline node).',
          paymentId: generatedPaymentId,
          orderId: verifyData.orderId,
          receiptNo: officialReceiptNo,
          receiptDate: officialReceiptDate,
          paymentStatus: PaymentStatus.PAID,
          paymentMethod: verifyData.paymentMethod || 'UPI',
          transactionId: generatedPaymentId,
          paidAt: new Date().toISOString()
        };
      });
    }
  },
  getHistory: async () => {
    try {
      const { data } = await api.get('/payments/history');
      return data;
    } catch (e) {
      return handleApiError(e, () => getLocal('payment_history') || []);
    }
  }
};


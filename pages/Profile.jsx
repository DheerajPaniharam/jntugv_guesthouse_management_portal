import React, { useState } from 'react';
import { useAuth } from '../App';
import { UserRole } from '../types';
import { authApi } from '../services/api';
import OtpModal from '../components/OtpModal';

const Profile = () => {
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [emailVerified, setEmailVerified] = useState(true);
  const [phoneVerified, setPhoneVerified] = useState(true);
  const [otpModal, setOtpModal] = useState({ isOpen: false, target: '', type: 'email' });
  const [fieldErrors, setFieldErrors] = useState({});

  const [passData, setPassData] = useState({ current: '', new: '', confirm: '' });
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState(null);
  const [securitySuccess, setSecuritySuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    contactNumber: user?.contactNumber || '',
    role: user?.role || UserRole.STUDENT
  });

  const handleOpenOtp = (type) => {
    if (type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setFieldErrors(prev => ({ ...prev, email: 'Please enter a valid email address.' }));
        return;
      }
      setFieldErrors(prev => ({ ...prev, email: '' }));
      setOtpModal({ isOpen: true, target: formData.email, type: 'email' });
    } else {
      const phoneRegex = /^\+?[1-9]\d{9,14}$/;
      const sanitized = (formData.contactNumber || '').replace(/\s/g, '');
      if (!phoneRegex.test(sanitized)) {
        setFieldErrors(prev => ({ ...prev, phone: 'Please enter a valid phone number.' }));
        return;
      }
      setFieldErrors(prev => ({ ...prev, phone: '' }));
      setOtpModal({ isOpen: true, target: formData.contactNumber, type: 'phone' });
    }
  };

  const handleVerified = (target, type) => {
    if (type === 'email') {
      setEmailVerified(true);
    } else {
      setPhoneVerified(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    login({ ...user, ...formData }, localStorage.getItem('token') || 'token');
    setLoading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passData.new !== passData.confirm) return setSecurityError("Passwords do not match.");
    setSecurityLoading(true);
    const success = await authApi.updatePassword(user?.id || '', passData.current, passData.new);
    if (success) {
      setSecuritySuccess(true);
      setPassData({ current: '', new: '', confirm: '' });
      setTimeout(() => setSecuritySuccess(false), 3000);
    } else setSecurityError("Verification failed. Current password may be incorrect.");
    setSecurityLoading(false);
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-6 space-y-6 animate-fadeIn px-2 sm:px-4">
      
      {/* Page Header */}
      <header className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB] block mb-1">
          Account Settings
        </span>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E5CA8] tracking-tight">
          User Profile
        </h1>
        <p className="text-slate-600 mt-1 font-medium text-xs sm:text-sm">
          JNTU-GV Guest House Management Portal
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Personal Info */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-6 sm:p-8 space-y-6">
            
            {/* User Avatar & Title Info */}
            <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
              <div className="w-16 h-16 rounded-2xl bg-[#1E5CA8] text-white flex items-center justify-center text-2xl font-bold shadow-md flex-shrink-0">
                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-serif font-bold text-[#1E5CA8] tracking-tight">
                  {user?.name || 'User'}
                </h2>
                <span className="inline-block px-2.5 py-0.5 mt-1 rounded-full bg-[#E0F2FE] text-[#0369A1] font-bold text-xs">
                  Role: {user?.role || 'Guest'}
                </span>
              </div>
            </div>

            {/* Profile Edit Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-[#1E5CA8]/20 focus:border-[#1E5CA8] outline-none transition-all placeholder:text-slate-400"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-slate-700 uppercase tracking-wider">
                      Email Address
                    </label>
                    {emailVerified ? (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200">Verified ✓</span>
                    ) : (
                      formData.email.trim() && (
                        <button type="button" onClick={() => handleOpenOtp('email')} className="text-[#1D4ED8] hover:underline font-bold text-[11px]">
                          Verify via OTP
                        </button>
                      )
                    )}
                  </div>
                  <input
                    type="email"
                    placeholder="Enter email"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-[#1E5CA8]/20 focus:border-[#1E5CA8] outline-none transition-all placeholder:text-slate-400"
                    value={formData.email}
                    onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setEmailVerified(false); }}
                  />
                  {fieldErrors.email && <p className="text-[11px] font-semibold text-rose-500 mt-1">{fieldErrors.email}</p>}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-slate-700 uppercase tracking-wider">
                      Contact Number
                    </label>
                    {phoneVerified ? (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200">Verified ✓</span>
                    ) : (
                      formData.contactNumber.trim() && (
                        <button type="button" onClick={() => handleOpenOtp('phone')} className="text-[#1D4ED8] hover:underline font-bold text-[11px]">
                          Verify via OTP
                        </button>
                      )
                    )}
                  </div>
                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-[#1E5CA8]/20 focus:border-[#1E5CA8] outline-none transition-all placeholder:text-slate-400"
                    value={formData.contactNumber}
                    onChange={(e) => { setFormData({ ...formData, contactNumber: e.target.value }); setPhoneVerified(false); }}
                  />
                  {fieldErrors.phone && <p className="text-[11px] font-semibold text-rose-500 mt-1">{fieldErrors.phone}</p>}
                </div>
              </div>

              {success && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold text-center rounded-xl border border-emerald-200 animate-fadeIn">
                  Profile updated successfully.
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1E5CA8] hover:bg-[#2563EB] text-white font-bold text-xs py-3 rounded-xl shadow-md active:scale-98 transition-all"
              >
                {loading ? "Saving Changes..." : "Save Changes"}
              </button>
            </form>

          </div>
        </div>

        {/* Right Column: Security & Password */}
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm text-xs space-y-4">
            <h3 className="text-sm font-serif font-bold text-[#1E5CA8] border-b border-slate-100 pb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span>
              <span>Change Password</span>
            </h3>

            <form onSubmit={handlePasswordUpdate} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-[#1E5CA8]/20 focus:border-[#1E5CA8] outline-none transition-all placeholder:text-slate-400"
                  value={passData.current}
                  onChange={(e) => setPassData({ ...passData, current: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-[#1E5CA8]/20 focus:border-[#1E5CA8] outline-none transition-all placeholder:text-slate-400"
                  value={passData.new}
                  onChange={(e) => setPassData({ ...passData, new: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Confirm new password"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-[#1E5CA8]/20 focus:border-[#1E5CA8] outline-none transition-all placeholder:text-slate-400"
                  value={passData.confirm}
                  onChange={(e) => setPassData({ ...passData, confirm: e.target.value })}
                />
              </div>

              {securitySuccess && <p className="text-xs font-bold text-emerald-600 text-center animate-fadeIn">Password updated successfully.</p>}
              {securityError && <p className="text-xs font-bold text-rose-600 text-center animate-fadeIn">{securityError}</p>}

              <button
                type="submit"
                disabled={securityLoading}
                className="w-full bg-[#1E5CA8] hover:bg-[#2563EB] text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-sm active:scale-98"
              >
                {securityLoading ? "Processing..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>

      </div>

      <OtpModal
        isOpen={otpModal.isOpen}
        onClose={() => setOtpModal(prev => ({ ...prev, isOpen: false }))}
        target={otpModal.target}
        type={otpModal.type}
        onVerified={handleVerified}
      />
    </div>
  );
};

export default Profile;

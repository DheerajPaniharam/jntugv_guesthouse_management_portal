import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useConfig } from '../App';
import { UserRole } from '../types';
import { authApi } from '../services/api';
import OtpModal from '../components/OtpModal';

const FALLBACK_LOGO = "/logo.png";

const Register = () => {
  const { login } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactNumber: '',
    password: '',
    confirmPassword: '',
    role: UserRole.STUDENT,
  });

  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpModal, setOtpModal] = useState({ isOpen: false, target: '', type: 'email' });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [idFile, setIdFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Enter a valid email address.";
    return null;
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    const sanitized = phone.replace(/\s/g, '');
    if (!phoneRegex.test(sanitized)) return "Enter a valid mobile number.";
    return null;
  };

  const handleOpenOtp = (type) => {
    if (type === 'email') {
      const err = validateEmail(formData.email);
      if (err) {
        setErrors(prev => ({ ...prev, email: err }));
        return;
      }
      setErrors(prev => ({ ...prev, email: '' }));
      setOtpModal({ isOpen: true, target: formData.email, type: 'email' });
    } else {
      const err = validatePhone(formData.contactNumber);
      if (err) {
        setErrors(prev => ({ ...prev, contactNumber: err }));
        return;
      }
      setErrors(prev => ({ ...prev, contactNumber: '' }));
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

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    setErrors(prev => ({ ...prev, idProof: '' }));

    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }

    if (file) {
      if (file.size > 500 * 1024) {
        setErrors(prev => ({ ...prev, idProof: 'File exceeds 500KB limit.' }));
        setIdFile(null);
        setPreview(null);
        e.target.value = '';
      } else {
        setIdFile(file);
        try {
          const objectUrl = URL.createObjectURL(file);
          setPreview(objectUrl);
        } catch (err) {
          console.error("Failed to create preview URL:", err);
          setPreview(null);
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const emailErr = validateEmail(formData.email);
    if (emailErr) { setErrors({ email: emailErr }); setLoading(false); return; }

    const phoneErr = validatePhone(formData.contactNumber);
    if (phoneErr) { setErrors({ contactNumber: phoneErr }); setLoading(false); return; }

    if (formData.password.length < 6) { setErrors({ password: 'Minimum 6 characters required' }); setLoading(false); return; }
    if (formData.password !== formData.confirmPassword) { setErrors({ confirmPassword: 'Passwords do not match' }); setLoading(false); return; }
    if (!idFile) { setErrors({ idProof: 'Identity document is mandatory for verification.' }); setLoading(false); return; }

    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([k, v]) => payload.append(k, String(v)));
      if (idFile) payload.append('idProof', idFile);

      const { user, token } = await authApi.register(payload);
      login(user, token);
      navigate('/dashboard');
    } catch (err) {
      setErrors({ global: err.response?.data?.message || "Enrolment failed. Please check your data." });
    } finally {
      setLoading(false);
    }
  };

  const PasswordToggleIcon = ({ show }) => (
    show ? (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ) : (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
      </svg>
    )
  );

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-xl">
        <div className="bg-white p-8 sm:p-10 rounded-2xl border-2 border-slate-200 shadow-2xl relative overflow-hidden">
          {/* Top Blue Accent Strip */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#1E5CA8] via-[#2563EB] to-[#3B82F6]"></div>

          <div className="text-center mb-6 pt-2">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white mb-3 shadow-md border-2 border-[#1E5CA8] ring-2 ring-blue-200 p-1 overflow-hidden">
              <img
                src={config.logo || "/logo.png"}
                alt="JNTU-GV Crest"
                className="w-full h-full object-contain"
                onError={(e) => { e.currentTarget.src = FALLBACK_LOGO; }}
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1E5CA8] font-serif tracking-tight">
              JNTU-GV VIZIANAGARAM
            </h1>
            <p className="text-xs font-bold text-[#2563EB] uppercase tracking-widest mt-1">
              Guest House Management Portal
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">Identity Classification <span className="text-rose-500">*</span></label>
                <select
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#1E5CA8]/20 focus:border-[#1E5CA8] transition-all"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value={UserRole.STUDENT}>Research Scholar / Student</option>
                  <option value={UserRole.STAFF}>University Faculty / Staff</option>
                  <option value={UserRole.OUTSIDER}>Official Guest / Parent / Visitor</option>
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">Full Official Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Enter full name"
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-lg font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all ${errors.name ? 'border-rose-500' : 'border-slate-300 focus:ring-2 focus:ring-[#1E5CA8]/20 focus:border-[#1E5CA8]'}`}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold uppercase tracking-wider text-slate-700">Official Email <span className="text-rose-500">*</span></label>
                  {emailVerified ? (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200">Verified ✓</span>
                  ) : (
                    formData.email.trim() && (
                      <button type="button" onClick={() => handleOpenOtp('email')} className="text-[#2563EB] hover:underline font-bold text-[11px]">
                        Verify via OTP
                      </button>
                    )
                  )}
                </div>
                <input
                  type="email"
                  required
                  placeholder="Enter email"
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-lg font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all ${errors.email ? 'border-rose-500' : 'border-slate-300 focus:ring-2 focus:ring-[#1E5CA8]/20 focus:border-[#1E5CA8]'}`}
                  value={formData.email}
                  onChange={e => { setFormData({ ...formData, email: e.target.value }); setEmailVerified(false); }}
                />
                {errors.email && <p className="text-[11px] font-semibold text-rose-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold uppercase tracking-wider text-slate-700">Contact Number <span className="text-rose-500">*</span></label>
                  {phoneVerified ? (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200">Verified ✓</span>
                  ) : (
                    formData.contactNumber.trim() && (
                      <button type="button" onClick={() => handleOpenOtp('phone')} className="text-[#2563EB] hover:underline font-bold text-[11px]">
                        Verify via OTP
                      </button>
                    )
                  )}
                </div>
                <input
                  type="tel"
                  required
                  placeholder="Enter phone number"
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-lg font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all ${errors.contactNumber ? 'border-rose-500' : 'border-slate-300 focus:ring-2 focus:ring-[#1E5CA8]/20 focus:border-[#1E5CA8]'}`}
                  value={formData.contactNumber}
                  onChange={e => { setFormData({ ...formData, contactNumber: e.target.value }); setPhoneVerified(false); }}
                />
                {errors.contactNumber && <p className="text-[11px] font-semibold text-rose-500 mt-1">{errors.contactNumber}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="group">
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">Access Password <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter password"
                    className={`w-full px-3.5 py-2.5 bg-white border rounded-lg font-bold pr-10 text-slate-900 placeholder:text-slate-400 outline-none transition-all ${errors.password ? 'border-rose-500' : 'border-slate-300 focus:ring-2 focus:ring-[#1E5CA8]/20 focus:border-[#1E5CA8]'}`}
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  >
                    <PasswordToggleIcon show={showPassword} />
                  </button>
                </div>
                {errors.password && <p className="text-[11px] font-semibold text-rose-500 mt-1">{errors.password}</p>}
              </div>
              <div className="group">
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">Confirm Password <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="Confirm password"
                    className={`w-full px-3.5 py-2.5 bg-white border rounded-lg font-bold pr-10 text-slate-900 placeholder:text-slate-400 outline-none transition-all ${errors.confirmPassword ? 'border-rose-500' : 'border-slate-300 focus:ring-2 focus:ring-[#1E5CA8]/20 focus:border-[#1E5CA8]'}`}
                    value={formData.confirmPassword}
                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  >
                    <PasswordToggleIcon show={showConfirmPassword} />
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-[11px] font-semibold text-rose-500 mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>

            <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${errors.idProof ? 'border-rose-500 bg-rose-50' : 'border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/20'}`}>
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*" />
              {preview ? (
                <div className="space-y-1">
                  <img src={preview} className="h-12 mx-auto rounded shadow border border-slate-200" alt="Preview" />
                  <p className="text-xs font-bold text-emerald-700">Document Attached ({(idFile?.size ? idFile.size / 1024 : 0).toFixed(1)} KB)</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-[#1E5CA8]">Upload {formData.role === UserRole.OUTSIDER ? 'Govt ID Proof' : 'Institutional Faculty / Student ID'} <span className="text-rose-500">*</span></p>
                  <p className="text-[11px] text-slate-500 font-medium">JPEG / PNG • Maximum size 500KB</p>
                </div>
              )}
              {errors.idProof && <p className="text-xs font-semibold text-rose-500 mt-1">{errors.idProof}</p>}
            </div>

            {errors.global && <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700 text-center">{errors.global}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1E5CA8] hover:bg-[#2563EB] text-white font-bold py-3 rounded-lg text-sm shadow-md active:scale-[0.99] transition-all disabled:opacity-50 mt-2"
            >
              {loading ? "Registering Institutional Record..." : "Complete Enrolment"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-200 text-center">
            <Link to="/login" className="text-xs font-bold text-[#1E5CA8] hover:underline">Already have an account? Sign In</Link>
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

export default Register;

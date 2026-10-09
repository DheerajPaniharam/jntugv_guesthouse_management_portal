import React, { useState, useEffect } from 'react';
import { authApi } from '../services/api';

const OtpModal = ({ isOpen, onClose, target, type = 'email', onVerified }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [timer, setTimer] = useState(30);
  const [hintOtp, setHintOtp] = useState(null);

  useEffect(() => {
    if (isOpen && target) {
      setOtp('');
      setError(null);
      setInfo(null);
      setHintOtp(null);
      setTimer(30);
      handleSendOtp();
    }
  }, [isOpen, target]);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSendOtp = async () => {
    if (!target) return;
    setSending(true);
    setError(null);
    try {
      const res = await authApi.sendOtp(target, type);
      setInfo(`Verification code dispatched to your ${type === 'email' ? 'email address' : 'phone number'}.`);
      if (res?.mockOtp) {
        setHintOtp(res.mockOtp);
      }
      setTimer(30);
    } catch (err) {
      setError(err.message || 'Failed to dispatch verification code.');
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    if (!otp || otp.length < 4) {
      setError('Please enter a valid verification code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authApi.verifyOtp(target, otp, type);
      if (onVerified) onVerified(target, type);
      onClose();
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1E5CA8] via-[#2563EB] to-[#1D4ED8] p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <div className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto mb-2 text-xl font-bold shadow-md">
            {type === 'email' ? '✉️' : '📱'}
          </div>
          <h3 className="text-lg font-serif font-bold tracking-tight">
            Verify {type === 'email' ? 'Email Address' : 'Phone Number'}
          </h3>
          <p className="text-xs text-slate-200 mt-1 truncate max-w-xs mx-auto">
            Target: <span className="font-bold text-white">{target}</span>
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs">
          
          {info && (
            <div className="p-3 bg-blue-50 text-blue-900 rounded-xl border border-blue-200 text-center font-medium animate-fadeIn">
              {info}
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 text-center font-bold animate-fadeIn">
              {error}
            </div>
          )}

          {hintOtp && (
            <div className="p-3 bg-amber-50 text-amber-900 rounded-xl border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-700 block">Development Code</span>
                <span className="text-sm font-extrabold tracking-wider">{hintOtp}</span>
              </div>
              <button
                type="button"
                onClick={() => setOtp(hintOtp)}
                className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-lg text-[11px] transition-colors"
              >
                Auto-Fill
              </button>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5 text-center">
                Enter 6-Digit Verification Code
              </label>
              <input
                type="text"
                maxLength="6"
                autoFocus
                placeholder="• • • • • •"
                className="w-full text-center tracking-[8px] font-mono text-xl py-3 px-4 bg-white border-2 border-slate-300 rounded-xl focus:border-[#1E5CA8] focus:ring-2 focus:ring-[#1E5CA8]/20 outline-none text-slate-900 font-bold placeholder:text-slate-300 transition-all"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 4}
              className="w-full py-3 bg-[#1E5CA8] hover:bg-[#2563EB] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Confirm & Verify"}
            </button>
          </form>

          {/* Resend Timer */}
          <div className="text-center pt-2">
            {timer > 0 ? (
              <span className="text-slate-400 font-medium">
                Resend code in <strong className="text-slate-600">{timer}s</strong>
              </span>
            ) : (
              <button
                type="button"
                disabled={sending}
                onClick={handleSendOtp}
                className="text-[#2563EB] font-bold hover:underline"
              >
                {sending ? "Sending..." : "Resend Verification Code"}
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default OtpModal;

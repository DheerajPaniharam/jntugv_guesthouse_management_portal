import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useConfig } from '../App';
import { authApi } from '../services/api';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { config } = useConfig();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authApi.resetPassword(token || '', password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message || 'Recovery token expired or invalid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-md">
        <div className="bg-white p-8 rounded-2xl border-t-4 border-t-[#1E5CA8] border border-slate-200 shadow-xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white mb-4 shadow-md border-2 border-slate-200 p-1 overflow-hidden">
              <img
                src={config.logo}
                alt="JNTUGV"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB] block mb-0.5">Guest House Management Portal</span>
            <h1 className="text-xl font-serif font-bold text-[#1E5CA8] tracking-tight">Set New Access Key</h1>
            <p className="text-xs text-slate-500 mt-1">Identity password restoration desk</p>
          </div>

          {error && <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs font-bold text-center rounded-xl border border-rose-200">{error}</div>}
          {success && (
            <div className="mb-4 p-4 bg-emerald-50 text-emerald-800 text-xs font-bold text-center rounded-xl border border-emerald-200">
              Password updated. Redirecting to official login...
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Min. 6 characters"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white font-bold focus:border-[#1E5CA8] outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  required
                  placeholder="Repeat new password"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white font-bold focus:border-[#1E5CA8] outline-none transition-all"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1E5CA8] hover:bg-[#2563EB] text-white font-bold py-3.5 rounded-xl text-xs sm:text-sm shadow-md active:scale-95 disabled:opacity-50 transition-all"
              >
                {loading ? "Updating..." : "Commit Password Change"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

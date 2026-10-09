import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useConfig } from '../App';
import { authApi } from '../services/api';

const ForgotPassword = () => {
  const { config } = useConfig();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await authApi.forgotPassword(email);
      setMessage(response.message || 'Recovery instructions dispatched.');
    } catch (err) {
      setError(err.message || 'Identity verification failed.');
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
            <h1 className="text-xl font-serif font-bold text-[#1E5CA8] tracking-tight">Identity Recovery</h1>
            <p className="text-xs text-slate-500 mt-1">Access key restoration desk</p>
          </div>

          {error && <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs font-bold text-center rounded-xl border border-rose-200">{error}</div>}
          {message && <div className="mb-4 p-3 bg-emerald-50 text-emerald-800 text-xs font-bold text-center rounded-xl border border-emerald-200">{message}</div>}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Registered Email</label>
              <input
                type="email"
                required
                placeholder="Enter your registered email"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white font-bold focus:border-[#1E5CA8] outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1E5CA8] hover:bg-[#2563EB] text-white font-bold py-3.5 rounded-xl text-xs sm:text-sm shadow-md active:scale-95 disabled:opacity-50 transition-all"
            >
              {loading ? "Verifying..." : "Dispatch Recovery Instructions"}
            </button>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <Link to="/login" className="text-xs font-bold text-[#1E5CA8] hover:text-[#2563EB] hover:underline">
                &larr; Return to Official Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

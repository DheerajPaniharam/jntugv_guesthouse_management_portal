import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, useConfig } from '../App';
import { authApi } from '../services/api';

const FALLBACK_LOGO = "/logo.png";

const Login = () => {
  const { login } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();

  const [loginType, setLoginType] = useState('USER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminId, setAdminId] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const savedIdentity = localStorage.getItem('remembered_node_identity');
    if (savedIdentity) {
      if (savedIdentity.includes('@')) {
        setEmail(savedIdentity);
        setLoginType('USER');
      } else {
        setAdminId(savedIdentity);
        setLoginType('ADMIN');
      }
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const isAuthority = loginType === 'ADMIN';
      const credential = isAuthority ? adminId : email;
      const { user, token } = await authApi.login(credential, password);

      if (rememberMe) {
        localStorage.setItem('remembered_node_identity', credential);
      } else {
        localStorage.removeItem('remembered_node_identity');
      }

      login(user, token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const PasswordToggleIcon = ({ show }) => (
    show ? (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
    ) : (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
    )
  );

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-md">
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
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1E5CA8] font-serif tracking-tight uppercase">
              JNTU-GV VIZIANAGARAM
            </h1>
            <p className="text-xs font-bold text-[#2563EB] uppercase tracking-widest mt-1">
              Guest House Management Portal
            </p>
          </div>

          {/* Login Type Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-lg mb-6 border border-slate-200">
            <button
              type="button"
              onClick={() => setLoginType('USER')}
              className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all ${
                loginType === 'USER'
                  ? 'bg-[#1E5CA8] text-white shadow-sm'
                  : 'text-slate-600 hover:text-[#1E5CA8]'
              }`}
            >
              Guest / User
            </button>
            <button
              type="button"
              onClick={() => setLoginType('ADMIN')}
              className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all ${
                loginType === 'ADMIN'
                  ? 'bg-[#1E5CA8] text-white shadow-sm'
                  : 'text-slate-600 hover:text-[#1E5CA8]'
              }`}
            >
              Admin
            </button>
          </div>

          {error && <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs font-semibold text-center rounded-lg border border-rose-200">{error}</div>}
          {success && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-xs font-semibold text-center rounded-lg border border-emerald-200">{success}</div>}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                {loginType === 'USER' ? 'Registered Email' : 'Admin ID'}
              </label>
              <input
                type="text"
                required
                placeholder={loginType === 'USER' ? "Enter email" : "Enter Admin ID"}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#1E5CA8]/20 focus:border-[#1E5CA8] outline-none transition-all placeholder:text-slate-400 font-medium"
                value={loginType === 'USER' ? email : adminId}
                onChange={(e) => loginType === 'USER' ? setEmail(e.target.value) : setAdminId(e.target.value)}
              />
            </div>
            <div className="group">
              <div className="flex justify-between items-center mb-1.5">
                <label className="block font-bold uppercase tracking-wider text-slate-700">Password</label>
                <Link to="/forgot-password" className="text-xs font-semibold text-[#2563EB] hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter password"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#1E5CA8]/20 focus:border-[#1E5CA8] outline-none transition-all pr-12 placeholder:text-slate-400 font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"><PasswordToggleIcon show={showPassword} /></button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center cursor-pointer group w-fit">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-[#1E5CA8] focus:ring-[#1E5CA8]/40 cursor-pointer"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="ml-2 text-xs font-semibold text-slate-600">Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full font-bold py-3 rounded-lg transition-all text-sm bg-[#1E5CA8] hover:bg-[#2563EB] text-white shadow-md active:scale-[0.99] disabled:opacity-50 mt-2"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <div className="mt-6 pt-4 border-t border-slate-200 text-center">
              <span className="text-xs text-slate-600 font-medium">New user? </span>
              <Link to="/register" className="text-xs font-bold text-[#1E5CA8] hover:underline">Register</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

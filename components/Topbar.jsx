import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useConfig } from '../App';
import { UserRole } from '../types';
import NotificationBell from './NotificationBell';

const FALLBACK_LOGO = "/logo.png";

const Topbar = () => {
  const { user, logout } = useAuth();
  const { config } = useConfig();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="w-full no-print z-50 sticky top-0 shadow-sm bg-white border-b border-slate-200">
      
      {/* MAIN BRAND EMBLEM & HEADER BAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 sm:py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Crest & Title */}
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-3.5 sm:gap-4 text-center md:text-left group">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-full p-1 shadow-sm border border-slate-200 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
            <img
              src={config.logo || "/logo.png"}
              alt="JNTU-GV Crest"
              className="w-full h-full object-contain"
              onError={(e) => { e.currentTarget.src = FALLBACK_LOGO; }}
            />
          </div>
          <div>
            <h1 className="text-sm sm:text-lg md:text-xl font-serif font-extrabold text-[#1E5CA8] tracking-tight leading-tight uppercase">
              JAWAHARLAL NEHRU TECHNOLOGICAL UNIVERSITY GURAJADA VIZIANAGARAM
            </h1>
            <p className="text-xs sm:text-base md:text-lg font-bold text-[#2563EB] uppercase tracking-wider mt-1 font-serif">
              GUEST HOUSE MANAGEMENT PORTAL
            </p>
          </div>
        </Link>

        {/* Right Side: Auth Buttons or User Badge */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-3">
              <NotificationBell />

              <Link
                to="/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-all border border-slate-300"
              >
                <div className="w-7 h-7 rounded-full bg-[#1E5CA8] text-white flex items-center justify-center font-bold text-xs">
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="text-left text-xs">
                  <span className="font-bold text-slate-900 block leading-none">{user.name?.split(' ')[0] || 'User'}</span>
                  <span className="text-[10px] text-[#1E5CA8] uppercase font-semibold">{user.role}</span>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                title="Sign Out"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                <span>Logout</span>
              </button>
            </div>
          ) : (
            location.pathname !== '/' && (
              <div className="flex items-center space-x-2.5">
                <Link
                  to="/login"
                  className="px-4 py-2 bg-[#1E5CA8] hover:bg-[#2563EB] text-white rounded-lg font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-[#1E5CA8] border border-slate-300 rounded-lg font-bold text-xs transition-all shadow-sm flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5 text-[#1E5CA8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                  <span>Register</span>
                </Link>
              </div>
            )
          )}
        </div>
      </div>

      {/* AUTHENTICATED NAVIGATION BAR (Only shown when user is logged in) */}
      {user && (
        <nav className="bg-gradient-to-r from-[#1E5CA8] via-[#2563EB] to-[#1D4ED8] text-white shadow-inner">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between">
            
            <div className="hidden md:flex items-center space-x-1 overflow-x-auto py-1">
              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive('/dashboard')
                    ? 'bg-white/20 text-white'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                Dashboard
              </Link>

              <Link
                to="/room-matrix"
                className={`px-3 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive('/room-matrix')
                    ? 'bg-white/20 text-white'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Room Matrix
              </Link>

              <Link
                to="/new-entry"
                className={`px-3 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive('/new-entry')
                    ? 'bg-white/20 text-white'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Request Stay
              </Link>

              {user && (user.role === UserRole.ADMIN || user.role === UserRole.STAFF) && (
                <Link
                  to="/guest-list"
                  className={`px-3 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive('/guest-list')
                      ? 'bg-white/20 text-white'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                  Guest Register
                </Link>
              )}

              {user && user.role === UserRole.ADMIN && (
                <Link
                  to="/audit-logs"
                  className={`px-3 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive('/audit-logs')
                      ? 'bg-white/20 text-white'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  Audit Ledger
                </Link>
              )}

              {user && user.role === UserRole.ADMIN && (
                <Link
                  to="/staff-verification"
                  className={`px-3 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive('/staff-verification')
                      ? 'bg-white/20 text-white'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Staff Clearance
                </Link>
              )}

              <Link
                to="/feedback"
                className={`px-3 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive('/feedback')
                    ? 'bg-white/20 text-white'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                Feedback
              </Link>

              <Link
                to="/contact"
                className={`px-3 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive('/contact')
                    ? 'bg-white/20 text-white'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Contact
              </Link>

              {user && user.role === UserRole.ADMIN && (
                <Link
                  to="/portal-config"
                  className={`px-3 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive('/portal-config')
                      ? 'bg-white/20 text-white'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
                  Settings
                </Link>
              )}
            </div>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>

          {/* Mobile Dropdown Nav Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-[#1E5CA8] border-t border-white/10 p-4 space-y-2 text-xs font-bold animate-fadeIn">
              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block py-2 px-3 rounded hover:bg-white/10">Dashboard</Link>
              <Link to="/room-matrix" onClick={() => setMobileMenuOpen(false)} className="block py-2 px-3 rounded hover:bg-white/10">Room Matrix</Link>
              <Link to="/new-entry" onClick={() => setMobileMenuOpen(false)} className="block py-2 px-3 rounded hover:bg-white/10">Request Stay</Link>
              {user && (user.role === UserRole.ADMIN || user.role === UserRole.STAFF) && (
                <Link to="/guest-list" onClick={() => setMobileMenuOpen(false)} className="block py-2 px-3 rounded hover:bg-white/10">Guest Register</Link>
              )}
              {user && user.role === UserRole.ADMIN && (
                <Link to="/audit-logs" onClick={() => setMobileMenuOpen(false)} className="block py-2 px-3 rounded hover:bg-white/10">Audit Ledger</Link>
              )}
              {user && user.role === UserRole.ADMIN && (
                <Link to="/staff-verification" onClick={() => setMobileMenuOpen(false)} className="block py-2 px-3 rounded hover:bg-white/10">Staff Clearance</Link>
              )}
              <Link to="/feedback" onClick={() => setMobileMenuOpen(false)} className="block py-2 px-3 rounded hover:bg-white/10">Feedback</Link>
              <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="block py-2 px-3 rounded hover:bg-white/10">Contact</Link>
              {user && user.role === UserRole.ADMIN && (
                <Link to="/portal-config" onClick={() => setMobileMenuOpen(false)} className="block py-2 px-3 rounded hover:bg-white/10">Settings</Link>
              )}
            </div>
          )}
        </nav>
      )}

    </header>
  );
};

export default Topbar;

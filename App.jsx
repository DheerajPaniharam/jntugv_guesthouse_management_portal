import React, { useState, useEffect, createContext, useContext, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Topbar from './components/Topbar';
import { UserRole } from './types';
import { configApi } from './services/api';

// Lazy load pages
const Home = lazy(() => import('./pages/Home.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const NewEntry = lazy(() => import('./pages/NewEntry.jsx'));
const GuestList = lazy(() => import('./pages/GuestList.jsx'));
const Confirmation = lazy(() => import('./pages/Confirmation.jsx'));
const Feedback = lazy(() => import('./pages/Feedback.jsx'));
const FeedbackRegister = lazy(() => import('./pages/FeedbackRegister.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const PortalConfig = lazy(() => import('./pages/PortalConfig.jsx'));
const ContactUs = lazy(() => import('./pages/ContactUs.jsx'));
const StaffVerification = lazy(() => import('./pages/StaffVerification.jsx'));
const RoomMatrix = lazy(() => import('./pages/RoomMatrix.jsx'));
const AuditLogs = lazy(() => import('./pages/AuditLogs.jsx'));

export const AuthContext = createContext(null);
export const ConfigContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) throw new Error("useConfig must be used within ConfigProvider");
  return context;
};

const PageLoader = () => (
  <div className="flex-grow flex items-center justify-center py-24">
    <div className="w-12 h-12 border-4 border-[#1E5CA8] border-t-[#2563EB] rounded-full animate-spin"></div>
  </div>
);

const ProtectedRoute = ({ children, roles }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.some(r => r === UserRole.ADMIN || r === UserRole.STAFF)) {
    if (!user.isVerified) {
      return <Navigate to="/dashboard" state={{ unverified: true }} replace />;
    }
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  const [user, setUser] = useState(null);
  const [config, setConfig] = useState(configApi.get());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.removeItem('theme');
    document.documentElement.classList.remove('dark');
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateConfig = async (newConfig) => {
    const updated = await configApi.update(newConfig);
    setConfig(updated);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F8FAFC] text-[#1E5CA8] font-serif font-bold text-sm">
        Initializing JNTU-GV Portal Engine...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <ConfigContext.Provider value={{ config, updateConfig }}>
        <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#1E293B]">
          {/* Official JNTUGV Header */}
          <Topbar />

          {/* Main Application Canvas */}
          <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Home />} />
                <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
                <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />

                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/room-matrix" element={<ProtectedRoute><RoomMatrix /></ProtectedRoute>} />
                <Route path="/new-entry" element={<ProtectedRoute><NewEntry /></ProtectedRoute>} />
                <Route path="/guest-list" element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.STAFF]}><GuestList /></ProtectedRoute>} />
                <Route path="/audit-logs" element={<ProtectedRoute roles={[UserRole.ADMIN]}><AuditLogs /></ProtectedRoute>} />
                <Route path="/staff-verification" element={<ProtectedRoute roles={[UserRole.ADMIN]}><StaffVerification /></ProtectedRoute>} />
                <Route path="/feedback-inbox" element={<ProtectedRoute roles={[UserRole.ADMIN]}><FeedbackRegister /></ProtectedRoute>} />
                <Route path="/confirmation/:id" element={<ProtectedRoute><Confirmation /></ProtectedRoute>} />
                <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/portal-config" element={<ProtectedRoute roles={[UserRole.ADMIN]}><PortalConfig /></ProtectedRoute>} />
                <Route path="/contact" element={<ProtectedRoute><ContactUs /></ProtectedRoute>} />
              </Routes>
            </Suspense>
          </main>

          {/* Minimal Institutional Footer */}
          <footer className="bg-[#1A3B66] text-slate-300 border-t border-slate-700 py-6 mt-12 no-print">
            <div className="container mx-auto px-4 text-center text-xs">
              <p className="text-slate-200 font-medium">
                &copy; {new Date().getFullYear()} Guest House Management Portal, JNTU-GV. All Rights Reserved.
              </p>
            </div>
          </footer>
        </div>
      </ConfigContext.Provider>
    </AuthContext.Provider>
  );
};

export default App;

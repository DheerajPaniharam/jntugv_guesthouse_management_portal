import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth, useConfig } from '../App';

const Home = () => {
  const { user } = useAuth();
  const { config } = useConfig();

  const mapEmbedUrl = config.mapUrl || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3793.2844883460833!2d83.3732049751804!3d18.05837698294979!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a3be373b9e4a8bb%3A0x6a2c5a08aa0d4b9b!2sJNTU-GV%20College%20of%20Engineering%20Vizianagaram!5e0!3m2!1sen!2sin!4v1710920000000!5m2!1sen!2sin";

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-12 font-sans text-slate-800">
      
      {/* 1. GUEST HOUSE IMAGE & PORTAL ACCESS HERO */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          
          {/* College Guest House Image */}
          <div className="lg:col-span-7 relative min-h-[300px] sm:min-h-[380px] bg-slate-900 overflow-hidden">
            <img
              src="/guest_house.jpg"
              alt="JNTU-GV University Guest House"
              className="w-full h-full object-cover min-h-[300px] sm:min-h-[380px]"
            />
          </div>

          {/* Minimal Portal Access (Login / Register) */}
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-center bg-[#F8FAFC] border-t lg:border-t-0 lg:border-l border-slate-200">
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-serif font-bold text-[#1E5CA8]">
                  Guest House Management Portal
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm mt-1 leading-relaxed">
                  Official accommodation portal for university visitors, faculty, examiners, and research scholars.
                </p>
              </div>

              {/* Login / Register CTAs */}
              {user ? (
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1E5CA8] text-white flex items-center justify-center font-bold text-sm">
                      {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{user.name}</p>
                      <p className="text-[11px] text-slate-500">{user.email} &bull; <span className="font-semibold text-[#1E5CA8]">{user.role}</span></p>
                    </div>
                  </div>
                  <Link
                    to="/dashboard"
                    className="w-full py-2.5 bg-[#1E5CA8] hover:bg-[#2563EB] text-white rounded-lg text-xs font-bold text-center block transition-colors shadow-sm"
                  >
                    Go to Dashboard &rarr;
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <Link
                    to="/login"
                    className="w-full py-3 bg-[#1E5CA8] hover:bg-[#2563EB] text-white rounded-xl font-bold text-sm text-center block shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                    <span>Sign In</span>
                  </Link>

                  <Link
                    to="/register"
                    className="w-full py-2.5 bg-white hover:bg-slate-50 text-[#1E5CA8] border border-slate-300 rounded-xl font-bold text-sm text-center block transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4 text-[#1E5CA8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                    <span>Register</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* 2. CONTACT INFO & CAMPUS LOCATION */}
      <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-lg sm:text-xl font-serif font-bold text-[#1E5CA8]">
            Contact & Campus Location
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Contact Details */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC] space-y-2">
              <h3 className="font-serif font-bold text-[#1E5CA8] text-sm flex items-center gap-2">
                <span>📞</span>
                <span>Contact Details</span>
              </h3>
              <div className="space-y-1.5 text-xs text-slate-700">
                <p><strong className="text-slate-900">Phone:</strong> {config.registrarPhone || '08922 294316'}</p>
                <p><strong className="text-slate-900">Email:</strong> {config.registrarEmail1 || 'registrarpeshi@jntugv.edu.in'}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC] space-y-2">
              <h3 className="font-serif font-bold text-[#1E5CA8] text-sm flex items-center gap-2">
                <span>📍</span>
                <span>Address</span>
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed">
                <strong>JNTU-GV Vizianagaram</strong><br />
                NH 43, Dwarapudi (Post), Vizianagaram - 535 003, Andhra Pradesh, India.
              </p>
            </div>

          </div>

          {/* Map */}
          <div className="lg:col-span-7">
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm h-[240px] sm:h-[260px] w-full bg-slate-100">
              <iframe
                src={mapEmbedUrl}
                title="JNTU-GV Campus Location Map"
                className="w-full h-full border-0"
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};

export default Home;

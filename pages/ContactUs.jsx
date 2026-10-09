import React, { useState } from 'react';
import { useConfig } from '../App';

const ContactUs = () => {
  const { config } = useConfig();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setSent(true);
    setFormData({ name: '', email: '', subject: 'General Inquiry', message: '' });
    setTimeout(() => setSent(false), 5000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn py-4 px-2 sm:px-4">
      {/* JNTUGV Header */}
      <header className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-[#1E5CA8] mb-1">
          <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span>
          Institutional Contact & Estate Information Desk
        </div>
        <h1 className="text-2xl sm:text-4xl font-serif font-bold text-[#1E5CA8] tracking-tight">
          University Administration & Guest House
        </h1>
        <p className="text-slate-600 font-medium max-w-2xl mx-auto text-xs sm:text-sm">
          {config.universityName} &bull; Estate Office, Dwarapudi, Vizianagaram
        </p>
      </header>

      {/* Registrar Contact Details Card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border-l-4 border-l-[#1E5CA8] border border-slate-200 shadow-sm max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 bg-[#1E5CA8] text-white rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-serif font-bold text-[#1E5CA8]">{config.registrarTitle || 'Office of the Registrar'}</h3>
            <p className="text-xs text-slate-500 font-medium">Official Liaison for University Guest House Services</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <svg className="w-5 h-5 text-[#1E5CA8] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6.62 10.79a15.15 15.15 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
            </svg>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Registrar Peshi</span>
              <span className="font-bold text-slate-900">{config.registrarPhone || '08922 294316'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <svg className="w-5 h-5 text-[#1E5CA8] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
            </svg>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Email Contact</span>
              <span className="font-bold text-slate-900 truncate block">{config.registrarEmail1 || 'registrarpeshi@jntugv.edu.in'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Send Inquiry Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-serif font-bold text-[#1E5CA8] tracking-tight mb-6 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
            Send Official Inquiry / Requisition Note
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:border-[#1E5CA8] outline-none transition-all font-bold text-xs"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Official Email</label>
                <input
                  type="email"
                  required
                  placeholder="Enter your official email"
                  className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:border-[#1E5CA8] outline-none transition-all font-bold text-xs"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Subject / Department Reference</label>
              <input
                type="text"
                required
                placeholder="Enter subject or reference"
                className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:border-[#1E5CA8] outline-none transition-all font-bold text-xs"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Detailed Message</label>
              <textarea
                required
                rows={4}
                placeholder="Specify your requisition details or stay assistance requirements..."
                className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:border-[#1E5CA8] outline-none transition-all font-bold text-xs"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>

            {sent && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold text-center animate-fadeIn">
                Requisition note dispatched to Registrar Peshi & Estate In-Charge.
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1E5CA8] hover:bg-[#2563EB] text-white font-bold text-xs sm:text-sm py-3.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <span>Dispatch Inquiry Note</span>
              )}
            </button>
          </form>
        </div>

        {/* Location & Map Card */}
        <div className="space-y-6">
          <div className="bg-[#183B6B] rounded-2xl p-6 sm:p-8 text-white space-y-6 shadow-md border-t-4 border-[#2563EB]">
            <div>
              <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest block">Campus Location</span>
              <h3 className="text-xl font-serif font-bold text-white mt-1">JNTU-GV Campus Map</h3>
            </div>
            <div className="aspect-video bg-white rounded-xl overflow-hidden relative border-2 border-white/10 shadow-inner">
              <iframe
                src={config.mapUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full"
                title="JNTUGV Campus Map"
              />
            </div>
            <div className="space-y-2 text-xs">
              <p className="font-serif font-bold text-white text-sm">{config.universityName}</p>
              <div className="flex items-start gap-2 text-slate-300">
                <svg className="w-4 h-4 text-blue-300 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <p className="leading-relaxed font-medium">{config.universityAddress || 'NH 43, Dwarapudi, Vizianagaram, Andhra Pradesh - 535003'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;

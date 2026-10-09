import React, { useState, useEffect } from 'react';
import { guestApi } from '../services/api';

const FeedbackRegister = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const data = await guestApi.getFeedbacks();
        setFeedbacks(Array.isArray(data) ? data : []);
      } catch (e) {
        setFeedbacks([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFeedbacks();
  }, []);

  const filteredFeedbacks = (Array.isArray(feedbacks) ? feedbacks : []).filter(fb => filter === 'All' || fb?.type === filter);

  const getRatingStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`w-3.5 h-3.5 ${i < rating ? 'text-[#2563EB] fill-[#2563EB]' : 'text-slate-300'}`}
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  const getTypeStyle = (type) => {
    switch (type) {
      case 'Complaint': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Compliment': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-blue-50 text-[#1E5CA8] border-blue-200';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn max-w-6xl mx-auto py-2 sm:py-4 px-2 sm:px-4">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB] block mb-1">Administrative Oversight</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E5CA8] tracking-tight">Guest Feedback Register</h1>
          <p className="text-slate-600 font-medium text-xs sm:text-sm">Institutional Feedback Records & Quality Assessment</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full lg:w-auto overflow-x-auto">
          {['All', 'Suggestion', 'Compliment', 'Complaint'].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                filter === t
                  ? 'bg-[#1E5CA8] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-[#1E5CA8] border-t-[#2563EB] rounded-full animate-spin"></div>
          <p className="mt-4 text-xs font-bold text-slate-500">Accessing Feedback Archive...</p>
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <p className="text-xs font-bold text-slate-500">No feedback submissions found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {filteredFeedbacks.map(fb => (
            <div key={fb.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1E5CA8] text-white flex items-center justify-center font-bold text-base shadow-sm">
                    {fb.userName ? fb.userName.charAt(0).toUpperCase() : 'G'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 truncate max-w-[140px] sm:max-w-none">{fb.userName}</h3>
                    <div className="flex items-center gap-0.5 mt-0.5">{getRatingStars(fb.rating)}</div>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getTypeStyle(fb.type)}`}>
                  {fb.type}
                </span>
              </div>

              <div className="flex-grow">
                <p className="text-slate-700 text-xs font-medium leading-relaxed italic border-l-2 border-[#1E5CA8] pl-3 py-1 bg-slate-50 rounded-r-lg">
                  "{fb.comment}"
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] font-medium text-slate-400">
                <span className="font-mono">REF: {fb.id ? fb.id.slice(-8).toUpperCase() : 'ENTRY'}</span>
                <span>{new Date(fb.createdAt || Date.now()).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedbackRegister;

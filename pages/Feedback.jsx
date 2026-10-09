import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { guestApi } from '../services/api';

const Feedback = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    type: 'Suggestion',
    rating: 5,
    comment: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      await guestApi.submitFeedback({
        userId: user.id,
        userName: user.name,
        ...formData
      });
      setSubmitted(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      alert("Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center animate-fadeIn text-center px-4">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-md">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-serif font-bold text-[#1E5CA8] tracking-tight">Feedback Submitted</h2>
        <p className="text-slate-600 mt-2 font-medium text-sm">Your feedback has been logged for University Guest House administration review.</p>
        <p className="text-xs text-[#2563EB] mt-4 font-bold uppercase tracking-widest">Returning to Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-4 sm:py-6 px-2 sm:px-4 space-y-6">
      <header className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB] block mb-1">Quality Assurance</span>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E5CA8] tracking-tight">Guest Stay Feedback</h1>
        <p className="text-slate-600 mt-1 font-medium text-xs sm:text-sm">JNTU Gurajada Vizianagaram Guest House</p>
      </header>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2.5">Nature of Feedback</label>
            <div className="grid grid-cols-3 gap-3">
              {['Suggestion', 'Compliment', 'Complaint'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type })}
                  className={`py-3 px-2 rounded-xl font-bold border-2 transition-all ${
                    formData.type === type
                      ? 'bg-[#1E5CA8] border-[#1E5CA8] text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2.5">Experience Rating</label>
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: star })}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <svg
                      className={`w-7 h-7 ${formData.rating >= star ? 'text-[#2563EB] fill-[#2563EB]' : 'text-slate-300'}`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
              <span className="font-bold text-[#1E5CA8] text-sm">{formData.rating} of 5 Stars</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">Detailed Comments</label>
            <textarea
              required
              rows={4}
              placeholder="Please provide your constructive feedback, remarks, or suggestions..."
              className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:border-[#1E5CA8] outline-none transition-all font-bold placeholder:text-slate-400"
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1E5CA8] hover:bg-[#2563EB] text-white font-bold text-xs sm:text-sm py-3.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Official Feedback"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Feedback;

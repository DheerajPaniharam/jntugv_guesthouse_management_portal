import React, { useState, useEffect } from 'react';
import { authApi } from '../services/api';

const StaffVerification = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const data = await authApi.getPendingStaff();
      setPendingUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setPendingUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    setProcessingId(userId);
    try {
      await authApi.updateVerificationStatus(userId, true);
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      alert("Verification update failed.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId) => {
    if (!confirm("Are you sure you want to REJECT this staff identity? The account will be removed.")) return;
    setProcessingId(userId);
    try {
      await authApi.deleteUser(userId);
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      alert("Deletion failed.");
    } finally {
      setProcessingId(null);
    }
  };

  const getAssetUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('/api/')) {
      const token = localStorage.getItem('token');
      return token ? `${url}?token=${token}` : url;
    }
    return url;
  };

  const openIdProof = (rawUrl) => {
    if (!rawUrl) return;
    const assetUrl = getAssetUrl(rawUrl);
    const win = window.open();
    if (win) {
      win.document.write(`<title>Institutional ID Proof</title><div style="background:#1E5CA8; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px;"><img src="${assetUrl}" style="max-width:90%; border-radius:12px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);"></div>`);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto py-4 px-2 sm:px-4">
      <header className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB] block mb-1">Estate Administrative Clearance</span>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E5CA8] tracking-tight">Staff Account Verification</h1>
        <p className="text-slate-600 font-medium text-xs sm:text-sm mt-0.5">Authenticate faculty & institutional staff credentials for University Guest House operations</p>
      </header>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#1E5CA8] border-t-[#2563EB] rounded-full animate-spin"></div>
          <p className="mt-4 text-xs font-bold text-slate-500">Scanning Staff Registry...</p>
        </div>
      ) : pendingUsers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <svg className="w-12 h-12 text-emerald-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-sm font-bold text-slate-700">Clearance Registry Complete</p>
          <p className="text-xs text-slate-400 mt-1">No pending staff clearance requests at this time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingUsers.map(u => (
            <div key={u.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="p-6 flex-grow space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#1E5CA8] text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-sm">
                    {(u?.name || u?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#1E5CA8] truncate">{u?.name || 'Staff Member'}</h3>
                    <p className="text-xs text-slate-500 truncate">{u?.email || 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Institutional ID Proof</p>
                    <button
                      onClick={() => openIdProof(u.idProof)}
                      className="w-full aspect-video bg-slate-50 rounded-xl border border-slate-200 overflow-hidden relative group cursor-pointer"
                    >
                      {u.idProof ? (
                        <img src={getAssetUrl(u.idProof)} className="w-full h-full object-contain p-1" alt="ID Proof" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs font-bold text-slate-400">ID Image Missing</div>
                      )}
                      <div className="absolute inset-0 bg-[#1E5CA8]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-xs font-bold text-white bg-[#1E5CA8] px-3 py-1 rounded-full shadow-md border border-blue-400">
                          Enlarge ID
                        </span>
                      </div>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Contact</p>
                      <p className="text-xs font-bold text-slate-800">{u.contactNumber || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                      <p className="text-xs font-bold text-amber-700">Awaiting Clearance</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-3">
                <button
                  disabled={!!processingId}
                  onClick={() => handleReject(u.id)}
                  className="py-2.5 px-2 border border-rose-300 text-rose-700 rounded-xl font-bold text-xs hover:bg-rose-50 transition-all disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  disabled={!!processingId}
                  onClick={() => handleApprove(u.id)}
                  className="py-2.5 px-2 bg-[#1E5CA8] hover:bg-[#2563EB] text-white rounded-xl font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                >
                  {processingId === u.id ? "Authorizing..." : "Authorize"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffVerification;

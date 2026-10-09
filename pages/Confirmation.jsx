import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { guestApi, auditApi } from '../services/api';
import { useAuth, useConfig } from '../App';
import { EntryStatus, UserRole, PaymentType } from '../types';
import StatusBadge from '../components/StatusBadge';
import PaymentModal from '../components/PaymentModal';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const Confirmation = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [auditHistory, setAuditHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const [receiptNo, setReceiptNo] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setReceiptRemarks] = useState('');

  useEffect(() => {
    if (id) {
      guestApi.getById(id).then(data => {
        if (data) {
          const isOwner = data.submittedBy === user?.id;
          const isPrivileged = user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF;
          if (isOwner || isPrivileged) {
            setEntry(data);
            if (data.receiptNo) setReceiptNo(data.receiptNo);
            if (data.remarks) setReceiptRemarks(data.remarks);
          } else {
            setUnauthorized(true);
          }
        }
        setLoading(false);
      });

      auditApi.getByTargetId(id).then(logs => {
        setAuditHistory(Array.isArray(logs) ? logs : []);
      }).catch(console.error);
    }
  }, [id, user]);

  const handleStatusChange = async (status) => {
    if (!id) return;
    setIsUpdating(true);
    try {
      await guestApi.updateStatus(id, status, { receiptNo, receiptDate, remarks });
      const updated = await guestApi.getById(id);
      if (updated) setEntry(updated);
      const updatedLogs = await auditApi.getByTargetId(id);
      setAuditHistory(Array.isArray(updatedLogs) ? updatedLogs : []);
    } catch (err) {
      alert("Update failed");
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePaymentSuccess = async (paymentResult) => {
    setPaymentModalOpen(false);
    try {
      if (id) {
        const updated = await guestApi.getById(id);
        if (updated) setEntry(updated);
        const updatedLogs = await auditApi.getByTargetId(id);
        setAuditHistory(Array.isArray(updatedLogs) ? updatedLogs : []);
      }
    } catch (err) {
      console.error('Failed to reload booking after payment:', err);
    }
  };

  const handleEditRedirect = () => {
    if (entry) {
      if (entry.status === EntryStatus.APPROVED || entry.status === EntryStatus.CHECKED_OUT) {
        alert("Approved stay registrations cannot be modified.");
        return;
      }
      navigate('/new-entry', { state: { editEntry: entry } });
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

  const openAsset = (rawUrl) => {
    if (!rawUrl) return;
    const assetUrl = getAssetUrl(rawUrl);
    const win = window.open();
    if (win) {
      if (rawUrl.startsWith('data:application/pdf') || rawUrl.endsWith('.pdf')) {
        win.document.write(`<title>Stay Request Letter</title><iframe src="${assetUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      } else {
        win.document.write(`<title>Identity Asset</title><div style="background:#f8fafc; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px;"><img src="${assetUrl}" style="max-width: 100%; height: auto; border-radius:12px; box-shadow:0 20px 25px -5px rgb(0 0 0 / 0.1);"></div>`);
      }
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('printable-voucher');
    if (!element || !entry) return;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1024,
        letterRendering: true,
        onclone: (clonedDoc) => {
          const printable = clonedDoc.getElementById('printable-voucher');
          if (printable) {
            printable.style.width = '1024px';
            printable.style.margin = '0';
            printable.style.padding = '40px';
            printable.style.borderRadius = '0';
            printable.style.border = 'none';
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`JNTUGV_Voucher_${entry.slNo || entry.id}.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
      alert("Failed to render PDF voucher.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 animate-fadeIn">
        <div className="w-12 h-12 border-4 border-[#1E5CA8] border-t-[#2563EB] rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-slate-500">Retrieving Official Record...</p>
      </div>
    );
  }

  if (unauthorized || !entry) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-3xl max-w-xl mx-auto text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-3.5a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-600 font-medium">You do not have administrative clearance or ownership of this guest voucher.</p>
        <button onClick={() => navigate('/dashboard')} className="px-6 py-2.5 bg-[#1E5CA8] text-white rounded-xl font-bold text-xs hover:bg-[#2563EB]">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const isPrivileged = user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF;
  const isDept = entry.paymentType === PaymentType.DEPARTMENTAL;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12">
      {/* Top Action Toolbar */}
      <div className="no-print bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 max-w-[850px] mx-auto">
        <div>
          <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-widest block">Official Stay Voucher</span>
          <h2 className="text-lg font-serif font-bold text-[#1E5CA8]">Voucher #{entry.slNo}</h2>
          <p className="text-xs text-slate-500">Status: <strong className="text-slate-800">{entry.status}</strong></p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {!isDept && entry.totalAmount > 0 && entry.paymentStatus !== 'Paid' && (
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              Pay ₹{entry.totalAmount} Online
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#1E5CA8] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="px-4 py-2.5 bg-[#1E5CA8] hover:bg-[#2563EB] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            {isGenerating ? 'Rendering PDF...' : 'Download PDF'}
          </button>
          {isPrivileged && entry.status !== EntryStatus.APPROVED && entry.status !== EntryStatus.CHECKED_OUT && (
            <button
              onClick={handleEditRedirect}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#1E5CA8] text-xs font-bold rounded-xl transition-all"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Admin Approval Control Box (Staff / Admin Only) */}
      {isPrivileged && (
        <div className="no-print max-w-[850px] mx-auto bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-[#1E5CA8] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
              Estate Office Authorization Desk
            </h3>
            <StatusBadge status={entry.status} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="font-bold text-slate-600 block mb-1">Cash Receipt No.</label>
              <input
                type="text"
                placeholder="Enter receipt number"
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 block mb-1">Receipt Date</label>
              <input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 block mb-1">Administrative Remarks</label>
              <input
                type="text"
                placeholder="Enter administrative remarks"
                value={remarks}
                onChange={(e) => setReceiptRemarks(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => handleStatusChange(EntryStatus.APPROVED)}
              disabled={isUpdating}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              Approve & Authorize Room
            </button>
            <button
              onClick={() => handleStatusChange(EntryStatus.REJECTED)}
              disabled={isUpdating}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              Reject Booking
            </button>
            <button
              onClick={() => handleStatusChange(EntryStatus.CHECKED_OUT)}
              disabled={isUpdating}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              Mark Checked Out
            </button>
          </div>
        </div>
      )}

      {/* Official Printable Voucher */}
      <div id="printable-voucher" className="bg-white text-slate-900 rounded-2xl shadow-xl overflow-hidden border-2 border-slate-300 print:shadow-none print:border-none max-w-[850px] mx-auto relative">
        
        {/* Top JNTUGV Institutional Header */}
        <div className="bg-white text-slate-900 p-6 sm:p-8 border-b-2 border-slate-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-16 h-16 bg-white p-1 rounded-xl shadow-sm flex items-center justify-center flex-shrink-0 border border-slate-200">
                <img src={config.logo} alt="JNTUGV Crest" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-xs sm:text-sm md:text-base font-serif font-bold tracking-tight text-slate-900 mt-0.5 leading-snug">
                  JAWAHARLAL NEHRU TECHNOLOGICAL UNIVERSITY GURAJADA VIZIANAGARAM
                </h1>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-0.5">
                  GUEST HOUSE ALLOTMENT VOUCHER
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Voucher Content */}
        <div className="p-6 sm:p-10 space-y-8">
          
          {/* Section 1: Guest Identity & Stay Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Guest Identity */}
            <div className="space-y-4">
              <div className="border-b-2 border-slate-200 pb-1.5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1E5CA8]"></span>
                <h2 className="text-xs font-bold text-[#1E5CA8] uppercase tracking-wider">Guest Identity</h2>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Guest Name</p>
                  <p className="text-base font-bold text-slate-900">{entry.guestName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Classification & Purpose</p>
                  <p className="font-bold text-slate-800">{entry.category || 'General'}</p>
                  <p className="text-slate-600 italic mt-0.5">{entry.purposeOfVisit}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Contact</p>
                    <p className="font-bold text-slate-900">{entry.phoneNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Nationality</p>
                    <p className="font-bold text-slate-900">{entry.nationality || 'Indian'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Permanent Address</p>
                  <div className="bg-slate-50 p-2.5 rounded-lg text-xs font-medium text-slate-700 border border-slate-200">
                    {entry.address}
                  </div>
                </div>

                {/* Uploaded Verification Documents View */}
                {(entry.idProof || entry.requestLetter) && (
                  <div className="pt-2 border-t border-slate-200 space-y-1.5 no-print">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Uploaded Verification Documents</p>
                    <div className="flex flex-wrap gap-2">
                      {entry.idProof && (
                        <button
                          type="button"
                          onClick={() => openAsset(entry.idProof)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1E5CA8] rounded-lg font-bold text-[11px] border border-blue-200 flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <svg className="w-3.5 h-3.5 text-[#1E5CA8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                          View ID Card Photo
                        </button>
                      )}
                      {entry.requestLetter && (
                        <button
                          type="button"
                          onClick={() => openAsset(entry.requestLetter)}
                          className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg font-bold text-[11px] border border-purple-200 flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <svg className="w-3.5 h-3.5 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          View Sanction / Request Letter
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stay Specifications */}
            <div className="space-y-4">
              <div className="border-b-2 border-slate-200 pb-1.5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1E5CA8]"></span>
                <h2 className="text-xs font-bold text-[#1E5CA8] uppercase tracking-wider">Allotment Specifications</h2>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Allotted Unit</p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-serif font-bold text-[#1E5CA8]">Room {entry.roomNo}</span>
                    <span className="px-2.5 py-0.5 bg-blue-50 text-[#1E5CA8] text-[10px] font-bold rounded border border-blue-200 uppercase">
                      AC Room
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Check-In</p>
                    <p className="text-xs font-bold text-slate-900">{new Date(entry.arrivalDateTime).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Check-Out</p>
                    <p className="text-xs font-bold text-slate-900">{new Date(entry.departureDateTime).toLocaleDateString()}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Duration & Occupancy</p>
                  <p className="text-xs font-bold text-slate-900">
                    {entry.numDays} Days (Male: {entry.numMale || 0}, Female: {entry.numFemale || 0}, Child: {entry.numChildren || 0})
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Section 2: Settlement Node */}
          <div className="pt-2 border-t-2 border-slate-200">
            {isDept ? (
              <div className="bg-purple-50/80 p-5 rounded-xl border-2 border-purple-200 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="px-2 py-0.5 bg-purple-200 text-purple-900 text-[10px] font-bold rounded uppercase tracking-wider">
                      Departmental Journal Transfer
                    </span>
                    <h3 className="text-sm font-bold text-purple-950 mt-1">Direct University Grant Billing</h3>
                  </div>
                  <span className="text-lg font-bold text-purple-900">₹0 (Guest Out-of-Pocket)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-purple-200">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">Sponsoring Department:</span>
                    <span className="font-bold text-slate-900">{entry.departmentName || 'University Department'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">Budget Head / Grant Code:</span>
                    <span className="font-bold text-slate-900">{entry.budgetHead || 'Institutional Head'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">Sanction Reference No:</span>
                    <span className="font-bold text-slate-900">{entry.sanctionOrderNo || 'SO/EST/2026'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">Total Book Debit:</span>
                    <span className="font-bold text-purple-900">₹{entry.totalAmount} (Debited to Project Head)</span>
                  </div>
                </div>
              </div>
            ) : entry.paymentStatus === 'Paid' || entry.transactionId ? (
              <div className="bg-gradient-to-br from-emerald-50/90 to-teal-50/70 p-5 rounded-xl border-2 border-emerald-300 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                        Settled &bull; Online Payment
                      </span>
                      <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200">
                        {entry.paymentMethod || 'Online Gateway'}
                      </span>
                    </div>
                    <p className="text-2xl font-serif font-bold text-slate-900 mt-1">₹{entry.totalAmount}</p>
                    <p className="text-slate-500 text-[11px]">Personal Accommodation Tariff &bull; {entry.category || 'Standard'}</p>
                  </div>

                  {/* Verification Stamp */}
                  <div className="bg-white/95 p-3.5 rounded-xl border-2 border-dashed border-emerald-500 text-left sm:text-right shadow-sm flex flex-col sm:items-end w-full sm:w-auto">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1 sm:justify-end">
                      <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      Treasury Verified
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-800 block mt-0.5">{entry.transactionId || 'TXN-JNTUGV-VERIFIED'}</span>
                    {entry.receiptNo && (
                      <span className="text-[10px] font-bold text-emerald-800 block">Receipt: {entry.receiptNo}</span>
                    )}
                    <span className="text-[10px] text-slate-400 font-medium block">
                      {entry.paidAt ? new Date(entry.paidAt).toLocaleString() : 'Electronic Settlement'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50/90 p-5 rounded-xl border-2 border-amber-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-bold rounded uppercase tracking-wider">
                      Payment Pending
                    </span>
                    <span className="text-[11px] text-amber-800 font-semibold">Payable at Check-In / Reception or Online</span>
                  </div>
                  <p className="text-2xl font-serif font-bold text-slate-900 mt-1">₹{entry.totalAmount}</p>
                  <p className="text-slate-500 mt-0.5">Protocol: {entry.category || 'Standard Tariff'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(true)}
                  className="no-print px-4 py-2.5 bg-[#1E5CA8] hover:bg-[#2563EB] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  Pay ₹{entry.totalAmount} Online Now
                </button>
              </div>
            )}
          </div>

          {/* Section 3: Signatures & University Seal */}
          <div className="pt-4 border-t-2 border-slate-200 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Guest Digital Signature</p>
              <div className="h-16 w-56 max-w-full bg-slate-50 rounded-lg border border-dashed border-slate-300 flex items-center justify-center p-1">
                {entry.signature ? (
                  <img src={entry.signature} className="max-h-full object-contain" alt="Signature" />
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 italic">Signature Recorded</span>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Footer Note */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 text-[10px] text-slate-500 text-center font-medium">
          Dwarapudi (Post), Vizianagaram - 535003, Andhra Pradesh, India &bull; Phone: 08922 294316 &bull; Email: registrarpeshi@jntugv.edu.in
        </div>
      </div>

      {/* Audit History Timeline */}
      <div className="no-print max-w-[850px] mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-[#1E5CA8] flex items-center gap-2">
            <svg className="w-4 h-4 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Forensic Audit Trail for {entry.slNo}
          </h3>
          <span className="text-xs text-slate-400 font-semibold">{auditHistory.length} Event(s)</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {auditHistory.map((log) => (
            <div key={log.id} className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800">{log.summary}</span>
                <span className="text-slate-400 text-[11px] block">Actor: {log.actorName} ({log.actorRole})</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
          {auditHistory.length === 0 && (
            <p className="text-xs text-slate-400 py-4 text-center">No additional audit events recorded for this voucher.</p>
          )}
        </div>
      </div>

      {/* Payment Checkout Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={handlePaymentSuccess}
        booking={entry}
      />
    </div>
  );
};

export default Confirmation;
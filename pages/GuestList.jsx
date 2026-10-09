import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { guestApi } from '../services/api';
import { EntryStatus, PaymentType } from '../types';
import StatusBadge from '../components/StatusBadge';
import { exportToExcel } from '../utils/exportExcel';
import AuditReportModal from '../components/AuditReportModal';

const GuestList = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [bookingFilter, setBookingFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const data = await guestApi.getAll();
        setEntries(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch entries:', err);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEntries();

    // Real-Time Desk Sync via SSE
    const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    const sseUrl = isProd ? `${window.location.origin}/api/events` : 'http://localhost:5000/api/events';

    let eventSource;
    try {
      eventSource = new EventSource(sseUrl);
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'BOOKING_CREATED' || data.type === 'BOOKING_UPDATED') {
            fetchEntries();
          }
        } catch (err) {}
      };
    } catch (sseErr) {
      console.warn('SSE desk sync skipped in offline/unsupported environment');
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  const filteredEntries = (Array.isArray(entries) ? entries : []).filter(e =>
    (((e?.guestName || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
      ((e?.slNo || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
      ((e?.budgetHead || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
      ((e?.departmentName || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
      ((e?.transactionId || '').toLowerCase().includes(searchTerm.toLowerCase()))) &&
    (roomFilter === '' || e?.roomNo === roomFilter) &&
    (statusFilter === '' || e?.status === statusFilter) &&
    (bookingFilter === '' || e?.bookingFor === bookingFilter) &&
    (paymentFilter === '' ||
      (paymentFilter === 'Departmental' && e?.paymentType === PaymentType.DEPARTMENTAL) ||
      (paymentFilter === 'Paid' && e?.paymentType !== PaymentType.DEPARTMENTAL && (e?.paymentStatus === 'Paid' || e?.transactionId)) ||
      (paymentFilter === 'Pending' && e?.paymentType !== PaymentType.DEPARTMENTAL && e?.paymentStatus !== 'Paid' && !e?.transactionId))
  );

  return (
    <div className="space-y-6 animate-fadeIn px-2 md:px-0">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm no-print">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB] block mb-0.5">Central Ledger</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E5CA8] tracking-tight">Guest Register & Ledger</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Official institutional database across all 6 AC Rooms
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsAuditModalOpen(true)}
            className="px-4 py-2.5 bg-[#1E5CA8] hover:bg-[#2563EB] text-white rounded-xl shadow-sm transition-all font-bold text-xs flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Financial Audit Pack
          </button>
          <button
            onClick={() => exportToExcel(filteredEntries)}
            className="px-4 py-2.5 bg-white border border-slate-300 text-[#1E5CA8] hover:bg-slate-50 rounded-xl shadow-sm transition-all font-bold text-xs flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4 text-[#1E5CA8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export Excel
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-slate-100 text-[#1E5CA8] hover:bg-slate-200 rounded-xl transition-all font-bold text-xs flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-3 no-print shadow-sm">
        <div className="flex-grow">
          <label htmlFor="search-input" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Search Records</label>
          <div className="relative">
            <input
              id="search-input"
              type="text" placeholder="Search Name, Sl.No, Budget Head, Dept, or TXN ID..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-900 outline-none focus:border-[#1E5CA8] pr-10"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 md:w-1/2">
          <div>
            <label htmlFor="room-filter" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Room (AC)</label>
            <select
              id="room-filter"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-bold text-xs text-slate-900"
              value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)}
            >
              <option value="">All 6 Units</option>
              {['101', '102', '103', '104', '105', '106'].map(r => (
                <option key={r} value={r}>Room {r}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status-filter" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Status</label>
            <select
              id="status-filter"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-bold text-xs text-slate-900"
              value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value={EntryStatus.PENDING}>Pending</option>
              <option value={EntryStatus.APPROVED}>Approved</option>
              <option value={EntryStatus.REJECTED}>Rejected</option>
            </select>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="payment-filter" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Payment</label>
            <select
              id="payment-filter"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-bold text-xs text-slate-900"
              value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="">All Payments</option>
              <option value="Paid">Paid Online</option>
              <option value="Pending">Payment Pending</option>
              <option value="Departmental">Dept Grant</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-[#1E5CA8] text-white">
              <tr>
                <th className="px-5 py-3.5 text-left font-bold text-white uppercase tracking-wider">Identity & Purpose</th>
                <th className="px-5 py-3.5 text-left font-bold text-white uppercase tracking-wider">Timeline</th>
                <th className="px-5 py-3.5 text-left font-bold text-white uppercase tracking-wider">Unit Allotted</th>
                <th className="px-5 py-3.5 text-left font-bold text-white uppercase tracking-wider">Settlement & Ledger</th>
                <th className="px-5 py-3.5 text-right font-bold text-white uppercase tracking-wider">Tariff</th>
                <th className="px-5 py-3.5 text-center font-bold text-white uppercase tracking-wider no-print">Authorization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-16 text-slate-500 font-bold">Synchronizing Records...</td></tr>
              ) : filteredEntries.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16 text-slate-400 font-medium">No matching stay records found</td></tr>
              ) : (
                filteredEntries.map(entry => {
                  const isPaid = entry.paymentStatus === 'Paid' || !!entry.transactionId;
                  const isDeptStay = entry.paymentType === PaymentType.DEPARTMENTAL;

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => navigate(`/confirmation/${entry.id}`)}>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 group-hover:text-[#1E5CA8] transition-colors">{entry.guestName}</div>
                        <div className="text-[11px] text-[#2563EB] font-mono font-bold mt-0.5">
                          {entry.slNo} &bull; {entry.bookingFor}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                          {entry.purposeOfVisit}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        <div>IN: <strong className="text-slate-900">{new Date(entry.arrivalDateTime).toLocaleDateString()}</strong></div>
                        <div>OUT: <strong className="text-slate-900">{new Date(entry.departureDateTime).toLocaleDateString()}</strong></div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 bg-blue-50 text-[#1E5CA8] text-xs font-bold rounded-lg border border-blue-200">
                          Room {entry.roomNo} (AC)
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {isDeptStay ? (
                          <div>
                            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold block w-fit mb-0.5">
                              Dept Grant Transfer
                            </span>
                            <span className="font-bold text-slate-800 block truncate max-w-[180px]">
                              {entry.budgetHead || entry.departmentName || 'Research Grant'}
                            </span>
                          </div>
                        ) : isPaid ? (
                          <div>
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold inline-flex items-center gap-1 mb-0.5 border border-emerald-200">
                              <svg className="w-2.5 h-2.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                              Paid ({entry.paymentMethod || 'Online'})
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 block truncate max-w-[180px]">
                              {entry.transactionId || 'Verified'}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold block w-fit mb-0.5 border border-amber-200">
                              Payment Pending
                            </span>
                            <span className="text-slate-500 text-[11px]">Due at Check-In</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="font-bold text-slate-900 text-sm">₹{entry.totalAmount}</div>
                        <div className="text-[11px] text-slate-400">{entry.numDays} Days</div>
                      </td>
                      <td className="px-5 py-4 text-center no-print">
                        <StatusBadge status={entry.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-xs font-bold text-slate-400 animate-pulse">Loading Records...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-8 text-center text-xs font-bold text-slate-400">Empty Recordset</div>
          ) : (
            filteredEntries.map(entry => {
              const isPaid = entry.paymentStatus === 'Paid' || !!entry.transactionId;
              const isDeptStay = entry.paymentType === PaymentType.DEPARTMENTAL;

              return (
                <Link
                  to={`/confirmation/${entry.id}`}
                  key={entry.id}
                  className="block p-4 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{entry.guestName}</h4>
                      <p className="text-[11px] text-slate-500">{entry.slNo} &bull; Room {entry.roomNo} (AC)</p>
                    </div>
                    <StatusBadge status={entry.status} />
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100">
                    <span className="font-medium text-slate-500">
                      {isDeptStay ? `Grant: ${entry.budgetHead || 'Dept'}` : isPaid ? (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Paid ({entry.paymentMethod || 'Online'})
                        </span>
                      ) : (
                        <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Pending Payment
                        </span>
                      )}
                    </span>
                    <span className="font-bold text-slate-900">₹{entry.totalAmount}</span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Audit Report Modal Launcher */}
      <AuditReportModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        entries={entries}
      />
    </div>
  );
};

export default GuestList;

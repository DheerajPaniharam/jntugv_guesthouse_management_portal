import React, { useState, useMemo } from 'react';
import { useConfig } from '../App';
import { computeAuditMetrics, exportAuditExcel, exportAuditPDF } from '../utils/auditReportGenerator';

const AuditReportModal = ({ isOpen, onClose, entries }) => {
  const { config } = useConfig();
  const [periodType, setPeriodType] = useState('MONTH'); // 'MONTH' | 'QUARTER' | 'CUSTOM'
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [selectedQuarter, setSelectedQuarter] = useState('Q2'); // Current Sep = Q2
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customStart, setCustomStart] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().slice(0, 10));

  const { startDate, endDate, periodLabel } = useMemo(() => {
    let start, end, label;
    if (periodType === 'MONTH') {
      const [y, m] = selectedMonth.split('-').map(Number);
      start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
      const lastDay = new Date(y, m, 0).getDate();
      end = new Date(y, m - 1, lastDay).toISOString().slice(0, 10);
      const monthName = new Date(y, m - 1, 1).toLocaleString('default', { month: 'long' });
      label = `${monthName} ${y}`;
    } else if (periodType === 'QUARTER') {
      const yr = Number(selectedYear);
      if (selectedQuarter === 'Q1') {
        start = `${yr}-04-01`; end = `${yr}-06-30`; label = `Q1 (Apr - Jun ${yr})`;
      } else if (selectedQuarter === 'Q2') {
        start = `${yr}-07-01`; end = `${yr}-09-30`; label = `Q2 (Jul - Sep ${yr})`;
      } else if (selectedQuarter === 'Q3') {
        start = `${yr}-10-01`; end = `${yr}-12-31`; label = `Q3 (Oct - Dec ${yr})`;
      } else {
        start = `${yr + 1}-01-01`; end = `${yr + 1}-03-31`; label = `Q4 (Jan - Mar ${yr + 1})`;
      }
    } else {
      start = customStart;
      end = customEnd;
      label = `${customStart} to ${customEnd}`;
    }
    return { startDate: start, endDate: end, periodLabel: label };
  }, [periodType, selectedMonth, selectedQuarter, selectedYear, customStart, customEnd]);

  const metrics = useMemo(() => {
    return computeAuditMetrics(entries, startDate, endDate);
  }, [entries, startDate, endDate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-[#1E5CA8] text-white flex items-center justify-between border-b-2 border-[#2563EB]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200 block">Institutional Finance</span>
              <h2 className="text-lg font-serif font-bold tracking-tight">Statutory Financial Audit Pack</h2>
              <p className="text-xs text-slate-300 font-medium">JNTU-GV Guest House official accounting report</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-grow text-xs">
          
          {/* Period Selection Controls */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Select Audit Timeframe</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPeriodType('MONTH')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  periodType === 'MONTH'
                    ? 'bg-[#1E5CA8] text-white border-[#1E5CA8] shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Monthly Report
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('QUARTER')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  periodType === 'QUARTER'
                    ? 'bg-[#1E5CA8] text-white border-[#1E5CA8] shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Quarterly (Q1 - Q4)
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('CUSTOM')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  periodType === 'CUSTOM'
                    ? 'bg-[#1E5CA8] text-white border-[#1E5CA8] shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Custom Range
              </button>
            </div>

            {/* Sub Controls */}
            {periodType === 'MONTH' && (
              <div className="pt-1">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
                />
              </div>
            )}

            {periodType === 'QUARTER' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <select
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
                >
                  <option value="Q1">Q1 (April – June)</option>
                  <option value="Q2">Q2 (July – September)</option>
                  <option value="Q3">Q3 (October – December)</option>
                  <option value="Q4">Q4 (January – March)</option>
                </select>
                <input
                  type="number"
                  min="2020"
                  max="2035"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
                />
              </div>
            )}

            {periodType === 'CUSTOM' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Audit Metrics Preview Cards */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Summary for {periodLabel}</span>
              <span className="text-xs font-bold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                {metrics.approvedCount} Audited Stays
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Gross Invoiced</span>
                <span className="text-base font-serif font-bold text-[#1E5CA8]">₹{metrics.grossInvoiced.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Personal (Cash/UPI)</span>
                <span className="text-base font-serif font-bold text-emerald-700">₹{metrics.personalCollections.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Dept Grant Debits</span>
                <span className="text-base font-serif font-bold text-purple-700">₹{metrics.departmentalTransfers.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">6 AC Room Occupancy</span>
                <span className="text-base font-serif font-bold text-[#2563EB]">{metrics.occupancyRate}%</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => exportAuditExcel(entries, periodLabel, metrics, config)}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => exportAuditPDF(entries, periodLabel, metrics, config)}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold bg-[#1E5CA8] hover:bg-[#2563EB] text-white rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Download PDF Pack
          </button>
        </div>

      </div>
    </div>
  );
};

export default AuditReportModal;

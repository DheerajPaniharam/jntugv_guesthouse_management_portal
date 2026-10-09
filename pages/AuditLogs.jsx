import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { auditApi } from '../services/api';
import { AuditActionType } from '../types';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await auditApi.getAll();
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch audit logs:', err);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return (Array.isArray(logs) ? logs : []).filter(log => {
      const matchesSearch =
        (log.summary || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.actorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.targetId || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAction = actionFilter === '' || log.action === actionFilter;

      return matchesSearch && matchesAction;
    });
  }, [logs, searchTerm, actionFilter]);

  const toggleExpand = (id) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const getActionBadge = (action) => {
    switch (action) {
      case AuditActionType.BOOKING_CREATED:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#1E5CA8] border border-blue-200">BOOKING CREATED</span>;
      case AuditActionType.STATUS_UPDATED:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">STATUS UPDATED</span>;
      case AuditActionType.STAFF_VERIFIED:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">STAFF CLEARANCE</span>;
      case AuditActionType.CONFIG_UPDATED:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">CONFIG CHANGED</span>;
      case AuditActionType.TARIFF_OVERRIDDEN:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">TARIFF OVERRIDE</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{action}</span>;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn max-w-6xl mx-auto py-2 px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB] block mb-1">Administrative Transparency</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E5CA8] tracking-tight">
            Institutional Audit Trail
          </h1>
          <p className="text-slate-600 font-medium mt-0.5 text-xs sm:text-sm">
            Immutable administrative activity ledger & forensic event timeline for JNTU-GV Guest House
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Ledger Active (Append-Only)
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-grow">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Search Events</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by Actor, Voucher, Action, or Details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-900 outline-none focus:border-[#1E5CA8]"
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
        </div>

        <div className="md:w-64">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Filter Action</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-900 outline-none"
          >
            <option value="">All Action Types</option>
            <option value={AuditActionType.BOOKING_CREATED}>Booking Created</option>
            <option value={AuditActionType.STATUS_UPDATED}>Status Updated</option>
            <option value={AuditActionType.STAFF_VERIFIED}>Staff Clearance</option>
            <option value={AuditActionType.CONFIG_UPDATED}>Config Updated</option>
            <option value={AuditActionType.TARIFF_OVERRIDDEN}>Tariff Overridden</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table / Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-semibold text-xs">
            No audit records found matching your filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {filteredLogs.map(log => {
              const isExpanded = expandedLogId === log.id;
              const hasDetails = log.details && Object.keys(log.details).length > 0;

              return (
                <div key={log.id} className="p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    
                    {/* Action & Summary */}
                    <div className="space-y-1 flex-grow">
                      <div className="flex flex-wrap items-center gap-2">
                        {getActionBadge(log.action)}
                        <span className="text-[11px] text-slate-400 font-medium">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900">
                        {log.summary}
                      </p>
                    </div>

                    {/* Actor & Action Links */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-800 block">{log.actorName}</span>
                        <span className="text-[10px] font-bold text-[#2563EB] block">{log.actorRole}</span>
                      </div>

                      {log.targetId && (
                        <Link
                          to={`/confirmation/${log.targetId}`}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#1E5CA8] hover:text-white text-slate-700 text-[11px] font-bold transition-all"
                        >
                          View Voucher
                        </Link>
                      )}

                      {hasDetails && (
                        <button
                          onClick={() => toggleExpand(log.id)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900"
                          title="View JSON Delta"
                        >
                          <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </div>

                  </div>

                  {/* Expanded Diff Block */}
                  {isExpanded && hasDetails && (
                    <div className="mt-3 p-3 rounded-xl bg-[#183B6B] text-slate-200 text-[11px] font-mono overflow-x-auto border border-slate-800">
                      <span className="text-[10px] font-bold text-blue-300 block mb-1 uppercase tracking-wider">Payload & Attribute Snapshot:</span>
                      <pre>{JSON.stringify(log.details, null, 2)}</pre>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;

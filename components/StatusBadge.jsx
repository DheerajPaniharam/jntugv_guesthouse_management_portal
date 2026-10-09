
import React from 'react';
import { EntryStatus } from '../types';

const StatusBadge = ({ status }) => {
  const styles = {
    [EntryStatus.PENDING]: 'bg-amber-50 text-amber-800 border-amber-300',
    [EntryStatus.APPROVED]: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    [EntryStatus.REJECTED]: 'bg-rose-50 text-rose-800 border-rose-300',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-sm ${styles[status] || 'bg-slate-50 text-slate-700 border-slate-300'}`}>
      {status}
    </span>
  );
};

export default StatusBadge;

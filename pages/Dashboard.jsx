import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { guestApi } from '../services/api';
import { EntryStatus, UserRole } from '../types';
import StatusBadge from '../components/StatusBadge';
import { ALL_ROOMS, getRoomStatusForDate } from './RoomMatrix';

const Dashboard = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [allSystemEntries, setAllSystemEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const data = await guestApi.getAll();
        const safeData = Array.isArray(data) ? data : [];
        setAllSystemEntries(safeData);

        // Scoped View Logic: Non-admin/staff only see their own requests
        if (user && user.role !== UserRole.ADMIN && user.role !== UserRole.STAFF) {
          setEntries(safeData.filter(e => e?.submittedBy === user?.id));
        } else if (user && user.role === UserRole.STAFF && !user.isVerified) {
          setEntries(safeData.filter(e => e?.submittedBy === user?.id));
        } else {
          setEntries(safeData);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard entries:', err);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEntries();
  }, [user]);

  const safeEntries = Array.isArray(entries) ? entries : [];

  const stats = {
    pending: safeEntries.filter(e => e?.status === EntryStatus.PENDING).length,
    approved: safeEntries.filter(e => e?.status === EntryStatus.APPROVED).length,
    total: safeEntries.length
  };

  const categories = safeEntries.reduce((acc, curr) => {
    const cat = curr?.category || 'Standard';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const maxCat = Math.max(...Object.values(categories), 1);

  // Compute 6-Room Today's Live Status
  const todayStr = new Date().toISOString().slice(0, 10);
  const roomsStatusToday = useMemo(() => {
    return ALL_ROOMS.map(room => {
      const { status, entry } = getRoomStatusForDate(room.id, todayStr, allSystemEntries);
      return { ...room, status, activeEntry: entry };
    });
  }, [todayStr, allSystemEntries]);

  const availableCount = roomsStatusToday.filter(r => r.status === 'AVAILABLE').length;

  const showVerificationAlert = user?.role === UserRole.STAFF && !user?.isVerified;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {showVerificationAlert && (
        <div className="bg-amber-50 border-2 border-amber-300 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h4 className="text-base font-bold text-amber-900">Institutional Clearance Pending</h4>
            <p className="text-sm font-medium text-amber-800 mt-0.5">Your staff credentials are being reviewed by the Estate Office. Access to the global guest register is restricted until verified.</p>
          </div>
        </div>
      )}

      {/* JNTUGV Header Bar */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
            <span className="text-xs font-bold uppercase tracking-widest text-[#154B8A]">JNTU-GV Guest House Management Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#154B8A] tracking-tight mt-1">
            {user?.role === UserRole.ADMIN || (user?.role === UserRole.STAFF && user.isVerified) ? 'Administrative Control Center' : 'Guest Stay Desk'}
          </h1>
          <p className="text-slate-600 font-medium mt-0.5 text-xs sm:text-sm">
            Live Room Occupancy & Institutional Reservation Management
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/room-matrix"
            className="inline-flex items-center justify-center px-4 sm:px-5 py-3 bg-slate-50 border border-slate-300 text-[#154B8A] font-bold text-xs rounded-xl hover:bg-slate-100 hover:shadow-md transition-all"
          >
            <svg className="w-4 h-4 mr-2 text-[#1E5CA8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Room Matrix
          </Link>
          <Link
            to="/new-entry"
            className="inline-flex items-center justify-center px-5 sm:px-7 py-3 bg-[#154B8A] hover:bg-[#1E5CA8] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-95"
          >
            <svg className="w-4 h-4 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Request a Stay
          </Link>
        </div>
      </header>

      {/* Guest Rooms Status Strip */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="text-sm font-bold text-[#154B8A]">Guest Rooms Status (Today)</h3>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              {availableCount} of 6 Units Available
            </span>
            <Link to="/room-matrix" className="font-bold text-[#1E5CA8] hover:text-[#154B8A] hover:underline flex items-center gap-1">
              Open Full Matrix <span>&rarr;</span>
            </Link>
          </div>
        </div>

        {/* 6-Room Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {roomsStatusToday.map(room => {
            const isAvail = room.status === 'AVAILABLE';
            const isOcc = room.status === 'OCCUPIED';

            return (
              <Link
                key={room.id}
                to="/room-matrix"
                className={`p-4 rounded-xl border text-center transition-all hover:shadow-md hover:-translate-y-0.5 ${
                  isAvail
                    ? 'bg-emerald-50/80 border-emerald-200 hover:border-emerald-400'
                    : isOcc
                    ? 'bg-rose-50/80 border-rose-200 hover:border-rose-400'
                    : 'bg-amber-50/80 border-amber-200 hover:border-amber-400'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className={`w-2 h-2 rounded-full ${isAvail ? 'bg-emerald-500' : isOcc ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                  <span className="text-base font-black text-slate-900">{room.name}</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1">AC ROOM</span>
                {isAvail && <span className="text-xs font-bold text-emerald-700">Available</span>}
                {isOcc && <span className="text-xs font-bold text-rose-700">Occupied</span>}
                {!isAvail && !isOcc && <span className="text-xs font-bold text-amber-700">Reserved</span>}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white p-6 rounded-2xl border-l-4 border-l-[#2563EB] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-slate-600 font-bold text-xs uppercase tracking-wider">Awaiting Verification</h3>
            <span className="p-2 bg-blue-100 text-[#1E5CA8] rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <p className="text-3xl sm:text-4xl font-serif font-bold text-[#154B8A] tracking-tight">{stats.pending}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">Pending approval requests</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border-l-4 border-l-emerald-600 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-slate-600 font-bold text-xs uppercase tracking-wider">Authorized Stays</h3>
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <p className="text-3xl sm:text-4xl font-serif font-bold text-[#154B8A] tracking-tight">{stats.approved}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">Confirmed guest allotments</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border-l-4 border-l-[#154B8A] border border-slate-200 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-slate-600 font-bold text-xs uppercase tracking-wider">Total Ledger Entries</h3>
            <span className="p-2 bg-blue-100 text-[#154B8A] rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </span>
          </div>
          <p className="text-3xl sm:text-4xl font-serif font-bold text-[#154B8A] tracking-tight">{stats.total}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">Cumulative bookings logged</p>
        </div>
      </div>

      {/* Stay Demographics & Recent Activity Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-[#154B8A] p-6 sm:p-7 rounded-2xl text-white shadow-md border-t-4 border-[#2563EB]">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/10">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Stay Demographics</h3>
            <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded text-white/80">JNTU-GV Protocol</span>
          </div>
          <div className="space-y-4">
            {Object.entries(categories).map(([name, count]) => (
              <div key={name} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="truncate mr-2 text-slate-200">{name}</span>
                  <span className="text-blue-200">{count}</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA] rounded-full transition-all duration-1000"
                    style={{ width: `${((count) / maxCat) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {Object.keys(categories).length === 0 && (
              <p className="text-xs font-bold text-slate-400 text-center py-8">No demographic records available</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-[#154B8A] tracking-tight">Recent Guest Bookings</h2>
              <p className="text-xs text-slate-500">Latest reservations and official stays</p>
            </div>
            {user?.role === UserRole.ADMIN && (
              <Link to="/guest-list" className="text-xs font-bold text-[#154B8A] hover:text-[#1E5CA8] hover:underline flex items-center gap-1">
                Full Register &rarr;
              </Link>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[500px] md:min-w-0">
              <thead className="bg-[#154B8A] text-white text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Guest & Voucher</th>
                  <th className="px-5 py-3.5">Allotted Unit</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {safeEntries.slice(0, 5).map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900 truncate max-w-[140px] sm:max-w-none">{entry.guestName}</div>
                      <div className="text-[11px] text-[#1E5CA8] font-mono font-bold">{entry.slNo}</div>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-800">Room {entry.roomNo} (AC)</td>
                    <td className="px-5 py-4"><StatusBadge status={entry.status} /></td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/confirmation/${entry.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-[#154B8A] text-slate-700 hover:text-white rounded-lg text-xs font-bold transition-all"
                      >
                        Voucher
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
                {safeEntries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400 font-medium">
                      No active bookings recorded in this view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

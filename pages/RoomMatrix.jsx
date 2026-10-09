import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { guestApi, roomApi, DEFAULT_ROOMS } from '../services/api';
import { EntryStatus, PaymentType } from '../types';

export const ALL_ROOMS = DEFAULT_ROOMS;

export const getRoomStatusForDate = (roomNo, targetDateStr, entries) => {
  const targetDate = new Date(targetDateStr);
  targetDate.setHours(12, 0, 0, 0); // Check midday

  const safeEntries = Array.isArray(entries) ? entries : [];

  for (const entry of safeEntries) {
    if (String(entry.roomNo) !== String(roomNo)) continue;
    if (entry.status === EntryStatus.REJECTED) continue;

    const arrival = new Date(entry.arrivalDateTime);
    const departure = new Date(entry.departureDateTime);

    if (targetDate >= arrival && targetDate <= departure) {
      if (entry.status === EntryStatus.APPROVED) {
        return { status: 'OCCUPIED', entry };
      } else {
        return { status: 'RESERVED_PENDING', entry };
      }
    }
  }

  return { status: 'AVAILABLE', entry: null };
};

const RoomMatrix = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [rooms, setRooms] = useState(DEFAULT_ROOMS);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedRoomDetails, setSelectedRoomDetails] = useState(null);
  const [viewMode, setViewMode] = useState('GRID'); // 'GRID' | 'TIMELINE'

  const refreshData = () => {
    Promise.all([
      guestApi.getAll().catch(() => []),
      roomApi.getAll().catch(() => DEFAULT_ROOMS)
    ]).then(([guestData, roomData]) => {
      setEntries(Array.isArray(guestData) ? guestData : []);
      if (Array.isArray(roomData) && roomData.length > 0) {
        setRooms(roomData);
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    refreshData();

    // Real-Time Desk Sync via SSE
    const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    const sseUrl = isProd ? `${window.location.origin}/api/events` : 'http://localhost:5000/api/events';

    let eventSource;
    try {
      eventSource = new EventSource(sseUrl);
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'BOOKING_CREATED' || data.type === 'BOOKING_UPDATED' || data.type === 'ROOMS_CHANGED') {
            refreshData();
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

  // Compute status for all rooms on selected date
  const roomStatusList = useMemo(() => {
    return rooms.map(room => {
      const roomId = String(room.roomNumber || room.id);
      const { status, entry } = getRoomStatusForDate(roomId, selectedDate, entries);
      return {
        ...room,
        id: roomId,
        name: room.name || `Room ${roomId}`,
        status,
        activeEntry: entry
      };
    });
  }, [rooms, selectedDate, entries]);

  // Compute summary counts
  const availableCount = roomStatusList.filter(r => r.status === 'AVAILABLE').length;
  const occupiedCount = roomStatusList.filter(r => r.status === 'OCCUPIED').length;
  const reservedCount = roomStatusList.filter(r => r.status === 'RESERVED_PENDING').length;

  // Generate 7-day strip for timeline view
  const weekDays = useMemo(() => {
    const base = new Date(selectedDate);
    const days = [];
    for (let i = -2; i <= 4; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      days.push({
        dateStr: d.toISOString().slice(0, 10),
        dayName: d.toLocaleDateString('default', { weekday: 'short' }),
        dayNum: d.getDate(),
        monthName: d.toLocaleDateString('default', { month: 'short' }),
        isToday: d.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10),
        isSelected: d.toISOString().slice(0, 10) === selectedDate
      });
    }
    return days;
  }, [selectedDate]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().slice(0, 10));
  };

  const handleBookRoom = (roomId) => {
    navigate('/new-entry', {
      state: {
        prefillRoom: roomId,
        prefillDate: selectedDate
      }
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* JNTUGV Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
            <span className="text-xs font-bold uppercase tracking-widest text-[#1E5CA8]">Estate Management Section</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E5CA8] tracking-tight mt-1">
            Room Availability Matrix
          </h1>
          <p className="text-slate-600 font-medium mt-0.5 text-xs sm:text-sm">
            Live schedule & occupancy status for 6 University Guest House AC units
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'GRID' ? 'TIMELINE' : 'GRID')}
            className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 font-bold text-xs text-[#1E5CA8] hover:bg-slate-100 hover:shadow-sm transition-all flex items-center gap-2"
          >
            {viewMode === 'GRID' ? (
              <>
                <svg className="w-4 h-4 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Timeline View
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                Grid View
              </>
            )}
          </button>
        </div>
      </div>

      {/* Date Navigation Bar & Legend */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Date Selector Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={handlePrevDay}
              className="p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-[#1E5CA8] hover:bg-slate-100"
              title="Previous Day"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            </button>

            <button
              onClick={handleToday}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold text-xs text-[#1E5CA8] hover:bg-slate-100"
            >
              Today
            </button>

            <button
              onClick={handleNextDay}
              className="p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-[#1E5CA8] hover:bg-slate-100"
              title="Next Day"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-[#1E5CA8] outline-none focus:border-[#1E5CA8]"
            />
          </div>

          {/* Real-time Status Legend */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-800">
                Available ({availableCount})
              </span>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm"></span>
              <span className="text-xs font-bold text-rose-800">
                Occupied ({occupiedCount})
              </span>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm"></span>
              <span className="text-xs font-bold text-amber-800">
                Reserved / Pending ({reservedCount})
              </span>
            </div>
          </div>

        </div>

        {/* 7-Day Quick Strip */}
        <div className="grid grid-cols-7 gap-2 pt-3 border-t border-slate-100">
          {weekDays.map(day => (
            <button
              key={day.dateStr}
              onClick={() => setSelectedDate(day.dateStr)}
              className={`p-2.5 rounded-xl text-center transition-all ${
                day.isSelected
                  ? 'bg-[#1E5CA8] text-white shadow-md'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <span className="text-[10px] font-bold block uppercase tracking-wider opacity-80">{day.dayName}</span>
              <span className="text-sm sm:text-base font-extrabold block">{day.dayNum}</span>
              <span className="text-[9px] font-semibold block opacity-75">{day.monthName}</span>
            </button>
          ))}
        </div>
      </div>

      {/* View Mode 1: 6-Room Grid View */}
      {viewMode === 'GRID' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {roomStatusList.map(room => {
            const isAvailable = room.status === 'AVAILABLE';
            const isOccupied = room.status === 'OCCUPIED';
            const isReserved = room.status === 'RESERVED_PENDING';

            return (
              <div
                key={room.id}
                onClick={() => setSelectedRoomDetails(room)}
                className={`group cursor-pointer rounded-2xl p-6 border transition-all duration-300 bg-white hover:shadow-lg ${
                  isAvailable
                    ? 'border-emerald-200 hover:border-emerald-500'
                    : isOccupied
                    ? 'border-rose-200 hover:border-rose-500'
                    : 'border-amber-200 hover:border-amber-500'
                }`}
              >
                {/* Card Top */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-2xl font-serif font-black text-[#1E5CA8] tracking-tight">{room.name}</span>
                    <span className="text-xs font-bold text-[#2563EB] block mt-0.5">{room.type || 'AC Room'}</span>
                  </div>

                  {/* Status Badge */}
                  {isAvailable && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      <span className="w-2 h-2 mr-1.5 rounded-full bg-emerald-500"></span>
                      Available
                    </span>
                  )}
                  {isOccupied && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                      <span className="w-2 h-2 mr-1.5 rounded-full bg-rose-500"></span>
                      Occupied
                    </span>
                  )}
                  {isReserved && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      <span className="w-2 h-2 mr-1.5 rounded-full bg-amber-500"></span>
                      Reserved / Pending
                    </span>
                  )}
                </div>

                {/* Card Body */}
                <div className="py-3 border-t border-slate-100 space-y-2 text-xs">
                  {isAvailable ? (
                    <div className="py-4 text-center text-slate-500">
                      <svg className="w-8 h-8 mx-auto mb-1 text-emerald-500 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      <p className="font-bold text-emerald-700">Ready for instant reservation</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Guest:</span>
                        <span className="font-bold text-slate-900 truncate max-w-[160px]">{room.activeEntry?.guestName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Category:</span>
                        <span className="font-semibold text-slate-700 truncate max-w-[160px]">{room.activeEntry?.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Checkout:</span>
                        <span className="font-semibold text-slate-700">
                          {room.activeEntry?.departureDateTime ? new Date(room.activeEntry.departureDateTime).toLocaleDateString() : '-'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  {isAvailable ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookRoom(room.id);
                      }}
                      className="w-full py-2.5 px-4 bg-[#1E5CA8] hover:bg-[#2563EB] text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                      Book Room {room.id}
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedRoomDetails(room)}
                      className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-[#1E5CA8] rounded-xl font-bold text-xs transition-all text-center"
                    >
                      View Details & Voucher
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* View Mode 2: Multi-day Timeline Grid */}
      {viewMode === 'TIMELINE' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1E5CA8] text-white border-b border-slate-200">
                  <th className="p-4 sm:p-5 font-bold text-xs uppercase tracking-wider w-44">Room</th>
                  {weekDays.map(day => (
                    <th key={day.dateStr} className={`p-4 text-center border-l border-white/10 ${day.isSelected ? 'bg-[#2563EB] text-white' : 'text-slate-200'}`}>
                      <span className="text-[10px] font-bold block">{day.dayName}</span>
                      <span className="text-sm font-extrabold">{day.dayNum} {day.monthName}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ALL_ROOMS.map(room => (
                  <tr key={room.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 sm:p-5 font-bold text-slate-900">
                      <div className="flex flex-col">
                        <span className="text-base font-serif font-bold text-[#1E5CA8]">{room.name}</span>
                        <span className="text-[11px] font-semibold text-[#2563EB]">{room.type || 'AC Room'}</span>
                      </div>
                    </td>
                    {weekDays.map(day => {
                      const { status, entry } = getRoomStatusForDate(room.id, day.dateStr, entries);
                      const isAvail = status === 'AVAILABLE';
                      const isOcc = status === 'OCCUPIED';

                      return (
                        <td
                          key={day.dateStr}
                          onClick={() => {
                            if (entry) setSelectedRoomDetails({ ...room, status, activeEntry: entry });
                            else handleBookRoom(room.id);
                          }}
                          className="p-3 text-center border-l border-slate-100 cursor-pointer transition-all hover:opacity-85"
                        >
                          {isAvail && (
                            <div className="py-2.5 px-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                              Available
                            </div>
                          )}
                          {isOcc && (
                            <div className="py-2 px-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold">
                              <span className="block truncate max-w-[90px] mx-auto">{entry?.guestName?.split(' ')[0] || 'Occupied'}</span>
                              <span className="text-[9px] block opacity-75">Occupied</span>
                            </div>
                          )}
                          {!isAvail && !isOcc && (
                            <div className="py-2 px-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                              <span className="block truncate max-w-[90px] mx-auto">{entry?.guestName?.split(' ')[0] || 'Reserved'}</span>
                              <span className="text-[9px] block opacity-75">Pending</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Room Details Modal */}
      {selectedRoomDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6 bg-[#1E5CA8] text-white flex items-center justify-between border-b border-blue-600">
              <div>
                <h3 className="text-lg font-serif font-bold text-white">{selectedRoomDetails.name} Booking Overview</h3>
                <span className="text-xs text-blue-200 font-bold">{selectedRoomDetails.type || 'AC Room'}</span>
              </div>
              <button
                onClick={() => setSelectedRoomDetails(null)}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {selectedRoomDetails.activeEntry ? (
                <div className="space-y-3 text-xs">
                  <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Voucher / Sl No:</span>
                      <span className="font-bold text-[#1E5CA8] font-mono">{selectedRoomDetails.activeEntry.slNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Guest Name:</span>
                      <span className="font-bold text-slate-900">{selectedRoomDetails.activeEntry.guestName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Phone:</span>
                      <span className="font-bold text-slate-900">{selectedRoomDetails.activeEntry.phoneNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Category:</span>
                      <span className="font-bold text-slate-900">{selectedRoomDetails.activeEntry.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Payment Mode:</span>
                      <span className="font-bold text-purple-700">
                        {selectedRoomDetails.activeEntry.paymentType === PaymentType.DEPARTMENTAL ? `Dept Transfer (${selectedRoomDetails.activeEntry.budgetHead || 'Grant'})` : 'Personal Payment'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Stay Period:</span>
                      <span className="font-bold text-slate-900">
                        {new Date(selectedRoomDetails.activeEntry.arrivalDateTime).toLocaleDateString()} to {new Date(selectedRoomDetails.activeEntry.departureDateTime).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <svg className="w-10 h-10 text-emerald-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  <p className="text-sm font-bold text-emerald-800">
                    This unit is available for reservation on {selectedDate}.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setSelectedRoomDetails(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Close
              </button>
              {selectedRoomDetails.activeEntry ? (
                <button
                  onClick={() => navigate(`/confirmation/${selectedRoomDetails.activeEntry.id}`)}
                  className="px-4 py-2 text-xs font-bold bg-[#1E5CA8] hover:bg-[#2563EB] text-white rounded-xl shadow-sm"
                >
                  View Official Voucher
                </button>
              ) : (
                <button
                  onClick={() => handleBookRoom(selectedRoomDetails.id)}
                  className="px-4 py-2 text-xs font-bold bg-[#1E5CA8] hover:bg-[#2563EB] text-white rounded-xl shadow-sm"
                >
                  Book Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RoomMatrix;

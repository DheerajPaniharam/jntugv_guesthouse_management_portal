import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { notificationApi } from '../services/api';

const NotificationBell = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const data = await notificationApi.getAll();
            setNotifications(data || []);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 15000); // Polling every 15s
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id, e) => {
        e.stopPropagation();
        await notificationApi.markAsRead(id);
        fetchNotifications();
    };

    const handleMarkAllAsRead = async () => {
        await notificationApi.markAllAsRead();
        fetchNotifications();
    };

    const unreadCount = (notifications || []).filter(n => !n.isRead).length;

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#1E5CA8] transition-colors relative border border-slate-200"
                title="Notifications"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-rose-600 rounded-full border-2 border-white">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden transform origin-top-right transition-all">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-[#1E5CA8] text-white">
                        <h3 className="text-xs font-serif font-bold tracking-wider uppercase text-white">System Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-xs text-slate-200 hover:text-white font-bold hover:underline"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>
                    <div className="max-h-80 overflow-y-auto overscroll-contain text-xs">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 font-medium">
                                No active notifications.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {notifications.map(n => (
                                    <div
                                        key={n.id}
                                        className={`p-3.5 transition-colors hover:bg-slate-50 ${!n.isRead ? 'bg-blue-50/60' : ''}`}
                                    >
                                        <div className="flex gap-2.5">
                                            <div className="flex-shrink-0 mt-1">
                                                {n.type === 'SUCCESS' && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                                                {n.type === 'ERROR' && <div className="w-2 h-2 rounded-full bg-rose-500"></div>}
                                                {n.type === 'INFO' && <div className="w-2 h-2 rounded-full bg-[#1E5CA8]"></div>}
                                                {n.type === 'WARNING' && <div className="w-2 h-2 rounded-full bg-amber-500"></div>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs ${!n.isRead ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                                                    {n.message}
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                                    {n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Just now'}
                                                </p>
                                            </div>
                                            {!n.isRead && (
                                                <button
                                                    onClick={(e) => handleMarkAsRead(n.id, e)}
                                                    className="flex-shrink-0 text-xs text-[#1E5CA8] font-bold hover:underline px-1.5 py-0.5"
                                                >
                                                    Read
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;

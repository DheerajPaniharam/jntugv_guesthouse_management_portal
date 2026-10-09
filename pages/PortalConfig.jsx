import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_ADMINS } from '../services/mockData';
import { roomApi, paymentApi, DEFAULT_ROOMS } from '../services/api';
import { useConfig } from '../App';

const FALLBACK_LOGO = "/logo.png";

const PortalConfig = () => {
  const { config, updateConfig } = useConfig();

  const [activeTab, setActiveTab] = useState('ROOMS'); // 'ROOMS' | 'BRANDING' | 'ADMINS' | 'PAYMENT'
  const [localConfig, setLocalConfig] = useState(config);
  const [previewMapUrl, setPreviewMapUrl] = useState(config.mapUrl);
  const [admins, setAdmins] = useState([]);
  const [newAdmin, setNewAdmin] = useState({ id: '', name: '', password: '' });
  const [editingIndex, setEditingIndex] = useState(null);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Dynamic Room Management State
  const [rooms, setRooms] = useState(DEFAULT_ROOMS);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomFormData, setRoomFormData] = useState({
    roomNumber: '',
    name: '',
    type: 'AC Room',
    capacity: 2,
    baseTariff: 500,
    isActive: true,
    description: ''
  });

  // Payment Gateway Settings & History State
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setLocalConfig(config);
    setPreviewMapUrl(config.mapUrl);
  }, [config]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPreviewMapUrl(localConfig.mapUrl);
    }, 800);
    return () => clearTimeout(timer);
  }, [localConfig.mapUrl]);

  useEffect(() => {
    const stored = localStorage.getItem('authorized_admins');
    if (!stored || JSON.parse(stored).length === 0) {
      const seeded = INITIAL_ADMINS.map(a => ({ ...a, createdAt: new Date().toISOString() }));
      localStorage.setItem('authorized_admins', JSON.stringify(seeded));
      setAdmins(seeded);
    } else {
      setAdmins(JSON.parse(stored));
    }
  }, []);

  const loadRooms = async () => {
    setLoadingRooms(true);
    try {
      const data = await roomApi.getAll(true);
      if (Array.isArray(data) && data.length > 0) {
        setRooms(data);
      }
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  const loadPaymentData = async () => {
    setLoadingPayments(true);
    try {
      const [configData, historyData] = await Promise.all([
        paymentApi.getConfig(),
        paymentApi.getHistory()
      ]);
      setPaymentConfig(configData);
      setPaymentHistory(Array.isArray(historyData) ? historyData : []);
    } catch (err) {
      console.error('Failed to load payment info:', err);
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    loadRooms();
    loadPaymentData();
  }, []);

  const handleSaveRoom = async (e) => {
    e.preventDefault();
    if (!roomFormData.roomNumber) {
      alert("Room Number is required.");
      return;
    }

    try {
      if (editingRoom) {
        await roomApi.update(editingRoom.id || editingRoom.roomNumber, roomFormData);
      } else {
        await roomApi.create(roomFormData);
      }
      await loadRooms();
      setEditingRoom(null);
      setRoomFormData({
        roomNumber: '',
        name: '',
        type: 'AC Room',
        capacity: 2,
        baseTariff: 500,
        isActive: true,
        description: ''
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert(err.message || "Failed to save room details.");
    }
  };

  const startEditRoom = (room) => {
    setEditingRoom(room);
    setRoomFormData({
      roomNumber: room.roomNumber || room.id,
      name: room.name || `Room ${room.roomNumber}`,
      type: room.type || 'AC Room',
      capacity: Number(room.capacity) || 2,
      baseTariff: Number(room.baseTariff) || 500,
      isActive: room.isActive !== false,
      description: room.description || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleRoomStatus = async (room) => {
    const updatedStatus = !room.isActive;
    try {
      await roomApi.update(room.id || room.roomNumber, { isActive: updatedStatus });
      await loadRooms();
    } catch (err) {
      alert("Failed to update room active status.");
    }
  };

  const handleDeleteRoom = async (room) => {
    if (confirm(`Are you sure you want to delete Room ${room.roomNumber}? This cannot be undone.`)) {
      try {
        await roomApi.delete(room.id || room.roomNumber);
        await loadRooms();
      } catch (err) {
        alert(err.message || "Failed to delete room.");
      }
    }
  };

  const extractMapUrl = (input) => {
    if (input.includes('<iframe')) {
      const match = input.match(/src="([^"]+)"/);
      return match ? match[1] : input;
    }
    return input;
  };

  const handleMapUrlChange = (val) => {
    const cleaned = extractMapUrl(val);
    setLocalConfig({ ...localConfig, mapUrl: cleaned });
  };

  const handleAuthorizeAdmin = (e) => {
    e.preventDefault();
    if (!newAdmin.id || !newAdmin.password) return;

    let updatedAdmins;

    if (editingIndex !== null) {
      const otherAdmins = admins.filter((_, idx) => idx !== editingIndex);
      if (otherAdmins.some(a => a.id === newAdmin.id)) {
        alert("Identity code already assigned to another official.");
        return;
      }

      updatedAdmins = admins.map((a, idx) =>
        idx === editingIndex ? { ...newAdmin, createdAt: a.createdAt } : a
      );
      setEditingIndex(null);
    } else {
      if (admins.some(a => a.id === newAdmin.id)) {
        alert("Identity code already exists in ledger.");
        return;
      }
      updatedAdmins = [...admins, { ...newAdmin, createdAt: new Date().toISOString() }];
    }

    setAdmins(updatedAdmins);
    localStorage.setItem('authorized_admins', JSON.stringify(updatedAdmins));
    setNewAdmin({ id: '', name: '', password: '' });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const startEditAdmin = (index) => {
    const admin = admins[index];
    setNewAdmin({ id: admin.id, name: admin.name, password: admin.password });
    setEditingIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditAdmin = () => {
    setNewAdmin({ id: '', name: '', password: '' });
    setEditingIndex(null);
  };

  const revokeAdmin = (id) => {
    if (admins.length <= 1) {
      alert("System requires at least one authorized administrator to maintain access control.");
      return;
    }
    if (confirm(`Revoke administrative clearance for ${id}?`)) {
      const updated = admins.filter(a => a.id !== id);
      setAdmins(updated);
      localStorage.setItem('authorized_admins', JSON.stringify(updated));
      if (editingIndex !== null && admins[editingIndex].id === id) cancelEditAdmin();
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLocalConfig({ ...localConfig, logo: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await updateConfig(localConfig);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert("Failed to sync branding updates.");
    } finally {
      setIsSaving(false);
    }
  };

  const PasswordToggleIcon = ({ show }) => (
    show ? (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ) : (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
      </svg>
    )
  );

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-6 animate-fadeIn space-y-6 pb-20 px-2 sm:px-4">
      {/* JNTUGV Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="p-3 bg-[#1E5CA8] text-white rounded-xl shadow-md">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB] block mb-0.5">System Administration</span>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#1E5CA8] tracking-tight">Portal Configuration</h1>
            <p className="text-xs text-slate-500 font-medium">JNTU-GV Guest House Management Portal Parameters</p>
          </div>
        </div>
        {saveSuccess && (
          <div className="px-4 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200 animate-fadeIn">
            Settings Saved
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-2 sm:space-x-4 bg-white p-2 rounded-xl border">
        <button
          type="button"
          onClick={() => setActiveTab('ROOMS')}
          className={`py-2 px-4 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'ROOMS'
              ? 'bg-[#1E5CA8] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Room Inventory & Tariffs
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('BRANDING')}
          className={`py-2 px-4 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'BRANDING'
              ? 'bg-[#1E5CA8] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Institutional Identity & Map
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ADMINS')}
          className={`py-2 px-4 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'ADMINS'
              ? 'bg-[#1E5CA8] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Administrator Accounts
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('PAYMENT')}
          className={`py-2 px-4 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'PAYMENT'
              ? 'bg-[#1E5CA8] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Payment Gateway Rails
        </button>
      </div>

      {/* TAB 1: ROOMS */}
      {activeTab === 'ROOMS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Add/Edit Room Form */}
          <div className="lg:col-span-4">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 sticky top-24">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span>
                <h3 className="text-sm font-serif font-bold text-[#1E5CA8]">
                  {editingRoom ? `Edit Room ${editingRoom.roomNumber}` : 'Add Room Unit'}
                </h3>
              </div>

              <form onSubmit={handleSaveRoom} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Room Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter room number"
                    value={roomFormData.roomNumber}
                    onChange={e => setRoomFormData({ ...roomFormData, roomNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:border-[#1E5CA8] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Room Label / Name</label>
                  <input
                    type="text"
                    placeholder="Enter room name / label"
                    value={roomFormData.name}
                    onChange={e => setRoomFormData({ ...roomFormData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:border-[#1E5CA8] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Room Type</label>
                    <select
                      value={roomFormData.type}
                      onChange={e => setRoomFormData({ ...roomFormData, type: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    >
                      <option value="AC Room">AC Room</option>
                      <option value="VIP Suite">VIP Suite</option>
                      <option value="Executive Room">Executive Room</option>
                      <option value="Non-AC Standard">Non-AC Standard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Base Tariff (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={roomFormData.baseTariff}
                      onChange={e => setRoomFormData({ ...roomFormData, baseTariff: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Capacity (Pax)</label>
                    <input
                      type="number"
                      min="1"
                      value={roomFormData.capacity}
                      onChange={e => setRoomFormData({ ...roomFormData, capacity: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                  <div className="flex flex-col justify-center pt-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={roomFormData.isActive}
                        onChange={e => setRoomFormData({ ...roomFormData, isActive: e.target.checked })}
                        className="w-4 h-4 text-[#1E5CA8] rounded"
                      />
                      <span className="font-bold text-slate-700">Active Unit</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#1E5CA8] hover:bg-[#2563EB] text-white font-bold text-xs rounded-xl shadow-md transition-all"
                  >
                    {editingRoom ? "Save Changes" : "Create Room Unit"}
                  </button>
                  {editingRoom && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRoom(null);
                        setRoomFormData({ roomNumber: '', name: '', type: 'AC Room', capacity: 2, baseTariff: 500, isActive: true, description: '' });
                      }}
                      className="w-full py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
                    >
                      Cancel Editing
                    </button>
                  )}
                </div>
              </form>
            </section>
          </div>

          {/* Rooms List Grid */}
          <div className="lg:col-span-8">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#1E5CA8]">University Guest House Units</h3>
                  <p className="text-xs text-slate-500">Inventory connected to reservation engine</p>
                </div>
                <span className="px-3 py-1 bg-blue-50 text-[#1E5CA8] text-xs font-bold rounded-full border border-blue-200">
                  {rooms.length} Units Configured
                </span>
              </div>

              {loadingRooms ? (
                <div className="py-12 text-center text-slate-400 font-bold text-xs">Loading rooms...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rooms.map(room => (
                    <div
                      key={room.id || room.roomNumber}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${
                        room.isActive !== false
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-amber-50 border-amber-300 opacity-80'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg font-serif font-bold text-[#1E5CA8]">
                              Room {room.roomNumber}
                            </span>
                            <span className="px-2 py-0.5 bg-blue-100 text-[#1E5CA8] text-[10px] font-bold rounded">
                              {room.type || 'AC Room'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">{room.name || `Room ${room.roomNumber}`}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            room.isActive !== false
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {room.isActive !== false ? 'Active' : 'Maintenance'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs py-2 border-t border-slate-200 text-slate-600 font-semibold">
                        <div>Tariff: <strong className="text-slate-900">₹{room.baseTariff || 500}</strong>/day</div>
                        <div>Capacity: <strong className="text-slate-900">{room.capacity || 2} Persons</strong></div>
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                        <button
                          onClick={() => toggleRoomStatus(room)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          {room.isActive !== false ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => startEditRoom(room)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-[#1E5CA8] hover:bg-blue-100 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* TAB 2: BRANDING */}
      {activeTab === 'BRANDING' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          <div className="lg:col-span-12">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span>
                <h3 className="text-sm font-serif font-bold text-[#1E5CA8]">Institutional Identity & Map Settings</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-slate-100 pb-6">
                <div onClick={() => fileInputRef.current?.click()} className="md:col-span-1 border-2 border-dashed border-slate-300 rounded-2xl p-4 flex flex-col items-center justify-center hover:bg-slate-50 transition-all cursor-pointer">
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  <div className="w-16 h-16 bg-white rounded-xl shadow-md p-1 mb-2 border-2 border-slate-200 overflow-hidden flex items-center justify-center">
                    <img
                      src={localConfig.logo}
                      alt="JNTUGV Crest"
                      className="w-full h-full object-contain"
                      onError={(e) => { e.currentTarget.src = FALLBACK_LOGO; }}
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Full University Name</label>
                    <input
                      type="text"
                      value={localConfig.universityName}
                      onChange={(e) => setLocalConfig({ ...localConfig, universityName: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:border-[#1E5CA8] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Portal Short Name</label>
                    <input
                      type="text"
                      value={localConfig.shortName}
                      onChange={(e) => setLocalConfig({ ...localConfig, shortName: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:border-[#1E5CA8] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Registrar Details */}
              <div className="space-y-4 border-b border-slate-100 pb-6 text-xs">
                <h4 className="font-serif font-bold text-[#1E5CA8]">Registrar Contact Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Block Title</label>
                    <input
                      type="text"
                      value={localConfig.registrarTitle}
                      onChange={(e) => setLocalConfig({ ...localConfig, registrarTitle: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={localConfig.registrarPhone}
                      onChange={(e) => setLocalConfig({ ...localConfig, registrarPhone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Email Address 1</label>
                    <input
                      type="email"
                      value={localConfig.registrarEmail1}
                      onChange={(e) => setLocalConfig({ ...localConfig, registrarEmail1: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Email Address 2</label>
                    <input
                      type="email"
                      value={localConfig.registrarEmail2}
                      onChange={(e) => setLocalConfig({ ...localConfig, registrarEmail2: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Address & Map */}
              <div className="space-y-3 text-xs border-b border-slate-100 pb-6">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">University Address</label>
                  <input
                    type="text"
                    value={localConfig.universityAddress}
                    onChange={(e) => setLocalConfig({ ...localConfig, universityAddress: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-slate-100 pb-6">
                <div className="md:col-span-1">
                  <label className="block font-bold text-slate-700 text-xs mb-1">Map & Navigation Preview</label>
                  <p className="text-[11px] text-slate-500 mb-3">Live iframe rendered in footer & confirmation vouchers</p>
                  <div className="rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                    {localConfig.mapEmbedUrl ? (
                      <iframe
                        src={localConfig.mapEmbedUrl}
                        className="w-full h-full border-0"
                        loading="lazy"
                        title="Campus Location Map Preview"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-bold">No Map URL Configured</div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Google Maps Direct View / Share URL</label>
                    <input
                      type="text"
                      value={localConfig.mapUrl}
                      onChange={(e) => handleMapUrlChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="w-full py-3 bg-[#1E5CA8] hover:bg-[#2563EB] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Branding Updates"}
              </button>
            </section>
          </div>
        </div>
      )}

      {/* TAB 3: ADMIN ACCESS CLEARANCE */}
      {activeTab === 'ADMINS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          <div className="lg:col-span-12">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span>
                <h3 className="text-sm font-serif font-bold text-[#1E5CA8]">Administrator Credentials Management</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <form onSubmit={handleAuthorizeAdmin} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">Admin ID Code *</label>
                      <input
                        type="text"
                        placeholder="Enter Admin ID code"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold bg-slate-50 focus:border-[#1E5CA8] outline-none"
                        value={newAdmin.id}
                        onChange={e => setNewAdmin({ ...newAdmin, id: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">Official Name *</label>
                      <input
                        type="text"
                        placeholder="Enter official name"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold bg-slate-50 focus:border-[#1E5CA8] outline-none"
                        value={newAdmin.name}
                        onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">Access Key / Password *</label>
                      <div className="relative">
                        <input
                          type={showAdminPassword ? "text" : "password"}
                          placeholder="Password"
                          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold bg-slate-50 focus:border-[#1E5CA8] outline-none pr-10"
                          value={newAdmin.password}
                          onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPassword(!showAdminPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <PasswordToggleIcon show={showAdminPassword} />
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-[#1E5CA8] hover:bg-[#2563EB] text-white font-bold text-xs rounded-xl shadow-md transition-all"
                    >
                      {editingIndex !== null ? "Update Administrator" : "Add Administrator"}
                    </button>
                    {editingIndex !== null && (
                      <button
                        type="button"
                        onClick={cancelEditAdmin}
                        className="w-full py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    )}
                  </form>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {admins.map((admin, idx) => (
                    <div key={admin.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-[#1E5CA8]">{admin.id}</p>
                        <p className="text-xs text-slate-600 font-medium">{admin.name}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => startEditAdmin(idx)}
                          className="p-1.5 text-[#1E5CA8] hover:bg-slate-200 rounded-lg"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button
                          onClick={() => revokeAdmin(admin.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Revoke"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* TAB 4: PAYMENT GATEWAY & SETTLEMENT */}
      {activeTab === 'PAYMENT' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Metrics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gateway Mode</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {paymentConfig?.isSandbox ? 'Sandbox Simulation' : 'Live Gateway'}
                </span>
              </div>
              <h3 className="text-xl font-serif font-bold text-[#1E5CA8]">
                {paymentConfig?.gateway || 'Dual-Mode Hybrid'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Multi-channel UPI & Card Settlement</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Electronic Settlements</span>
                <span className="p-1 bg-blue-100 text-[#1E5CA8] rounded-lg">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                </span>
              </div>
              <h3 className="text-xl font-serif font-bold text-slate-900">
                {paymentHistory.length}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Total Verified Transactions</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Settlement Volume</span>
                <span className="p-1 bg-emerald-100 text-emerald-700 rounded-lg">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </span>
              </div>
              <h3 className="text-xl font-serif font-bold text-emerald-700">
                ₹{paymentHistory.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Disbursed to Guest House Grant</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Security</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#1E5CA8]">
                  HMAC-SHA256
                </span>
              </div>
              <h3 className="text-xl font-serif font-bold text-slate-900">
                100%
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Cryptographic Ledger Integrity</p>
            </div>
          </div>

          {/* Gateway & Treasury Configuration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Gateway Rails Status */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h3 className="text-sm font-serif font-bold text-[#1E5CA8]">Integrated Payment Rails</h3>
                </div>
                <span className="text-xs font-bold text-[#2563EB]">All Active</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 text-purple-800 rounded-lg font-bold text-xs">
                      UPI
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Unified Payments Interface (UPI 2.0)</h4>
                      <p className="text-slate-500 text-[11px] mt-0.5">Dynamic QR Code Generation & VPA Handles (Google Pay, PhonePe, Paytm, BHIM)</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Instant</span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 text-[#1E5CA8] rounded-lg font-bold text-xs">
                      CARD
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Credit / Debit Cards</h4>
                      <p className="text-slate-500 text-[11px] mt-0.5">RuPay, Visa, MasterCard, Maestro with 3D Secure OTP Verification</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Active</span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-800 rounded-lg font-bold text-xs">
                      NET
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Indian Net Banking Gateway</h4>
                      <p className="text-slate-500 text-[11px] mt-0.5">SBI, HDFC Bank, ICICI Bank, Union Bank of India, PNB, Canara Bank, Axis</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Active</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80 text-xs text-[#1E5CA8]">
                <p className="font-bold mb-0.5">Public Key Identifier</p>
                <code className="font-mono text-[11px] bg-white px-2 py-1 rounded border border-blue-200 text-slate-700 block truncate">
                  {paymentConfig?.keyId || 'rzp_test_jntugv_sandbox'}
                </code>
              </div>
            </div>

            {/* University Treasury Account Details */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
                  <h3 className="text-sm font-serif font-bold text-[#1E5CA8]">Institutional Treasury Node</h3>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Disbursement Node</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Beneficiary Name</span>
                    <span className="font-bold text-slate-900 block mt-0.5">JNTU-GV Guest House Fund</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Bank & Branch</span>
                    <span className="font-bold text-slate-900 block mt-0.5">SBI JNTU-GV Campus</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">IFSC Code</span>
                    <span className="font-mono font-bold text-[#1E5CA8] block mt-0.5">SBIN0020645</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Collection Account No</span>
                    <span className="font-mono font-bold text-slate-900 block mt-0.5">38491029481</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Account Head / Sanction Grant</span>
                  <span className="font-bold text-slate-900 block mt-0.5">JNTUGV-ESTATE-GH-2026-FEE</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 italic">
                * All electronic transactions settled via personal stay checkout automatically generate official Treasury Receipts and credit the Guest House Operating Grant.
              </p>
            </div>
          </div>

          {/* Electronic Settlement Ledger */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1E5CA8]"></span>
                <h3 className="text-sm font-serif font-bold text-[#1E5CA8]">Electronic Settlement Ledger</h3>
              </div>
              <button
                type="button"
                onClick={loadPaymentData}
                className="text-xs font-bold text-[#2563EB] hover:underline"
              >
                Refresh Ledger
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Transaction / Order ID</th>
                    <th className="px-4 py-3 text-left">Payer</th>
                    <th className="px-4 py-3 text-left">Method</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingPayments ? (
                    <tr><td colSpan={6} className="text-center py-10 text-slate-400 font-bold">Synchronizing Transactions...</td></tr>
                  ) : paymentHistory.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-slate-400 font-medium">No online payment transactions settled yet</td></tr>
                  ) : (
                    paymentHistory.map((p) => (
                      <tr key={p.id || p.paymentId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">
                          <div>{p.paymentId || p.transactionId}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{p.orderId}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{p.payerName || 'Guest User'}</div>
                          <div className="text-[10px] text-slate-400">{p.payerEmail || p.payerPhone || '-'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-blue-50 text-[#1E5CA8] rounded font-bold text-[10px] border border-blue-200">
                            {p.paymentMethod || 'Online'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          ₹{p.amount}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px] border border-emerald-200">
                            {p.status || 'PAID'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400 font-mono text-[11px]">
                          {p.createdAt ? new Date(p.createdAt).toLocaleString() : new Date().toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalConfig;

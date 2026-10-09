import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useConfig } from '../App';
import Stepper from '../components/Stepper';
import PaymentModal from '../components/PaymentModal';
import { guestApi, roomApi, DEFAULT_ROOMS } from '../services/api';
import { EntryStatus, PaymentType, UserRole } from '../types';

const STEPS = ['Identity', 'Timeline', 'Rooms', 'Sign'];

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Information Technology',
  'Physics & Nanotechnology',
  'Chemistry',
  'Mathematics & Humanities',
  'Registrar Peshi / Administration',
  'Dean Academic Affairs',
  'Dean R&D / Sponsored Projects'
];

const toLocalDatetimeString = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const NewEntry = () => {
  const { user } = useAuth();
  const { config } = useConfig();
  const isAdmin = user?.role === UserRole.ADMIN;
  const navigate = useNavigate();
  const location = useLocation();
  const editEntry = location.state?.editEntry;
  const prefillRoom = location.state?.prefillRoom;
  const prefillDate = location.state?.prefillDate;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [allEntries, setAllEntries] = useState([]);
  const [rooms, setRooms] = useState(DEFAULT_ROOMS);

  const [idFile, setIdFile] = useState(null);
  const [idPreview, setIdPreview] = useState(editEntry?.idProof || null);
  const [requestLetterFile, setRequestLetterFile] = useState(null);
  const [requestLetterPreview, setRequestLetterPreview] = useState(editEntry?.requestLetter || null);
  const [signature, setSignature] = useState(editEntry?.signature || '');

  const [fileErrors, setFileErrors] = useState({ idProof: '', requestLetter: '' });
  const [payOnlineChoice, setPayOnlineChoice] = useState('ONLINE'); // 'ONLINE' | 'RECEPTION'
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pendingBookingResult, setPendingBookingResult] = useState(null);

  const [formData, setFormData] = useState({
    bookingFor: editEntry?.bookingFor || 'Self',
    guestName: editEntry?.guestName || user?.name || '',
    phoneNumber: editEntry?.phoneNumber || user?.contactNumber || '',
    address: editEntry?.address || '',
    nationality: editEntry?.nationality || 'Indian',
    purposeOfVisit: editEntry?.purposeOfVisit || '',
    arrivalDateTime: editEntry?.arrivalDateTime
      ? toLocalDatetimeString(editEntry.arrivalDateTime)
      : prefillDate
      ? `${prefillDate}T10:00`
      : '',
    departureDateTime: editEntry?.departureDateTime
      ? toLocalDatetimeString(editEntry.departureDateTime)
      : prefillDate
      ? `${prefillDate}T12:00`
      : '',
    roomNo: editEntry?.roomNo || prefillRoom || '',
    roomType: 'AC Room',
    category: editEntry?.category || 'Outsiders / Parents etc',
    paymentType: editEntry?.paymentType || PaymentType.PERSONAL,
    departmentName: editEntry?.departmentName || (user?.role === UserRole.STAFF ? 'Computer Science & Engineering' : ''),
    budgetHead: editEntry?.budgetHead || '',
    sanctionOrderNo: editEntry?.sanctionOrderNo || '',
    approvingAuthority: editEntry?.approvingAuthority || '',
    totalAmount: editEntry?.totalAmount || 0,
    numDays: editEntry?.numDays || 0,
    numMale: editEntry?.numMale ?? 1,
    numFemale: editEntry?.numFemale ?? 0,
    numChildren: editEntry?.numChildren ?? 0
  });

  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (editEntry && (editEntry.status === EntryStatus.APPROVED || editEntry.status === EntryStatus.CHECKED_OUT)) {
      alert("Approved stay registrations cannot be edited.");
      navigate(`/confirmation/${editEntry.id}`);
    }
  }, [editEntry, navigate]);

  useEffect(() => {
    guestApi.getAll().then(setAllEntries).catch(console.error);
    roomApi.getAll().then(data => {
      if (Array.isArray(data) && data.length > 0) setRooms(data);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (signature && canvasRef.current) {
      const img = new Image();
      img.src = signature;
      img.onload = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0);
      };
    }
  }, [step, signature]);

  useEffect(() => {
    if (formData.arrivalDateTime && formData.departureDateTime) {
      const start = new Date(formData.arrivalDateTime);
      const end = new Date(formData.departureDateTime);

      if (end <= start) {
        setFormData(prev => ({ ...prev, numDays: 0, totalAmount: 0 }));
        return;
      }

      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      let total = 0;

      if (formData.paymentType === PaymentType.DEPARTMENTAL) {
        total = diffDays * 300;
      } else if (formData.category === 'Institute Guests (Official Work)') {
        total = 0;
      } else if (formData.category === 'University Staff / Research Scholars (Personal)') {
        total = diffDays * 300;
      } else if (formData.category === 'University Staff (Exigency - 50% HRA)') {
        total = diffDays * 200;
      } else {
        total = diffDays * 500;
      }

      setFormData(prev => ({
        ...prev,
        numDays: diffDays,
        totalAmount: total
      }));
    }
  }, [formData.arrivalDateTime, formData.departureDateTime, formData.category, formData.paymentType]);

  const occupiedRooms = useMemo(() => {
    if (!formData.arrivalDateTime || !formData.departureDateTime) return new Set();

    const start = new Date(formData.arrivalDateTime);
    const end = new Date(formData.departureDateTime);

    const occupied = new Set();
    const safeEntries = Array.isArray(allEntries) ? allEntries : [];

    for (const entry of safeEntries) {
      if (editEntry && entry.id === editEntry.id) continue;
      if (entry.status === EntryStatus.REJECTED) continue;

      const eStart = new Date(entry.arrivalDateTime);
      const eEnd = new Date(entry.departureDateTime);

      if (start < eEnd && end > eStart) {
        occupied.add(String(entry.roomNo));
      }
    }

    return occupied;
  }, [allEntries, formData.arrivalDateTime, formData.departureDateTime, editEntry]);

  const handleIdFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFileErrors(prev => ({ ...prev, idProof: 'Please upload a valid image file (JPG, PNG)' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileErrors(prev => ({ ...prev, idProof: 'File size must not exceed 5MB' }));
      return;
    }

    setFileErrors(prev => ({ ...prev, idProof: '' }));
    setIdFile(file);
    const reader = new FileReader();
    reader.onload = () => setIdPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleLetterFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setFileErrors(prev => ({ ...prev, requestLetter: 'Please upload an image or PDF file' }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileErrors(prev => ({ ...prev, requestLetter: 'File size must not exceed 10MB' }));
      return;
    }

    setFileErrors(prev => ({ ...prev, requestLetter: '' }));
    setRequestLetterFile(file);
    const reader = new FileReader();
    reader.onload = () => setRequestLetterPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1E5CA8';
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      setSignature(canvasRef.current.toDataURL());
    }
    setIsDrawing(false);
  };

  const canProceed = () => {
    if (step === 0) {
      const basicValid = formData.guestName.trim() && formData.phoneNumber.trim() && formData.address.trim() && formData.purposeOfVisit.trim();
      if (formData.paymentType === PaymentType.DEPARTMENTAL) {
        return basicValid && formData.departmentName.trim() && formData.budgetHead.trim();
      }
      return basicValid;
    }
    if (step === 1) {
      if (!formData.arrivalDateTime || !formData.departureDateTime) return false;
      return new Date(formData.departureDateTime) > new Date(formData.arrivalDateTime) && formData.numDays > 0;
    }
    if (step === 2) {
      return formData.roomNo !== '';
    }
    if (step === 3) {
      if (isAdmin) return true;
      return signature.trim() !== '' && (idPreview !== null || idFile !== null);
    }
    return true;
  };

  const handlePaymentSuccess = (paymentResult) => {
    setPaymentModalOpen(false);
    const targetId = pendingBookingResult?.id || editEntry?.id;
    if (targetId) {
      navigate(`/confirmation/${targetId}`);
    }
  };

  const handlePaymentModalClose = () => {
    setPaymentModalOpen(false);
    const targetId = pendingBookingResult?.id || editEntry?.id;
    if (targetId) {
      navigate(`/confirmation/${targetId}`);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const finalData = {
        ...formData,
        idProof: idPreview || editEntry?.idProof || '',
        requestLetter: requestLetterPreview || editEntry?.requestLetter || '',
        signature: signature || editEntry?.signature || '',
        submittedBy: user?.id,
        submittedByName: user?.name
      };

      let result;
      if (editEntry) {
        result = await guestApi.updateEntry(editEntry.id, finalData);
      } else {
        result = await guestApi.create(finalData);
      }

      const isPersonalOnline = formData.paymentType === PaymentType.PERSONAL && formData.totalAmount > 0 && payOnlineChoice === 'ONLINE';
      if (isPersonalOnline && result?.paymentStatus !== 'Paid') {
        setPendingBookingResult(result);
        setPaymentModalOpen(true);
      } else {
        navigate(`/confirmation/${result?.id || editEntry?.id}`);
      }
    } catch (err) {
      console.error('Submission error:', err);
      const msg = err.response?.data?.message || err.message || "Submission error. Please check required fields.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-6 space-y-6 animate-fadeIn">
      {/* Top University Identification Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex items-center justify-center flex-shrink-0">
              <img src={config.logo} alt="JNTUGV" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB] block">Official Guest House Form</span>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#1E5CA8] tracking-tight">
                {editEntry ? 'Modify Stay Registration' : 'New Guest Stay Registration'}
              </h1>
              <p className="text-xs text-slate-500 font-medium">JNTU Gurajada Vizianagaram Guest House Accommodation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-slate-100 text-[#1E5CA8] text-xs font-bold rounded-lg border border-slate-200">
              6 AC Rooms Available
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10">
        <Stepper currentStep={step} steps={STEPS} />

        <div className="mt-8">
          {/* STEP 0: Identity & Departmental Node */}
          {step === 0 && (
            <div className="space-y-6 animate-fadeIn">
              {/* Institutional Settlement Mode Switcher */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#1E5CA8]">Billing Settlement Mode</h3>
                    <p className="text-xs text-slate-500">Select institutional departmental billing or personal payment</p>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#1E5CA8] text-white">
                    {formData.paymentType === PaymentType.DEPARTMENTAL ? 'Departmental Journal Debit' : 'Personal Settlement'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      paymentType: PaymentType.PERSONAL,
                      category: 'Outsiders / Parents etc'
                    })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.paymentType === PaymentType.PERSONAL
                        ? 'border-[#1E5CA8] bg-white shadow-sm'
                        : 'border-slate-200 bg-white/50 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-slate-900">Personal Settlement</span>
                      <span className="text-xs font-bold text-[#2563EB]">₹300 - ₹500/day</span>
                    </div>
                    <p className="text-xs text-slate-500">Paid directly by guest / faculty member via official cash receipt</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      paymentType: PaymentType.DEPARTMENTAL,
                      category: 'Institute Guests (Official Work)'
                    })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.paymentType === PaymentType.DEPARTMENTAL
                        ? 'border-purple-600 bg-purple-50/50 shadow-sm'
                        : 'border-slate-200 bg-white/50 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-purple-950">Departmental Billing</span>
                      <span className="text-xs font-bold text-purple-700">₹300 (Grant Debited)</span>
                    </div>
                    <p className="text-xs text-slate-500">Debited to University Dept Budget Head / Sponsored Research Grant</p>
                  </button>
                </div>

                {/* Sub-Fields for Departmental Bookings */}
                {formData.paymentType === PaymentType.DEPARTMENTAL && (
                  <div className="pt-3 border-t border-purple-200 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
                    <div>
                      <label className="text-xs font-bold text-purple-950 block mb-1">Host Academic Department *</label>
                      <select
                        value={formData.departmentName}
                        onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-purple-300 rounded-xl text-xs font-bold text-slate-900"
                      >
                        <option value="">Select Department</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-purple-950 block mb-1">Budget Head / Grant Code *</label>
                      <input
                        type="text"
                        placeholder="Enter budget head or grant code"
                        value={formData.budgetHead}
                        onChange={(e) => setFormData({ ...formData, budgetHead: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-purple-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-purple-950 block mb-1">Sanction Order Reference No.</label>
                      <input
                        type="text"
                        placeholder="Enter sanction order reference number"
                        value={formData.sanctionOrderNo}
                        onChange={(e) => setFormData({ ...formData, sanctionOrderNo: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-purple-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-purple-950 block mb-1">Approving Faculty / Authority</label>
                      <input
                        type="text"
                        placeholder="Enter approving authority details"
                        value={formData.approvingAuthority}
                        onChange={(e) => setFormData({ ...formData, approvingAuthority: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-purple-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* General Identity Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Booking Intent</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Self', 'Others'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            bookingFor: mode,
                            guestName: mode === 'Self' ? (user?.name || '') : ''
                          });
                        }}
                        className={`py-3 px-2 rounded-xl text-xs font-bold border-2 transition-all ${
                          formData.bookingFor === mode
                            ? 'bg-[#1E5CA8] border-[#1E5CA8] text-white shadow-sm'
                            : 'bg-white border-slate-300 text-slate-600 hover:border-[#1E5CA8]'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="occupancy-category" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Occupancy Category</label>
                  <select
                    id="occupancy-category"
                    className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#1E5CA8] transition-all"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Outsiders / Parents etc">Outsiders / Parents (₹500)</option>
                    <option value="University Staff / Research Scholars (Personal)">University Staff / Scholars (₹300)</option>
                    <option value="University Staff (Exigency - 50% HRA)">University Staff (Exigency - 50% HRA)</option>
                    <option value="Institute Guests (Official Work)">Institute Guests (Official Work - Nil)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="guest-name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Guest Name *</label>
                  <input
                    id="guest-name"
                    type="text"
                    placeholder="Enter guest full name"
                    className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#1E5CA8] transition-all placeholder:text-slate-400"
                    value={formData.guestName}
                    onChange={e => setFormData({ ...formData, guestName: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="phone-number" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Phone Number *</label>
                  <input
                    id="phone-number"
                    type="tel"
                    placeholder="Enter phone number"
                    className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#1E5CA8] transition-all placeholder:text-slate-400"
                    value={formData.phoneNumber}
                    onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="nationality" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Nationality</label>
                  <input
                    id="nationality"
                    type="text"
                    placeholder="Enter nationality"
                    className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#1E5CA8] transition-all"
                    value={formData.nationality}
                    onChange={e => setFormData({ ...formData, nationality: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="purpose-of-visit" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Purpose of Visit *</label>
                  <input
                    id="purpose-of-visit"
                    type="text"
                    placeholder="Enter purpose of visit"
                    className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#1E5CA8] transition-all placeholder:text-slate-400"
                    value={formData.purposeOfVisit}
                    onChange={e => setFormData({ ...formData, purposeOfVisit: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="permanent-address" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Permanent Address *</label>
                  <textarea
                    id="permanent-address"
                    rows={2}
                    placeholder="Full residential / institutional address with PIN code"
                    className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#1E5CA8] transition-all placeholder:text-slate-400"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: Timeline & Tariff Engine */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="arrival-datetime" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Expected Arrival *</label>
                  <input
                    id="arrival-datetime"
                    type="datetime-local"
                    min={!editEntry ? toLocalDatetimeString(new Date()) : undefined}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#1E5CA8] transition-all"
                    value={formData.arrivalDateTime}
                    onChange={e => {
                      const newArrival = e.target.value;
                      setFormData(prev => {
                        let updatedDeparture = prev.departureDateTime;
                        if (newArrival) {
                          if (!updatedDeparture || new Date(updatedDeparture) <= new Date(newArrival)) {
                            const arrDate = new Date(newArrival);
                            arrDate.setDate(arrDate.getDate() + 1);
                            arrDate.setHours(11, 0, 0, 0);
                            updatedDeparture = toLocalDatetimeString(arrDate);
                          }
                        }
                        return { ...prev, arrivalDateTime: newArrival, departureDateTime: updatedDeparture };
                      });
                    }}
                  />
                  <span className="text-[10px] text-slate-400 font-medium mt-1 block">Standard Check-In (From 11:00 AM)</span>
                </div>
                <div>
                  <label htmlFor="departure-datetime" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Expected Departure *</label>
                  <input
                    id="departure-datetime"
                    type="datetime-local"
                    min={formData.arrivalDateTime ? formData.arrivalDateTime : (!editEntry ? toLocalDatetimeString(new Date()) : undefined)}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#1E5CA8] transition-all"
                    value={formData.departureDateTime}
                    onChange={e => {
                      const newDeparture = e.target.value;
                      if (formData.arrivalDateTime && newDeparture && new Date(newDeparture) <= new Date(formData.arrivalDateTime)) {
                        return;
                      }
                      setFormData(prev => ({ ...prev, departureDateTime: newDeparture }));
                    }}
                  />
                  <span className="text-[10px] text-slate-400 font-medium mt-1 block">Check-out must be after check-in</span>
                </div>
              </div>

              {/* Date Validation Alert Banner */}
              {formData.arrivalDateTime && formData.departureDateTime && new Date(formData.departureDateTime) <= new Date(formData.arrivalDateTime) && (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl flex items-start gap-3 text-rose-900 animate-fadeIn">
                  <span className="p-1 bg-rose-500 text-white rounded-lg flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </span>
                  <div>
                    <h5 className="font-bold text-xs uppercase tracking-wider text-rose-800">Timeline Error: Check-Out Must Be After Check-In</h5>
                    <p className="text-xs text-rose-700 mt-0.5 font-medium">
                      Expected Departure cannot be on or before Expected Arrival. Please select a valid checkout date after check-in.
                    </p>
                  </div>
                </div>
              )}

              {/* Tariff Calculation Card */}
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB] block">Official Tariff Ledger</span>
                  <p className="text-sm font-bold text-[#1E5CA8] mt-0.5">Stay Period: {formData.numDays} Days</p>
                  <p className="text-xs text-slate-500">Category Applied: {formData.category}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block uppercase font-bold">Estimated Payable</span>
                  <span className="text-3xl font-serif font-bold text-[#1E5CA8]">₹{formData.totalAmount}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: AC Room Allotment */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#1E5CA8]">Select 1 of 6 AC Guest Units</h3>
                  <p className="text-xs text-slate-500">Choose from available air-conditioned rooms on chosen dates</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-center">
                    <label className="text-[10px] font-bold text-slate-500 block">Male</label>
                    <input
                      type="number" min="0"
                      className="w-16 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center"
                      value={formData.numMale}
                      onChange={e => setFormData({ ...formData, numMale: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="text-center">
                    <label className="text-[10px] font-bold text-slate-500 block">Female</label>
                    <input
                      type="number" min="0"
                      className="w-16 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center"
                      value={formData.numFemale}
                      onChange={e => setFormData({ ...formData, numFemale: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="text-center">
                    <label className="text-[10px] font-bold text-slate-500 block">Child</label>
                    <input
                      type="number" min="0"
                      className="w-16 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center"
                      value={formData.numChildren}
                      onChange={e => setFormData({ ...formData, numChildren: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              {/* 6 Rooms Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {rooms.map(room => {
                  const roomId = String(room.roomNumber || room.id);
                  const occupied = occupiedRooms.has(roomId);
                  const isSelected = String(formData.roomNo) === roomId;

                  return (
                    <button
                      key={room.id || roomId}
                      type="button"
                      disabled={occupied}
                      onClick={() => setFormData({ ...formData, roomNo: roomId })}
                      className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#1E5CA8] border-[#1E5CA8] text-white shadow-lg scale-105'
                          : occupied
                          ? 'bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed border-transparent'
                          : 'bg-white border-slate-200 text-slate-800 hover:border-[#1E5CA8] hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xl font-serif font-bold">Room {roomId}</span>
                      <span className={`text-[11px] font-bold ${isSelected ? 'text-blue-200' : 'text-[#2563EB]'}`}>
                        {room.type || 'AC ROOM'}
                      </span>
                      {occupied && (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded mt-1">
                          Booked on Dates
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Sign & Documentation */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              {isAdmin && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-3 text-emerald-900 shadow-sm">
                  <span className="p-1.5 bg-emerald-500 text-white rounded-lg flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </span>
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider">Administrative Exemption Active</h4>
                    <p className="text-xs text-emerald-800 mt-0.5 font-medium">
                      As an authenticated <strong>Administrator</strong>, ID proof upload and signature are optional.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl flex flex-col">
                  <label htmlFor="id-upload" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    {isAdmin ? 'ID Photo (Exempt / Optional)' : 'Identity Card Photo *'}
                  </label>
                  <input
                    id="id-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleIdFileChange}
                    className="w-full text-xs font-bold text-slate-500"
                  />
                  {fileErrors.idProof && (
                    <p className="text-xs font-bold text-rose-500 mt-1">{fileErrors.idProof}</p>
                  )}
                  {idPreview && (
                    <div className="mt-3 w-full h-28 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-inner flex items-center justify-center">
                      <img src={idPreview} alt="ID Preview" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>

                <div className="p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl flex flex-col">
                  <label htmlFor="letter-upload" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    {formData.paymentType === PaymentType.DEPARTMENTAL ? 'Sanction Letter / Dept Note' : 'Stay Request Letter (Optional)'}
                  </label>
                  <input
                    id="letter-upload"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleLetterFileChange}
                    className="w-full text-xs font-bold text-slate-500"
                  />
                  {fileErrors.requestLetter && (
                    <p className="text-xs font-bold text-rose-500 mt-1">{fileErrors.requestLetter}</p>
                  )}
                  {requestLetterPreview && (
                    <div className="mt-3 w-full h-28 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-inner flex items-center justify-center">
                      {requestLetterPreview.startsWith('data:application/pdf') ? (
                        <div className="flex flex-col items-center text-rose-600">
                          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>
                          <span className="text-xs font-bold mt-1">PDF Attached</span>
                        </div>
                      ) : (
                        <img src={requestLetterPreview} alt="Letter Preview" className="w-full h-full object-contain" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Digital Signature */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {isAdmin ? 'Digital Guest Signature (Optional for Admin)' : 'Digital Guest Signature *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const c = canvasRef.current;
                      c?.getContext('2d')?.clearRect(0, 0, c.width, c.height);
                      setSignature('');
                    }}
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    Clear Signature
                  </button>
                </div>
                <div className="bg-white rounded-xl border-2 border-slate-300 h-36 touch-none overflow-hidden shadow-sm">
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={150}
                    className="w-full h-full cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onMouseMove={draw}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
                <p className="text-[11px] font-medium text-slate-400 text-center">
                  Sign above using mouse pointer or touch screen
                </p>
              </div>

              {/* Payment Settlement Mode Selector for Personal Bookings */}
              {formData.paymentType === PaymentType.PERSONAL && formData.totalAmount > 0 && (
                <div className="p-5 bg-gradient-to-br from-blue-50/70 to-indigo-50/50 rounded-2xl border-2 border-blue-200/80 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-[#1E5CA8] text-white rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      </span>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E5CA8]">Payment Settlement Preference</h4>
                        <p className="text-xs text-slate-600 font-medium">Total Accommodation Tariff: <strong className="text-slate-900">₹{formData.totalAmount}</strong> ({formData.numDays} Days)</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                      ₹{formData.totalAmount}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setPayOnlineChoice('ONLINE')}
                      className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                        payOnlineChoice === 'ONLINE'
                          ? 'border-[#1E5CA8] bg-white shadow-sm ring-2 ring-[#1E5CA8]/20'
                          : 'border-slate-200 bg-white/70 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <div className={`p-2 rounded-lg mt-0.5 ${payOnlineChoice === 'ONLINE' ? 'bg-[#1E5CA8] text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Pay Online Now</span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">UPI (QR / VPA), Credit/Debit Cards, Net Banking</span>
                        <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Instant e-Receipt & Verified Status</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPayOnlineChoice('RECEPTION')}
                      className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                        payOnlineChoice === 'RECEPTION'
                          ? 'border-[#1E5CA8] bg-white shadow-sm ring-2 ring-[#1E5CA8]/20'
                          : 'border-slate-200 bg-white/70 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <div className={`p-2 rounded-lg mt-0.5 ${payOnlineChoice === 'RECEPTION' ? 'bg-[#1E5CA8] text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Pay at Desk / Reception</span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">Cash or POS terminal settlement on arrival</span>
                        <span className="inline-block mt-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">Collect physical receipt during check-in</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stepper Footer Controls */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className={`px-6 py-3 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-100 transition-all ${step === 0 ? 'invisible' : 'bg-slate-100'}`}
            >
              Back
            </button>
            <button
              type="button"
              onClick={step === STEPS.length - 1 ? handleSubmit : () => setStep(s => s + 1)}
              disabled={loading || !canProceed()}
              className="px-8 py-3 bg-[#1E5CA8] hover:bg-[#2563EB] text-white rounded-xl font-bold text-xs sm:text-sm shadow-md active:scale-95 disabled:opacity-50 transition-all"
            >
              {loading ? "Processing..." : step === STEPS.length - 1 ? (formData.paymentType === PaymentType.PERSONAL && formData.totalAmount > 0 && payOnlineChoice === 'ONLINE' ? `Proceed to Pay ₹${formData.totalAmount}` : (editEntry ? "Update Registration" : "Confirm Booking")) : "Continue"}
            </button>
          </div>
        </div>
      </div>

      {/* Payment Checkout Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={handlePaymentModalClose}
        onSuccess={handlePaymentSuccess}
        booking={pendingBookingResult || editEntry || { ...formData, id: 'NEW' }}
      />
    </div>
  );
};

export default NewEntry;

import React, { useState, useEffect } from 'react';
import { paymentApi } from '../services/api';

const PaymentModal = ({ isOpen, onClose, booking, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('UPI'); // 'UPI' | 'CARD' | 'NETBANKING'
  const [upiMethod, setUpiMethod] = useState('QR'); // 'QR' | 'VPA'
  const [vpa, setVpa] = useState('');
  const [cardData, setCardData] = useState({
    number: '',
    name: booking?.guestName || '',
    expiry: '',
    cvv: ''
  });
  const [selectedBank, setSelectedBank] = useState('SBI');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);
  const [gatewayConfig, setGatewayConfig] = useState({ isSandbox: true, keyId: 'rzp_test' });

  useEffect(() => {
    if (isOpen) {
      setSuccessResult(null);
      setError(null);
      setLoading(false);
      paymentApi.getConfig().then(cfg => {
        if (cfg) setGatewayConfig(cfg);
      }).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen || !booking) return null;

  const amount = parseFloat(booking.totalAmount || 0);

  // Format Card Number input with spaces
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardData(prev => ({ ...prev, number: formatted }));
  };

  // Format Expiry MM/YY
  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length > 2) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }
    setCardData(prev => ({ ...prev, expiry: raw }));
  };

  // Detect Card Brand
  const getCardBrand = (number) => {
    const clean = (number || '').replace(/\s/g, '');
    if (clean.startsWith('4')) return 'VISA';
    if (clean.startsWith('5')) return 'MASTERCARD';
    if (clean.startsWith('60') || clean.startsWith('65') || clean.startsWith('81')) return 'RUPAY';
    return 'CARD';
  };

  const executePayment = async (methodName) => {
    setLoading(true);
    setError(null);
    setStatusMessage('Initializing payment gateway order...');

    try {
      // Step 1: Create Order
      const order = await paymentApi.createOrder({
        bookingId: booking.id,
        amount: amount,
        guestName: booking.guestName,
        email: booking.email || 'guest@university.edu',
        phone: booking.phoneNumber || '08922294316'
      });

      setStatusMessage('Contacting payment node & authorizing settlement...');
      await new Promise(r => setTimeout(r, 1200));

      // Step 2: Verify & Settle
      setStatusMessage('Verifying digital signature & generating official receipt...');
      const verifyRes = await paymentApi.verifyPayment({
        bookingId: booking.id,
        orderId: order.orderId,
        paymentMethod: methodName,
        payerName: booking.guestName,
        payerEmail: booking.email,
        payerPhone: booking.phoneNumber
      });

      setSuccessResult(verifyRes);
      if (onSuccess) {
        onSuccess(verifyRes);
      }
    } catch (err) {
      console.error('PAYMENT_EXECUTION_ERROR:', err);
      setError(err.message || 'Payment settlement encountered an error. Please try again.');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handleUpiSubmit = (e) => {
    e.preventDefault();
    if (upiMethod === 'VPA') {
      if (!vpa || !vpa.includes('@')) {
        setError('Please enter a valid UPI ID (e.g. yourname@okhdfcbank or 9876543210@upi).');
        return;
      }
      executePayment(`UPI (${vpa})`);
    } else {
      executePayment('UPI (QR Instant)');
    }
  };

  const handleCardSubmit = (e) => {
    e.preventDefault();
    const cleanNum = (cardData.number || '').replace(/\s/g, '');
    if (cleanNum.length < 15) {
      setError('Please enter a valid 16-digit Debit or Credit Card number.');
      return;
    }
    if (!cardData.expiry || cardData.expiry.length < 5) {
      setError('Please enter card expiry in MM/YY format.');
      return;
    }
    if (!cardData.cvv || cardData.cvv.length < 3) {
      setError('Please enter the 3-digit CVV number on the back of your card.');
      return;
    }
    const brand = getCardBrand(cleanNum);
    executePayment(`${brand} Card (Ending in ${cleanNum.slice(-4)})`);
  };

  const handleNetBankingSubmit = (e) => {
    e.preventDefault();
    const bankNames = {
      SBI: 'State Bank of India',
      HDFC: 'HDFC Bank',
      ICICI: 'ICICI Bank',
      UBI: 'Union Bank of India (Andhra Bank)',
      PNB: 'Punjab National Bank',
      CANARA: 'Canara Bank'
    };
    executePayment(`Net Banking (${bankNames[selectedBank] || selectedBank})`);
  };

  const POPULAR_BANKS = [
    { code: 'SBI', name: 'State Bank of India', color: 'from-sky-600 to-blue-800' },
    { code: 'HDFC', name: 'HDFC Bank', color: 'from-blue-900 to-indigo-900' },
    { code: 'ICICI', name: 'ICICI Bank', color: 'from-orange-600 to-amber-700' },
    { code: 'UBI', name: 'Union Bank (Andhra Bank)', color: 'from-red-600 to-rose-800' },
    { code: 'PNB', name: 'Punjab National Bank', color: 'from-yellow-700 to-amber-900' },
    { code: 'CANARA', name: 'Canara Bank', color: 'from-cyan-600 to-blue-700' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-[#1E5CA8] text-white p-5 sm:p-6 border-b-2 border-[#2563EB] relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white p-1 flex items-center justify-center flex-shrink-0 border border-blue-200 shadow-sm">
              <img src="/logo.png" alt="JNTU-GV" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block">
                Official Settlement Gateway
              </span>
              <h3 className="text-base sm:text-lg font-serif font-bold text-white tracking-tight">
                Guest House Payment Desk
              </h3>
            </div>
          </div>

          {/* Amount & Stay Strip */}
          <div className="mt-3.5 pt-3 border-t border-white/15 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-200 block text-[11px]">Voucher #{booking.slNo || 'NEW'}</span>
              <span className="font-bold text-white text-xs">{booking.guestName} &bull; Room {booking.roomNo}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider block">Payable Total</span>
              <span className="text-xl sm:text-2xl font-serif font-black text-white">₹{amount}</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-grow text-xs">
          
          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 font-bold animate-fadeIn flex items-center gap-2">
              <svg className="w-4 h-4 text-rose-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* SUCCESS SCREEN */}
          {successResult ? (
            <div className="py-4 text-center space-y-4 animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-md">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 uppercase tracking-widest">
                  Settlement Confirmed
                </span>
                <h4 className="text-xl font-serif font-bold text-[#1E5CA8] mt-1">Payment Successful</h4>
                <p className="text-slate-500 text-xs mt-0.5">Amount of ₹{amount} received & logged to estate treasury.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Official Cash Receipt No:</span>
                  <span className="font-bold text-slate-900 font-mono text-sm text-[#1E5CA8]">{successResult.receiptNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Payment Ref / Transaction ID:</span>
                  <span className="font-mono text-[11px] font-bold text-slate-800 truncate max-w-[200px]">{successResult.transactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Settlement Channel:</span>
                  <span className="font-bold text-slate-800">{successResult.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Date & Time:</span>
                  <span className="font-medium text-slate-700">{new Date(successResult.paidAt || Date.now()).toLocaleString()}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-[#1E5CA8] hover:bg-[#2563EB] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all"
              >
                Done & View Stay Voucher
              </button>
            </div>
          ) : (
            /* PAYMENT CHANNELS */
            <div className="space-y-4">
              
              {/* Payment Mode Selector Tabs */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => { setActiveTab('UPI'); setError(null); }}
                  className={`py-2 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'UPI'
                      ? 'bg-[#1E5CA8] text-white shadow-sm'
                      : 'text-slate-600 hover:text-[#1E5CA8]'
                  }`}
                >
                  <span>📱</span>
                  <span>UPI / QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('CARD'); setError(null); }}
                  className={`py-2 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'CARD'
                      ? 'bg-[#1E5CA8] text-white shadow-sm'
                      : 'text-slate-600 hover:text-[#1E5CA8]'
                  }`}
                >
                  <span>💳</span>
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('NETBANKING'); setError(null); }}
                  className={`py-2 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'NETBANKING'
                      ? 'bg-[#1E5CA8] text-white shadow-sm'
                      : 'text-slate-600 hover:text-[#1E5CA8]'
                  }`}
                >
                  <span>🏛️</span>
                  <span>Net Banking</span>
                </button>
              </div>

              {/* TAB 1: UPI / QR PAYMENT */}
              {activeTab === 'UPI' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex gap-2 border-b border-slate-100 pb-2">
                    <button
                      type="button"
                      onClick={() => setUpiMethod('QR')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        upiMethod === 'QR'
                          ? 'bg-blue-50 text-[#1E5CA8] border border-blue-200'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Scan QR Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpiMethod('VPA')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        upiMethod === 'VPA'
                          ? 'bg-blue-50 text-[#1E5CA8] border border-blue-200'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Enter UPI ID / VPA
                    </button>
                  </div>

                  {upiMethod === 'QR' ? (
                    <div className="text-center space-y-3 py-2">
                      <div className="inline-block p-4 bg-white border-2 border-slate-300 rounded-2xl shadow-inner relative group">
                        {/* Simulated realistic QR Code visual */}
                        <div className="w-44 h-44 bg-slate-900 p-2.5 rounded-xl flex flex-col items-center justify-center text-white relative">
                          <div className="grid grid-cols-6 gap-1 w-full h-full p-2">
                            {Array.from({ length: 36 }).map((_, i) => (
                              <div
                                key={i}
                                className={`rounded-sm ${(i % 2 === 0 || i % 3 === 0 || i === 0 || i === 5 || i === 30 || i === 35) ? 'bg-white' : 'bg-transparent'}`}
                              />
                            ))}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="px-2 py-0.5 bg-[#1E5CA8] text-white font-mono text-[9px] font-bold rounded border border-blue-200">
                              JNTUGV-UPI
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-slate-800">Scan with any UPI App</p>
                        <p className="text-[11px] text-slate-400">Google Pay &bull; PhonePe &bull; Paytm &bull; BHIM &bull; CRED</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => executePayment('UPI (Scan & Pay)')}
                        disabled={loading}
                        className="w-full py-3 bg-[#1E5CA8] hover:bg-[#2563EB] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <span>{statusMessage || 'Processing Settlement...'}</span>
                        ) : (
                          <>
                            <span>Authorize ₹{amount} via UPI</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleUpiSubmit} className="space-y-3.5 py-1">
                      <div>
                        <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Virtual Payment Address (UPI ID)
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. mobileNumber@upi or yourname@okaxis"
                          value={vpa}
                          onChange={(e) => setVpa(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-900 outline-none focus:border-[#1E5CA8]"
                        />
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {['@okhdfcbank', '@okaxis', '@oksbi', '@ybl', '@paytm'].map(suffix => (
                          <button
                            key={suffix}
                            type="button"
                            onClick={() => {
                              const prefix = (vpa || '').split('@')[0] || 'guest';
                              setVpa(`${prefix}${suffix}`);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold"
                          >
                            {suffix}
                          </button>
                        ))}
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-[#1E5CA8] hover:bg-[#2563EB] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-50"
                      >
                        {loading ? statusMessage || 'Authorizing...' : `Pay ₹${amount} via UPI ID`}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 2: CREDIT / DEBIT CARDS */}
              {activeTab === 'CARD' && (
                <form onSubmit={handleCardSubmit} className="space-y-3.5 animate-fadeIn">
                  
                  {/* Card Visual Badge */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-[#183B6B] to-[#1E5CA8] text-white space-y-3 shadow-md border border-slate-800">
                    <div className="flex justify-between items-center">
                      <div className="w-8 h-6 bg-amber-300/80 rounded-md border border-amber-400"></div>
                      <span className="font-mono text-xs font-bold text-amber-300 tracking-wider">
                        {getCardBrand(cardData.number)}
                      </span>
                    </div>
                    <p className="font-mono text-base tracking-widest font-bold">
                      {cardData.number || '•••• •••• •••• ••••'}
                    </p>
                    <div className="flex justify-between text-[10px]">
                      <div>
                        <span className="text-slate-300 block uppercase">Card Holder</span>
                        <span className="font-bold tracking-wider">{cardData.name || 'GUEST MEMBER'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-300 block uppercase">Expires</span>
                        <span className="font-bold tracking-wider">{cardData.expiry || 'MM/YY'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Input Fields */}
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="4532 •••• •••• ••••"
                      value={cardData.number}
                      onChange={handleCardNumberChange}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-xs text-slate-900 outline-none focus:border-[#1E5CA8]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="MM/YY"
                        maxLength="5"
                        value={cardData.expiry}
                        onChange={handleExpiryChange}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-xs text-slate-900 outline-none focus:border-[#1E5CA8]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                        CVV / CVC
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="•••"
                        maxLength="4"
                        value={cardData.cvv}
                        onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-xs text-slate-900 outline-none focus:border-[#1E5CA8]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#1E5CA8] hover:bg-[#2563EB] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-50"
                  >
                    {loading ? statusMessage || 'Processing Card Settlement...' : `Pay ₹${amount} Securely`}
                  </button>
                </form>
              )}

              {/* TAB 3: NET BANKING */}
              {activeTab === 'NETBANKING' && (
                <form onSubmit={handleNetBankingSubmit} className="space-y-3.5 animate-fadeIn">
                  <p className="text-slate-600 font-medium">Select your banking institution for direct account debit:</p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {POPULAR_BANKS.map(bank => (
                      <button
                        key={bank.code}
                        type="button"
                        onClick={() => setSelectedBank(bank.code)}
                        className={`p-3 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                          selectedBank === bank.code
                            ? 'border-[#1E5CA8] bg-blue-50/70 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <span className="font-extrabold text-xs text-[#1E5CA8] block">{bank.code}</span>
                        <span className="text-[10px] text-slate-700 font-bold truncate mt-1">{bank.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500">
                    You will be redirected to <strong>{selectedBank}</strong>'s 3D-Secure institutional portal to complete authorization.
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#1E5CA8] hover:bg-[#2563EB] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-50"
                  >
                    {loading ? statusMessage || 'Redirecting to Gateway...' : `Proceed to Pay ₹${amount}`}
                  </button>
                </form>
              )}

              {/* Sandbox info pill */}
              <div className="pt-2 text-center text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>256-Bit SSL Encrypted &bull; JNTU-GV University Estate Gateway</span>
                {gatewayConfig.isSandbox && (
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">
                    Sandbox Active
                  </span>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default PaymentModal;

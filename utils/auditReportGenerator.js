import * as XLSX from 'xlsx';
import FileSaver from 'file-saver';
import { jsPDF } from 'jspdf';
import { EntryStatus, PaymentType } from '../types';

const saveAs = FileSaver?.saveAs || FileSaver?.default || FileSaver;

export const computeAuditMetrics = (entries, startDate, endDate) => {
  const start = startDate ? new Date(startDate) : new Date(0);
  const end = endDate ? new Date(endDate) : new Date(8640000000000000);
  end.setHours(23, 59, 59, 999);

  const safeEntries = (Array.isArray(entries) ? entries : []).filter(e => {
    if (!e.arrivalDateTime) return false;
    const arrival = new Date(e.arrivalDateTime);
    return arrival >= start && arrival <= end;
  });

  const totalBookings = safeEntries.length;
  const approvedBookings = safeEntries.filter(e => e.status === EntryStatus.APPROVED);
  const pendingBookings = safeEntries.filter(e => e.status === EntryStatus.PENDING);
  const rejectedBookings = safeEntries.filter(e => e.status === EntryStatus.REJECTED);

  // Revenue metrics (based on approved stays)
  let personalCollections = 0;
  let departmentalTransfers = 0;
  let exemptedAmount = 0;
  let grossInvoiced = 0;
  let totalRoomNights = 0;

  const categoryBreakdown = {};
  const departmentBreakdown = {};

  approvedBookings.forEach(e => {
    const amount = Number(e.totalAmount || 0);
    const days = Math.max(1, Number(e.numDays || 1));
    totalRoomNights += days;

    const cat = e.category || 'Standard';
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + amount;

    if (e.paymentType === PaymentType.DEPARTMENTAL) {
      departmentalTransfers += amount;
      grossInvoiced += amount;
      const dept = e.departmentName || 'General University Dept';
      departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + amount;
    } else if (e.isUniversityGuest || e.category === 'Institute Guest (Official Work)' || amount === 0) {
      exemptedAmount += 0;
    } else {
      personalCollections += amount;
      grossInvoiced += amount;
    }
  });

  // Calculate period days for 6 AC Rooms
  const diffDays = Math.max(1, Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const totalAvailableCapacity = diffDays * 6; // 6 AC Rooms
  const occupancyRate = totalAvailableCapacity > 0
    ? Math.min(100, Math.round((totalRoomNights / totalAvailableCapacity) * 100))
    : 0;

  return {
    filteredEntries: safeEntries,
    approvedEntries: approvedBookings,
    totalBookings,
    approvedCount: approvedBookings.length,
    pendingCount: pendingBookings.length,
    rejectedCount: rejectedBookings.length,
    totalRoomNights,
    occupancyRate,
    personalCollections,
    departmentalTransfers,
    exemptedAmount,
    grossInvoiced,
    categoryBreakdown,
    departmentBreakdown,
    periodDays: diffDays,
    totalAvailableCapacity
  };
};

export const exportAuditExcel = (entries, periodLabel, metrics, config) => {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Executive Summary
  const summaryData = [
    ['UNIVERSITY GUEST HOUSE - FINANCIAL AUDIT REPORT'],
    [`Institution: ${config?.universityName || 'University Portal'}`],
    [`Audit Period: ${periodLabel}`],
    [`Report Generated: ${new Date().toLocaleString()}`],
    [''],
    ['KEY AUDIT METRICS', 'VALUE'],
    ['Total Registered Stays', metrics.totalBookings],
    ['Approved & Audited Stays', metrics.approvedCount],
    ['Pending Clearance', metrics.pendingCount],
    ['Rejected Stays', metrics.rejectedCount],
    ['Total Room-Nights Booked (6 AC Rooms)', metrics.totalRoomNights],
    ['Guest House Occupancy Rate', `${metrics.occupancyRate}%`],
    [''],
    ['FINANCIAL REVENUE LEDGER', 'AMOUNT (₹)'],
    ['Personal Realized Collections (Cash / UPI)', metrics.personalCollections],
    ['Departmental Journal Transfers (Book Debits)', metrics.departmentalTransfers],
    ['Exempted Official Stays (₹0 Tariff)', 0],
    ['GROSS INVOICED REVENUE', metrics.grossInvoiced],
    [''],
    ['REVENUE BY GUEST CATEGORY', 'AMOUNT (₹)']
  ];

  Object.entries(metrics.categoryBreakdown).forEach(([cat, amt]) => {
    summaryData.push([cat, amt]);
  });

  summaryData.push(['']);
  summaryData.push(['DEPARTMENTAL JOURNAL DEBITS', 'AMOUNT (₹)']);
  Object.entries(metrics.departmentBreakdown).forEach(([dept, amt]) => {
    summaryData.push([dept, amt]);
  });

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Audit Summary');

  // Sheet 2: Itemized Transaction Ledger
  const ledgerData = metrics.filteredEntries.map((e, idx) => ({
    'Sl. No': idx + 1,
    'Voucher No': e.slNo || '-',
    'Receipt No': e.receiptNo || 'Pending',
    'Guest Name': e.guestName || '-',
    'Category': e.category || '-',
    'Room': `Room ${e.roomNo} (AC Room)`,
    'Arrival': e.arrivalDateTime ? new Date(e.arrivalDateTime).toLocaleDateString() : '-',
    'Departure': e.departureDateTime ? new Date(e.departureDateTime).toLocaleDateString() : '-',
    'Nights': e.numDays || 1,
    'Payment Mode': e.paymentType === PaymentType.DEPARTMENTAL ? 'Dept Transfer' : 'Personal',
    'Department / Budget Head': e.budgetHead ? `${e.departmentName || ''} (${e.budgetHead})` : '-',
    'Amount (₹)': Number(e.totalAmount || 0),
    'Audit Status': e.status || '-'
  }));

  const ledgerSheet = XLSX.utils.json_to_sheet(ledgerData);
  XLSX.utils.book_append_sheet(workbook, ledgerSheet, 'Transaction Ledger');

  // Generate buffer and trigger download
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
  const fileName = `University_Guest_House_Audit_${periodLabel.replace(/\s+/g, '_')}.xlsx`;

  if (typeof saveAs === 'function') {
    try {
      saveAs(data, fileName);
      return;
    } catch (err) {
      console.warn('saveAs failed, falling back', err);
    }
  }

  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportAuditPDF = (entries, periodLabel, metrics, config) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header Banner
  doc.setFillColor(15, 30, 70); // Deep institutional navy
  doc.rect(10, 10, pageWidth - 20, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text((config?.universityName || 'UNIVERSITY GUEST HOUSE').toUpperCase(), pageWidth / 2, y, { align: 'center' });

  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`STATUTORY FINANCIAL AUDIT PACK - ${periodLabel.toUpperCase()}`, pageWidth / 2, y, { align: 'center' });

  y += 16;
  doc.setTextColor(30, 41, 59);

  // Meta Information Box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, y, pageWidth - 20, 18, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Audit Period:`, 14, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(periodLabel, 40, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text(`Generated On:`, 115, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleString(), 145, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text(`Capacity:`, 14, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`6 AC Rooms (Total Available: ${metrics.totalAvailableCapacity} Room-Nights)`, 40, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.text(`Occupancy Rate:`, 115, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${metrics.occupancyRate}% (${metrics.totalRoomNights} nights occupied)`, 145, y + 12);

  y += 24;

  // Summary Financial Table
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 30, 70);
  doc.text('1. FINANCIAL AUDIT SUMMARY', 12, y);
  y += 4;

  const financialItems = [
    ['Personal Cash / UPI Collections Realized', `Rs. ${metrics.personalCollections.toLocaleString('en-IN')}`],
    ['Departmental Journal Transfers (Grant Debits)', `Rs. ${metrics.departmentalTransfers.toLocaleString('en-IN')}`],
    ['Exempted Official University Stays (Rs. 0)', 'Rs. 0 (Exempt)'],
    ['GROSS INVOICED REVENUE AUDITED', `Rs. ${metrics.grossInvoiced.toLocaleString('en-IN')}`]
  ];

  financialItems.forEach(([label, value], i) => {
    const rowY = y + (i * 6.5);
    const isTotal = i === financialItems.length - 1;
    if (isTotal) {
      doc.setFillColor(238, 242, 255);
      doc.rect(10, rowY - 4, pageWidth - 20, 6.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
    }
    doc.setFontSize(8.5);
    doc.text(label, 14, rowY);
    doc.text(value, pageWidth - 14, rowY, { align: 'right' });
  });

  y += financialItems.length * 6.5 + 8;

  // Itemized Transactions Header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 30, 70);
  doc.text('2. AUDITED TRANSACTION LEDGER (RECENT)', 12, y);
  y += 4;

  // Table header
  doc.setFillColor(226, 232, 240);
  doc.rect(10, y, pageWidth - 20, 6, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);

  doc.text('VOUCHER', 12, y + 4.2);
  doc.text('GUEST NAME', 36, y + 4.2);
  doc.text('ROOM', 82, y + 4.2);
  doc.text('MODE', 108, y + 4.2);
  doc.text('DATES', 130, y + 4.2);
  doc.text('AMOUNT', pageWidth - 12, y + 4.2, { align: 'right' });

  y += 6;

  // Render top 12 transactions on page
  const displayEntries = metrics.approvedEntries.slice(0, 12);
  displayEntries.forEach((e, idx) => {
    const rowY = y + (idx * 5.5);
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(10, rowY, pageWidth - 20, 5.5, 'F');
    }
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);

    doc.text(e.slNo || '-', 12, rowY + 3.8);
    doc.text((e.guestName || '-').substring(0, 26), 36, rowY + 3.8);
    doc.text(`Room ${e.roomNo} (AC)`, 82, rowY + 3.8);
    doc.text(e.paymentType === PaymentType.DEPARTMENTAL ? 'Dept Grant' : 'Personal', 108, rowY + 3.8);
    doc.text(e.arrivalDateTime ? new Date(e.arrivalDateTime).toLocaleDateString() : '-', 130, rowY + 3.8);
    doc.text(`Rs. ${Number(e.totalAmount || 0)}`, pageWidth - 12, rowY + 3.8, { align: 'right' });
  });

  // Footer Signature Block
  const sigY = 255;
  doc.setDrawColor(203, 213, 225);
  doc.line(10, sigY - 5, pageWidth - 10, sigY - 5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);

  doc.text('PREPARED BY', 20, sigY);
  doc.setFont('helvetica', 'normal');
  doc.text('Guest House Caretaker / In-Charge', 20, sigY + 4);
  doc.text('Signature: ___________________', 20, sigY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('VERIFIED BY', 85, sigY);
  doc.setFont('helvetica', 'normal');
  doc.text('Internal Audit Officer', 85, sigY + 4);
  doc.text('Signature: ___________________', 85, sigY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('SANCTIONED & APPROVED', 145, sigY);
  doc.setFont('helvetica', 'normal');
  doc.text('Finance Officer / Registrar', 145, sigY + 4);
  doc.text('Signature: ___________________', 145, sigY + 12);

  doc.save(`University_Guest_House_Audit_Pack_${periodLabel.replace(/\s+/g, '_')}.pdf`);
};

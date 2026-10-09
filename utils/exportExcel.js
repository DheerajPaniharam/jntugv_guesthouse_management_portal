
import * as XLSX from 'xlsx';
import FileSaver from 'file-saver';

const saveAs = FileSaver?.saveAs || FileSaver?.default || FileSaver;

export const exportToExcel = (entries, filename = 'University_Guest_Register') => {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const worksheetData = safeEntries.map(entry => ({
    'Sl. No': entry?.slNo || '-',
    'Guest Name': entry?.guestName || '-',
    'Address': entry?.address || '-',
    'Nationality': entry?.nationality || 'Indian',
    'Arrival': entry?.arrivalDateTime ? new Date(entry.arrivalDateTime).toLocaleString() : '-',
    'Departure': entry?.departureDateTime ? new Date(entry.departureDateTime).toLocaleString() : '-',
    'Days': entry?.numDays ?? 0,
    'Room No': entry?.roomNo || '-',
    'Amount (₹)': entry?.totalAmount ?? 0,
    'Status': entry?.status || '-',
    'Receipt No': entry?.receiptNo || '-',
    'Remarks': entry?.remarks || '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Register');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
  const fileOutputName = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;

  if (typeof saveAs === 'function') {
    try {
      saveAs(data, fileOutputName);
      return;
    } catch (e) {
      console.warn('FileSaver saveAs failed, falling back to blob URL download', e);
    }
  }

  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileOutputName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

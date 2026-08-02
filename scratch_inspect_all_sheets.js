import XLSX from 'xlsx';

const rawFix = 'd:/Jokes/laporanwifi/data/raw/data laporan fixxx.xls';
const wb = XLSX.readFile(rawFix);

console.log('Sheet Names:', wb.SheetNames);

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log(`\n========================================`);
  console.log(`SHEET: ${sheetName} (${rows.length} rows)`);
  console.log(`========================================`);

  // Find header row (the row containing month serials or month headers)
  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const row = rows[r] || [];
    if (row.some(cell => String(cell).toLowerCase().includes('pembayaran') || String(cell).toLowerCase().includes('nama'))) {
      headerRowIdx = r;
      break;
    }
  }

  console.log(`Header Row Index: ${headerRowIdx}`);
  if (headerRowIdx !== -1) {
    console.log('Header Row Content:', rows[headerRowIdx]);
  }

  // Print first 5 data rows
  for (let r = headerRowIdx + 1; r < Math.min(rows.length, headerRowIdx + 6); r++) {
    console.log(`Row ${r}:`, rows[r]);
  }
}

import XLSX from 'xlsx';

const rawFix = 'd:/Jokes/laporanwifi/data/raw/data laporan fixxx.xls';
const wb = XLSX.readFile(rawFix, { cellDates: true });

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log(`\n========================================`);
  console.log(`SHEET: ${sheetName}`);
  console.log(`========================================`);

  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const row = rows[r] || [];
    if (row.some(cell => String(cell).toLowerCase().includes('pembayaran') || String(cell).toLowerCase().includes('nama'))) {
      headerRowIdx = r;
      break;
    }
  }

  if (headerRowIdx !== -1) {
    const hRow = rows[headerRowIdx];
    console.log('Headers:', hRow);

    // Look at first 10 data rows to see empty vs filled cells per column
    for (let r = headerRowIdx + 1; r < Math.min(rows.length, headerRowIdx + 10); r++) {
      const row = rows[r] || [];
      const custName = row[1] || row[2]; // name column
      if (!custName || String(custName).toLowerCase().includes('total')) continue;
      console.log(`  Row ${r} (${custName}):`, row.slice(4)); // print columns after PEMBAYARAN
    }
  }
}

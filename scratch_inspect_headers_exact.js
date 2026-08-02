import XLSX from 'xlsx';

const rawFix = 'd:/Jokes/laporanwifi/data/raw/data laporan fixxx.xls';
const wb = XLSX.readFile(rawFix, { cellDates: false });

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
  console.log(`\n========================================`);
  console.log(`SHEET: ${sheetName}`);
  console.log(`========================================`);

  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    console.log(`Row ${r}:`, rows[r]);
  }
}

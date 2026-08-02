import XLSX from 'xlsx';

const dashPath = 'd:/Jokes/laporanwifi/data/raw/dashboard.xlsx';
const wb = XLSX.readFile(dashPath);

console.log('Sheet Names in dashboard.xlsx:', wb.SheetNames);

for (const sName of wb.SheetNames) {
  const ws = wb.Sheets[sName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log(`\n========================================`);
  console.log(`SHEET: "${sName}" (${rows.length} rows)`);
  console.log(`========================================`);
  for (let r = 0; r < Math.min(rows.length, 12); r++) {
    console.log(`Row ${r}:`, rows[r]);
  }
}

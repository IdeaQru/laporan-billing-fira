import XLSX from 'xlsx';

const LAPORAN_PATH = 'data/raw/data laporan fixxx.xls';
const wbFix = XLSX.readFile(LAPORAN_PATH, { raw: true });

console.log('=== INSPECTING FREE ENTRIES IN data laporan fixxx.xls ===');

for (const sName of wbFix.SheetNames) {
  const ws = wbFix.Sheets[sName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
  
  let varRowIdx = -1, firstRowIdx = -1, lastRowIdx = -1;
  data.forEach((row, idx) => {
    if (!row) return;
    const colA = String(row[0] || '').trim().toLowerCase();
    if (colA === 'variable') varRowIdx = idx;
    if (colA === 'first') firstRowIdx = idx;
    if (colA === 'last') lastRowIdx = idx;
  });

  if (firstRowIdx === -1 || lastRowIdx === -1) continue;

  for (let r = firstRowIdx; r <= lastRowIdx; r++) {
    const row = data[r] || [];
    const rowStr = JSON.stringify(row).toLowerCase();
    if (rowStr.includes('free')) {
      console.log(`Sheet "${sName}" Row ${r} (${row[2]}):`);
      console.log('  PEMBAYARAN col (5):', row[5]);
      console.log('  All cols:', row.slice(1, 15));
    }
  }
}

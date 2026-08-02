import XLSX from 'xlsx';

const LAPORAN_PATH = 'data/raw/data laporan fixxx.xls';
const wbFix = XLSX.readFile(LAPORAN_PATH, { raw: true });

function serialToYYYYMM(val) {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  if (isNaN(n) || n < 40000) return null;
  const date = new Date((n - 25569) * 86400 * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

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

  console.log(`\n========================================`);
  console.log(`Sheet "${sName}": variableIdx=${varRowIdx}, firstIdx=${firstRowIdx}, lastIdx=${lastRowIdx}`);
  if (varRowIdx !== -1) {
    const hRow = data[varRowIdx];
    const monthsFound = [];
    hRow.forEach((cell, colIdx) => {
      const yyyymm = serialToYYYYMM(cell);
      if (yyyymm) {
        monthsFound.push({ colIdx, raw: cell, yyyymm });
      }
    });
    console.log(`Months found (${monthsFound.length}):`, monthsFound.map(m => m.yyyymm).join(', '));
  }

  if (firstRowIdx !== -1 && lastRowIdx !== -1) {
    const custCount = lastRowIdx - firstRowIdx + 1;
    console.log(`Valid customer rows count: ${custCount}`);
  }
}

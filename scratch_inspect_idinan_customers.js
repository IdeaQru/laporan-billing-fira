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

const ws = wbFix.Sheets['IDINAN'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });

let varRowIdx = -1, firstRowIdx = -1, lastRowIdx = -1;
data.forEach((row, idx) => {
  if (!row) return;
  const colA = String(row[0] || '').trim().toLowerCase();
  if (colA === 'variable') varRowIdx = idx;
  if (colA === 'first') firstRowIdx = idx;
  if (colA === 'last') lastRowIdx = idx;
});

console.log(`IDINAN: varRowIdx=${varRowIdx}, firstRowIdx=${firstRowIdx}, lastRowIdx=${lastRowIdx}`);
const hRow = data[varRowIdx];
console.log('Header Row (col 0..15):', hRow.slice(0, 16));
console.log('Header Row Month mapping:');
hRow.forEach((c, idx) => {
  const m = serialToYYYYMM(c);
  if (m) console.log(`  Col ${idx} (${c}) -> ${m}`);
});

console.log('\nCustomer Rows around IWAN /lian, ANA HAR, nanang sutomo, anis, sulis:');
for (let r = firstRowIdx; r <= lastRowIdx; r++) {
  const row = data[r] || [];
  const name = String(row[2] || '');
  if (['IWAN', 'ANA', 'nanang', 'anis', 'sulis'].some(k => name.toLowerCase().includes(k))) {
    console.log(`Row ${r} [col 1=${row[1]}, col 2=${row[2]}, col 5=${row[5]}]:`);
    hRow.forEach((hCell, colIdx) => {
      const monthStr = serialToYYYYMM(hCell);
      if (monthStr) {
        console.log(`  Col ${colIdx} (${monthStr}): "${row[colIdx]}"`);
      }
    });
  }
}

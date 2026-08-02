import XLSX from 'xlsx';

const LAPORAN_PATH = 'data/raw/data laporan fixxx.xls';
const DASHBOARD_PATH = 'data/raw/dashboard.xlsx';

console.log('=== INSPECTING data laporan fixxx.xls BOUNDARIES ===');
const wbFix = XLSX.readFile(LAPORAN_PATH, { raw: true });
for (const sName of wbFix.SheetNames) {
  const ws = wbFix.Sheets[sName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
  let varRow = -1, firstRow = -1, lastRow = -1;
  data.forEach((row, idx) => {
    if (!row) return;
    const colA = String(row[0] || '').trim().toLowerCase();
    if (colA === 'variable') varRow = idx;
    if (colA === 'first') firstRow = idx;
    if (colA === 'last') lastRow = idx;
  });
  console.log(`Sheet "${sName}": variable row=${varRow}, first row=${firstRow}, last row=${lastRow}, total rows=${data.length}`);
  if (varRow !== -1) {
    console.log(`   Header row [${varRow}]:`, data[varRow]);
  }
  if (firstRow !== -1) {
    console.log(`   First data row [${firstRow}]:`, data[firstRow].slice(0, 6));
  }
  if (lastRow !== -1) {
    console.log(`   Last data row [${lastRow}]:`, data[lastRow].slice(0, 6));
  }
}

console.log('\n=== INSPECTING dashboard.xlsx SHEETS ===');
const wbDash = XLSX.readFile(DASHBOARD_PATH, { raw: true });
console.log('Dashboard Sheet Names:', wbDash.SheetNames);
for (const sName of wbDash.SheetNames) {
  const ws = wbDash.Sheets[sName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
  console.log(`\n--- Dashboard Sheet: "${sName}", Total Rows: ${data.length}`);
  for (let r = 0; r < Math.min(5, data.length); r++) {
    console.log(`  Row ${r}:`, JSON.stringify(data[r] ? data[r].slice(0, 10) : []));
  }
}

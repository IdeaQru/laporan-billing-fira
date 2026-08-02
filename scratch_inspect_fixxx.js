import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const LAPORAN_PATH = 'data/raw/data laporan fixxx.xls';
const wb = XLSX.readFile(LAPORAN_PATH, { raw: true });
console.log('Sheet Names in data laporan fixxx.xls:', wb.SheetNames);

for (const sName of wb.SheetNames) {
  const ws = wb.Sheets[sName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
  console.log(`\n========================================`);
  console.log(`Sheet: "${sName}", Total Rows: ${data.length}`);
  console.log(`========================================`);
  
  // Collect unique values in column A (index 0)
  const colAValues = new Set();
  data.forEach((row, idx) => {
    if (row && row[0] !== undefined && row[0] !== null) {
      colAValues.add(String(row[0]).trim());
    }
  });
  console.log(`Column A Unique Values in "${sName}":`, Array.from(colAValues));

  // Show top 12 rows
  for (let r = 0; r < Math.min(12, data.length); r++) {
    console.log(`Row ${r}:`, JSON.stringify(data[r] ? data[r].slice(0, 10) : []));
  }
}

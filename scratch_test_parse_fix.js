import XLSX from 'xlsx';

const rawFix = 'd:/Jokes/laporanwifi/data/raw/data laporan fixxx.xls';
const wb = XLSX.readFile(rawFix, { cellDates: false, raw: true });

function serialToYYYYMM(val) {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  if (isNaN(n) || n < 40000) return null;
  // Excel epoch: 1899-12-30
  const date = new Date((n - 25569) * 86400 * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

const MONTHS_2026 = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'];

let totalCust = 0;
let totalInv = 0;
let totalLunas = 0;
let totalBelumLunas = 0;
let totalFree = 0;

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });

  // Find header row with serial numbers
  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const row = rows[r] || [];
    if (row.some(c => serialToYYYYMM(c) !== null)) {
      headerRowIdx = r;
      break;
    }
  }

  if (headerRowIdx === -1) {
    console.warn(`Could not find header row in sheet ${sheetName}`);
    continue;
  }

  const hRow = rows[headerRowIdx];
  const colMonthMap = {};
  for (let col = 0; col < hRow.length; col++) {
    const monthStr = serialToYYYYMM(hRow[col]);
    if (monthStr && MONTHS_2026.includes(monthStr)) {
      colMonthMap[col] = monthStr;
    }
  }

  console.log(`\nSheet "${sheetName}" header at row ${headerRowIdx}, month columns:`);
  for (const [col, m] of Object.entries(colMonthMap)) {
    console.log(`  Col ${col} -> ${m}`);
  }

  let sheetCust = 0;
  let sheetUnpaid = 0;
  let sheetLunas = 0;

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    // Find customer name column (usually col 1 or 2)
    let custName = '';
    for (let c = 1; c <= 3; c++) {
      const v = String(row[c] || '').trim();
      if (v && isNaN(Number(v)) && !v.toUpperCase().includes('TOTAL') && !v.toUpperCase().includes('PEMBAYARAN')) {
        custName = v;
        break;
      }
    }
    if (!custName) continue;

    sheetCust++;
    totalCust++;

    for (const [colIdx, monthStr] of Object.entries(colMonthMap)) {
      const rawCell = row[colIdx];
      const valStr = String(rawCell || '').trim().toLowerCase();

      totalInv++;

      let status = 'BELUM LUNAS';
      if (valStr.includes('free') || valStr.includes('gratis') || valStr.includes('diskon')) {
        status = 'FREE';
        totalFree++;
      } else if (!rawCell || valStr === '' || valStr === 'belum' || valStr === 'isolir' || valStr === '0' || valStr === '-') {
        status = 'BELUM LUNAS';
        totalBelumLunas++;
        sheetUnpaid++;
      } else if (valStr.includes('lunas') || valStr.includes('tf') || valStr.includes('bca') || valStr.includes('bri') || valStr.includes('cash') || valStr.includes('mandiri') || valStr.includes('bni') || valStr.includes('/') || !isNaN(Number(rawCell))) {
        status = 'LUNAS';
        totalLunas++;
        sheetLunas++;
      } else {
        status = 'BELUM LUNAS';
        totalBelumLunas++;
        sheetUnpaid++;
      }
    }
  }

  console.log(`Sheet "${sheetName}": ${sheetCust} customers, ${sheetLunas} LUNAS, ${sheetUnpaid} BELUM LUNAS`);
}

console.log(`\n========================================`);
console.log(`TOTAL RECONCILED FROM DATA LAPORAN FIXXX.XLS:`);
console.log(`  Total Customers:      ${totalCust}`);
console.log(`  Total Invoices:       ${totalInv}`);
console.log(`  Total LUNAS:          ${totalLunas}`);
console.log(`  Total BELUM LUNAS:    ${totalBelumLunas}`);
console.log(`  Total FREE:           ${totalFree}`);
console.log(`========================================`);

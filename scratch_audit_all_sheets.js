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

const AREA_MAP = {
  'BLIMBING_BSARI':   'BLI (Blimbingsari)',
  'IDINAN':           'IDN (Idinan)',
  'TANAHLOS_TLOS':    'TLS (Tanah Los)',
  'Jambu':            'JMB (Jambu)',
  'PANGGANG':         'PGG (Panggang)',
  'palpakis':         'PLK (Palpakis)',
  'SUMBERWATU_SWATU': 'SWT (Sumberwatu)',
  'TAMANSARI':        'TMS (Tamansari)',
};

console.log('========================================================================');
console.log('📊 AUDIT ALL 8 AREA SHEETS IN data laporan fixxx.xls');
console.log('========================================================================\n');

let grandCustCount = 0;
let grandLunas = 0;
let grandFree = 0;
let grandUnpaid = 0;

for (const [sheetName, areaLabel] of Object.entries(AREA_MAP)) {
  const ws = wbFix.Sheets[sheetName];
  if (!ws) {
    console.log(`❌ Sheet "${sheetName}" NOT FOUND!`);
    continue;
  }

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
  let varRowIdx = -1, firstRowIdx = -1, lastRowIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    const colA = String(row[0] || '').trim().toLowerCase();
    if (colA === 'variable') varRowIdx = i;
    if (colA === 'first') firstRowIdx = i;
    if (colA === 'last') lastRowIdx = i;
  }

  const hRow = rows[varRowIdx] || [];
  const colMonthMap = {};
  hRow.forEach((cell, cIdx) => {
    const m = serialToYYYYMM(cell);
    if (m) colMonthMap[cIdx] = m;
  });

  const monthList = Object.values(colMonthMap);
  const custCount = (firstRowIdx !== -1 && lastRowIdx !== -1) ? (lastRowIdx - firstRowIdx + 1) : 0;
  grandCustCount += custCount;

  let sheetLunas = 0, sheetFree = 0, sheetUnpaid = 0;
  const monthCounts = {};
  monthList.forEach(m => monthCounts[m] = { lunas: 0, free: 0, unpaid: 0 });

  for (let r = firstRowIdx; r <= lastRowIdx; r++) {
    const row = rows[r] || [];
    for (const [cIdx, m] of Object.entries(colMonthMap)) {
      const cellVal = String(row[Number(cIdx)] ?? '').trim().toLowerCase();
      if (cellVal === 'free' || cellVal === 'gratis' || cellVal.includes('diskon')) {
        sheetFree++;
        monthCounts[m].free++;
      } else if (!cellVal || cellVal === '-' || cellVal === '0' || cellVal === 'belum' || cellVal === 'isolir') {
        sheetUnpaid++;
        monthCounts[m].unpaid++;
      } else {
        sheetLunas++;
        monthCounts[m].lunas++;
      }
    }
  }

  grandLunas += sheetLunas;
  grandFree += sheetFree;
  grandUnpaid += sheetUnpaid;

  console.log(`📌 ${areaLabel} [Sheet: "${sheetName}"]`);
  console.log(`   Customers: ${custCount} | Months: ${monthList.length} (${monthList[0]} .. ${monthList[monthList.length - 1]})`);
  console.log(`   Cell Totals: LUNAS=${sheetLunas}, FREE=${sheetFree}, UNPAID/EMPTY=${sheetUnpaid}`);
  console.log(`   Monthly Breakdown:`);
  for (const m of monthList) {
    const mc = monthCounts[m];
    console.log(`     ${m}: LUNAS=${mc.lunas.toString().padStart(3)}, FREE=${mc.free.toString().padStart(3)}, UNPAID=${mc.unpaid.toString().padStart(3)}`);
  }
  console.log('------------------------------------------------------------------------');
}

console.log(`\n========================================================================`);
console.log(`🏁 GRAND TOTALS ACROSS ALL 8 AREAS:`);
console.log(`   Total Customers : ${grandCustCount}`);
console.log(`   Total Cells     : ${grandLunas + grandFree + grandUnpaid}`);
console.log(`   LUNAS Cells     : ${grandLunas}`);
console.log(`   FREE Cells      : ${grandFree}`);
console.log(`   UNPAID Cells    : ${grandUnpaid}`);
console.log(`========================================================================\n`);

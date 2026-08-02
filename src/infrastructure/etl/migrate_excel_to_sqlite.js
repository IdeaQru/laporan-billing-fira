// ============================================================
// ETL Migration: Excel → SQLite (Rebuilt with Column-A Markers)
// Sumber tunggal: data/raw/data laporan fixxx.xls
// Marker Kolom A: "variable" = baris header, "first" = baris data pertama,
//                 "last"     = baris data terakhir (boundary presisi)
// Semua bulan yang ada di file (Sep 2025 – Sep 2026) di-ingest.
// ============================================================
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..', '..');

// -- Dynamic Path Resolvers --
function resolveLaporanPath() {
  const candidates = [
    join(ROOT, 'data', 'raw', 'data laporan fixxx.xls'),
    join(ROOT, 'data', 'raw', 'laporan juli.xls'),
    join(ROOT, 'data', 'raw', 'data laporan fix.xls'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  const rawDir = join(ROOT, 'data', 'raw');
  if (existsSync(rawDir)) {
    const files = readdirSync(rawDir);
    const found = files.find(f =>
      (f.toLowerCase().includes('laporan') || f.toLowerCase().includes('fix'))
      && (f.endsWith('.xls') || f.endsWith('.xlsx'))
      && !f.toLowerCase().includes('dashboard')
    );
    if (found) return join(rawDir, found);
  }
  return candidates[0];
}

function resolveDashboardPath() {
  const candidates = [
    join(ROOT, 'data', 'raw', 'dashboard.xlsx'),
    join(ROOT, 'dashboard.xlsx'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0];
}

function resolveBackupPath() {
  const candidates = [
    join(ROOT, 'data', 'raw', 'dashboard_backup.xlsx'),
    join(ROOT, 'dashboard_backup.xlsx'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return resolveDashboardPath();
}

import { resolveDbPath } from '../database/connection.js';

// ============================================================
// Official 8 Area Mapping (sheet name → code & full name)
// ============================================================
const AREA_MAP = {
  'BLIMBING_BSARI':   { code: 'BLI', name: 'Blimbingsari' },
  'IDINAN':           { code: 'IDN', name: 'Idinan' },
  'TANAHLOS_TLOS':    { code: 'TLS', name: 'Tanah Los' },
  'Jambu':            { code: 'JMB', name: 'Jambu' },
  'PANGGANG':         { code: 'PGG', name: 'Panggang' },
  'palpakis':         { code: 'PLK', name: 'Palpakis' },
  'SUMBERWATU_SWATU': { code: 'SWT', name: 'Sumberwatu' },
  'TAMANSARI':        { code: 'TMS', name: 'Tamansari' },
};

// ============================================================
// Helper: Convert Excel date serial → "YYYY-MM"
// ============================================================
function serialToYYYYMM(val) {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  if (isNaN(n) || n < 40000) return null;
  const date = new Date((n - 25569) * 86400 * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function safeNum(val) {
  if (val === null || val === undefined || val === '') return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : Math.round(n);
}

function safeStr(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function detectPaymentMethod(text) {
  const t = String(text || '').toLowerCase();
  if (t.includes('bca')) return 'BCA';
  if (t.includes('bni')) return 'BNI';
  if (t.includes('mandiri')) return 'MANDIRI';
  if (t.includes('bri')) return 'BRI';
  if (t.includes('cash') || t.includes('tunai')) return 'CASH';
  if (t.includes('tf')) return 'BRI';   // default TF = BRI
  return 'CASH';
}

// ============================================================
// Parse one sheet using column-A markers
// Returns: { varRowIdx, firstRowIdx, lastRowIdx, hRow, colMonthMap }
// ============================================================
function parseSheetBoundary(rows) {
  let varRowIdx = -1, firstRowIdx = -1, lastRowIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    const colA = String(row[0] || '').trim().toLowerCase();
    if (colA === 'variable') varRowIdx = i;
    if (colA === 'first') firstRowIdx = i;
    if (colA === 'last') lastRowIdx = i;
  }
  return { varRowIdx, firstRowIdx, lastRowIdx };
}

// ============================================================
// Main migrate() function
// ============================================================
function migrate() {
  const DB_PATH     = resolveDbPath();
  const LAPORAN_PATH = resolveLaporanPath();
  const DASHBOARD_PATH = resolveDashboardPath();
  const SCHEMA_PATH = join(ROOT, 'src', 'infrastructure', 'database', 'schema.sql');

  if (!existsSync(LAPORAN_PATH)) {
    throw new Error(`File Excel data laporan fixxx.xls tidak ditemukan. Pastikan file ada di data/raw/`);
  }

  console.log('🚀 Starting ETL Migration (Column-A Marker Engine)...');
  console.log(`   DB         : ${DB_PATH}`);
  console.log(`   Laporan    : ${LAPORAN_PATH}`);
  console.log(`   Dashboard  : ${DASHBOARD_PATH}`);

  const db = new Database(DB_PATH, { timeout: 10000 });
  try { db.pragma('journal_mode = WAL'); } catch (_) {}
  try { db.pragma('foreign_keys = ON');  } catch (_) {}

  // === 1. Drop & Recreate Schema (fresh build) ===
  db.exec(`
    DROP TABLE IF EXISTS monthly_status_history;
    DROP TABLE IF EXISTS payments;
    DROP TABLE IF EXISTS invoices;
    DROP TABLE IF EXISTS expenses;
    DROP TABLE IF EXISTS customers;
    DROP TABLE IF EXISTS areas;
    DROP TABLE IF EXISTS packages;
  `);

  const schema = readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);
  console.log('✅ Schema recreated (fresh)');

  // Prepared statements
  const insertPkg  = db.prepare('INSERT OR IGNORE INTO packages (code, speed_name, price) VALUES (?, ?, ?)');
  const insertArea = db.prepare('INSERT OR IGNORE INTO areas (code, name, source_file) VALUES (?, ?, ?)');
  const insertCust = db.prepare('INSERT OR IGNORE INTO customers (customer_code, name, area_id, package_id) VALUES (?, ?, ?, ?)');
  const insertInv  = db.prepare('INSERT OR IGNORE INTO invoices (customer_id, billing_period, amount, status, unpaid_amount, unpaid_months, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insertPay  = db.prepare('INSERT INTO payments (invoice_id, payment_method, amount_paid, payment_date, notes) VALUES (?, ?, ?, ?, ?)');
  const insertExp  = db.prepare('INSERT INTO expenses (expense_date, description, amount, category) VALUES (?, ?, ?, ?)');
  const insertHist = db.prepare('INSERT INTO monthly_status_history (customer_id, month_year, status_text, source_sheet) VALUES (?, ?, ?, ?)');

  const getAreaId = db.prepare('SELECT id FROM areas WHERE code = ?');
  const getPkgId  = db.prepare('SELECT id FROM packages WHERE code = ?');
  const getCustId = db.prepare('SELECT id FROM customers WHERE customer_code = ?');
  const getInvId  = db.prepare('SELECT id FROM invoices WHERE customer_id = ? AND billing_period = ?');

  // === 2. Packages & Official 8 Areas ===
  console.log('\n📦 Importing Packages & Official 8 Areas...');

  // Packages dari dashboard.xlsx Setup sheet (jika ada), atau default
  if (existsSync(DASHBOARD_PATH)) {
    try {
      const wbDash = XLSX.readFile(DASHBOARD_PATH);
      const wsSetup = wbDash.Sheets['Setup'];
      if (wsSetup) {
        const setupData = XLSX.utils.sheet_to_json(wsSetup, { header: 1 });
        for (let i = 1; i < setupData.length; i++) {
          const row = setupData[i];
          const code = safeNum(row[1]);
          const speedName = safeStr(row[2]);
          const price = safeNum(row[3]);
          if (code > 0 && speedName) {
            insertPkg.run(code, speedName, price);
          }
        }
      }
    } catch (_) {}
  }

  // Default packages jika belum ada
  insertPkg.run(10, '10mbps', 100000);
  insertPkg.run(20, '20mbps', 200000);
  insertPkg.run(30, '30mbps', 250000);

  // Insert official 8 areas
  for (const [sheetName, info] of Object.entries(AREA_MAP)) {
    insertArea.run(info.code, info.name, LAPORAN_PATH);
  }
  console.log(`✅ ${Object.keys(AREA_MAP).length} areas inserted`);

  // === 3. Read master package mapping from dashboard.xlsx NamaPelanggan ===
  const masterPkgMap = new Map();  // custCode -> pkgCode (number)
  if (existsSync(DASHBOARD_PATH)) {
    try {
      const wbDash = XLSX.readFile(DASHBOARD_PATH);
      const wsNP = wbDash.Sheets['NamaPelanggan'];
      if (wsNP) {
        const npData = XLSX.utils.sheet_to_json(wsNP, { header: 1 });
        for (let i = 1; i < npData.length; i++) {
          const row = npData[i];
          const custCode = safeStr(row[2]);
          const custName = safeStr(row[3]);
          const pkgCode  = safeNum(row[5]);
          if (custCode && pkgCode > 0) {
            masterPkgMap.set(custCode.toUpperCase(), pkgCode);
          }
          if (custName && pkgCode > 0) {
            masterPkgMap.set(custName.toUpperCase(), pkgCode);
          }
        }
      }
    } catch (_) {}
  }
  console.log(`   Found ${masterPkgMap.size} package mappings from NamaPelanggan`);

  // === 4. Parse data laporan fixxx.xls — Cell by Cell with Column-A Markers ===
  console.log('\n👤 Importing Customers & Invoices from data laporan fixxx.xls...');
  const wbFix = XLSX.readFile(LAPORAN_PATH, { cellDates: false, raw: true });

  let custCounter    = 0;
  let totalInvoices  = 0;
  let totalPayments  = 0;
  let totalFree      = 0;
  let totalUnpaid    = 0;

  const migrateTransaction = db.transaction(() => {
    for (const [sheetName, areaInfo] of Object.entries(AREA_MAP)) {
      const ws = wbFix.Sheets[sheetName];
      if (!ws) {
        console.warn(`⚠️  Sheet "${sheetName}" not found in ${LAPORAN_PATH}`);
        continue;
      }

      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
      const { varRowIdx, firstRowIdx, lastRowIdx } = parseSheetBoundary(rows);

      if (varRowIdx === -1 || firstRowIdx === -1 || lastRowIdx === -1) {
        console.warn(`⚠️  Markers "variable/first/last" not found in sheet "${sheetName}" — skipping`);
        continue;
      }

      // Build column → YYYY-MM map from the "variable" header row
      const hRow = rows[varRowIdx];
      const colMonthMap = {};   // colIdx → "YYYY-MM"
      for (let col = 0; col < hRow.length; col++) {
        const yyyymm = serialToYYYYMM(hRow[col]);
        if (yyyymm) {
          colMonthMap[col] = yyyymm;
        }
      }

      const monthCount = Object.keys(colMonthMap).length;
      if (monthCount === 0) {
        console.warn(`⚠️  No month columns found in sheet "${sheetName}"`);
        continue;
      }

      const areaRow = getAreaId.get(areaInfo.code);
      if (!areaRow) continue;
      const areaId = areaRow.id;

      let areaCustIdx = 1;

      // Only iterate rows from "first" to "last" (inclusive) — precise boundary
      for (let r = firstRowIdx; r <= lastRowIdx; r++) {
        const row = rows[r] || [];

        // Column B (index 1) = No (number), Column C (index 2) = Nama
        // Validate customer name in col 2
        const rawName = String(row[2] || '').trim();
        if (!rawName || rawName.toUpperCase().includes('TOTAL') || rawName.toUpperCase().includes('JUMLAH')) {
          continue;
        }

        // Price is in column F (index 5) = PEMBAYARAN base price
        let rawPrice = safeNum(row[5]);
        if (rawPrice < 30000 || rawPrice > 2000000) {
          // Try to detect FREE package in col 5
          const col5Str = String(row[5] || '').trim().toLowerCase();
          if (col5Str === 'free') {
            rawPrice = 0;
          } else {
            rawPrice = 100000; // default
          }
        }

        const custCode = `${areaInfo.code}-${String(areaCustIdx++).padStart(3, '0')}`;

        // Package ID mapping
        let pkgCode = masterPkgMap.get(custCode.toUpperCase()) || masterPkgMap.get(rawName.toUpperCase());
        let packageId = null;
        if (pkgCode) {
          const pkgRow = getPkgId.get(pkgCode);
          if (pkgRow) packageId = pkgRow.id;
        }
        if (!packageId) {
          // Default: 10mbps
          const defaultPkg = getPkgId.get(10);
          if (defaultPkg) packageId = defaultPkg.id;
        }

        insertCust.run(custCode, rawName, areaId, packageId);
        const custRow = getCustId.get(custCode);
        if (!custRow) continue;
        custCounter++;

        // ---- Process each month column ----
        for (const [colIdx, periodCode] of Object.entries(colMonthMap)) {
          const rawCell = row[Number(colIdx)];
          const valStr  = String(rawCell ?? '').trim().toLowerCase();

          let status           = 'BELUM LUNAS';
          let unpaidAmount     = rawPrice;
          let unpaidMonths     = 1;
          let notes            = 'Belum Lunas';
          let isLunas          = false;
          let isFree           = false;

          if (valStr === 'free' || valStr === 'gratis' || valStr.includes('diskon')) {
            // FREE — tagihan = 0
            isFree = true;
            status       = 'FREE';
            unpaidAmount = 0;
            unpaidMonths = 0;
            notes        = 'FREE';
            totalFree++;
          } else if (rawPrice === 0) {
            // Pelanggan free (paket gratis) — kolom PEMBAYARAN = FREE/0
            isFree = true;
            status       = 'FREE';
            unpaidAmount = 0;
            unpaidMonths = 0;
            notes        = 'FREE';
            totalFree++;
          } else if (
            !rawCell
            || rawCell === ''
            || valStr === ''
            || valStr === '-'
            || valStr === '0'
            || valStr === 'belum'
            || valStr === 'isolir'
          ) {
            // Kosong atau belum bayar
            status       = valStr === 'isolir' ? 'ISOLIR' : 'BELUM LUNAS';
            unpaidAmount = rawPrice;
            unpaidMonths = 1;
            notes        = valStr === 'isolir' ? 'ISOLIR' : 'Belum Lunas';
            totalUnpaid++;
          } else {
            // Ada isian → LUNAS — bisa: "lunas", tanggal, nominal, "tf", nama bank, dll.
            isLunas = true;
            status       = 'LUNAS';
            unpaidAmount = 0;
            unpaidMonths = 0;
            notes        = String(rawCell).trim();
          }

          insertInv.run(custRow.id, periodCode, rawPrice, status, unpaidAmount, unpaidMonths, notes);
          totalInvoices++;

          const invRow = getInvId.get(custRow.id, periodCode);
          if (!invRow) continue;

          // Monthly history
          insertHist.run(custRow.id, periodCode, notes, sheetName);

          // Payment record for LUNAS
          if (isLunas) {
            const payMethod = detectPaymentMethod(notes);
            // payment_date: use periodCode + '-15' as proxy
            insertPay.run(invRow.id, payMethod, rawPrice, `${periodCode}-15`, notes);
            totalPayments++;
          }
        }
      }

      console.log(`   ✅ ${sheetName} (${areaInfo.code}): ${areaCustIdx - 1} customers, ${monthCount} months`);
    }
  });

  migrateTransaction();

  console.log(`\n   Total customers   : ${custCounter}`);
  console.log(`   Total invoices    : ${totalInvoices}`);
  console.log(`   Total payments    : ${totalPayments} (LUNAS)`);
  console.log(`   Total FREE        : ${totalFree}`);
  console.log(`   Total BELUM LUNAS : ${totalUnpaid}`);

  // === 5. Expenses from dashboard.xlsx Pengeluaran ===
  console.log('\n💸 Importing Expenses...');
  let expCount = 0;
  if (existsSync(DASHBOARD_PATH)) {
    try {
      const wbDash = XLSX.readFile(DASHBOARD_PATH);
      const wsExp = wbDash.Sheets['Pengeluaran'];
      if (wsExp) {
        const expData = XLSX.utils.sheet_to_json(wsExp, { header: 1 });
        for (let i = 1; i < expData.length; i++) {
          const row = expData[i];
          const tanggal = safeStr(row[2]);
          const uraian  = safeStr(row[3]);
          const jumlah  = safeNum(row[4]);
          if (!tanggal || !uraian || jumlah === 0) continue;
          const category = uraian.toLowerCase().includes('fee') ? 'FEE' : 'OPERASIONAL';
          insertExp.run(tanggal, uraian, jumlah, category);
          expCount++;
        }
      }
    } catch (e) {
      console.warn('⚠️  Could not read Pengeluaran sheet:', e.message);
    }
  }
  console.log(`✅ ${expCount} expenses imported`);

  // === 6. Summary ===
  const counts = {
    packages   : db.prepare('SELECT COUNT(*) as c FROM packages').get().c,
    areas      : db.prepare('SELECT COUNT(*) as c FROM areas').get().c,
    customers  : db.prepare('SELECT COUNT(*) as c FROM customers').get().c,
    invoices   : db.prepare('SELECT COUNT(*) as c FROM invoices').get().c,
    payments   : db.prepare('SELECT COUNT(*) as c FROM payments').get().c,
    expenses   : db.prepare('SELECT COUNT(*) as c FROM expenses').get().c,
    history    : db.prepare('SELECT COUNT(*) as c FROM monthly_status_history').get().c,
  };

  console.log('\n============================================');
  console.log('  📊 MIGRATION COMPLETE');
  console.log('============================================');
  console.log(`  Packages        : ${counts.packages}`);
  console.log(`  Areas           : ${counts.areas}`);
  console.log(`  Customers       : ${counts.customers}`);
  console.log(`  Invoices        : ${counts.invoices}`);
  console.log(`  Payments(LUNAS) : ${counts.payments}`);
  console.log(`  Expenses        : ${counts.expenses}`);
  console.log(`  Monthly History : ${counts.history}`);
  console.log('============================================\n');

  db.close();
  console.log('✅ Database updated successfully.');
  return counts;
}

export { migrate };

if (process.argv[1] && process.argv[1].endsWith('migrate_excel_to_sqlite.js')) {
  migrate();
}

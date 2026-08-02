// ============================================================
// ETL Migration: Excel → SQLite (7-Month Reconciled Engine)
// Reads dashboard.xlsx, dashboard_backup.xlsx & laporan juli.xls,
// reconciles exact payment/unpaid states for Jan 2026 - Juli 2026.
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
    join(ROOT, 'laporan juli.xls'),
    join(ROOT, 'data', 'raw', 'data laporan fix.xls'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  const rawDir = join(ROOT, 'data', 'raw');
  if (existsSync(rawDir)) {
    const files = readdirSync(rawDir);
    const found = files.find(f => (f.toLowerCase().includes('laporan') || f.toLowerCase().includes('fix')) && (f.endsWith('.xls') || f.endsWith('.xlsx')) && !f.toLowerCase().includes('dashboard'));
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

const DB_PATH = join(ROOT, 'data', 'wifi_billing.db');
const DASHBOARD_PATH = resolveDashboardPath();
const BACKUP_PATH = resolveBackupPath();
const LAPORAN_PATH = resolveLaporanPath();
const SCHEMA_PATH = join(ROOT, 'src', 'infrastructure', 'database', 'schema.sql');


// -- Area mapping (sheet name → code & full name) --
const AREA_MAP = {
  'BLIMBING_BSARI':          { code: 'BLI', name: 'Blimbingsari' },
  'IDINAN':                  { code: 'IDN', name: 'Idinan' },
  'TANAHLOS_TLOS':           { code: 'TLS', name: 'Tanah Los' },
  'Jambu':                   { code: 'JMB', name: 'Jambu' },
  'AMPILGADING_PALGADING':   { code: 'APG', name: 'Ampilgading / Palgading' },
  'PANGGANG':                { code: 'PGG', name: 'Panggang' },
  'palpakis':                { code: 'PLK', name: 'Palpakis' },
  'Kebundadap':              { code: 'KBD', name: 'Kebundadap' },
  'SUMBERWATU_SWATU':        { code: 'SWT', name: 'Sumberwatu' },
  'TAMANSARI':               { code: 'TMS', name: 'Tamansari' },
  'KAMPUNG ANYAR':           { code: 'KPA', name: 'Kampung Anyar' },
  'NOALAMAT':                { code: 'NAL', name: 'No Alamat' },
};

const AREA_ALIAS = {
  'BLIMBINGSARI': 'BLI', 'BLIMBING': 'BLI',
  'IDINAN': 'IDN',
  'TANAHLOS': 'TLS', 'TANAH LOS': 'TLS', 'TANAHLOSS': 'TLS', 'TANAH LOSS': 'TLS',
  'JAMBU': 'JMB',
  'AMPILGADING': 'APG', 'PALGADING': 'APG',
  'PANGGANG': 'PGG',
  'PALPAKIS': 'PLK',
  'KEBUNDADAP': 'KBD', 'KEBUN DADAP': 'KBD',
  'SUMBERWATU': 'SWT',
  'TAMANSARI': 'TMS', 'TAMAN SARI': 'TMS',
  'KAMPUNG ANYAR': 'KPA',
  'NOALAMAT': 'NAL', 'NO ALAMAT': 'NAL',
};

const MONTHS = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'];
const MONTH_KEYS = ['jan', 'feb', 'mar', 'april', 'mei', 'juni', 'juli'];

function resolveAreaCode(areaStr) {
  if (!areaStr) return null;
  const upper = String(areaStr).trim().toUpperCase();
  if (AREA_ALIAS[upper]) return AREA_ALIAS[upper];
  for (const [alias, code] of Object.entries(AREA_ALIAS)) {
    if (upper.includes(alias) || alias.includes(upper)) return code;
  }
  return null;
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

function parseUnpaidMonths(monthStr) {
  if (!monthStr || typeof monthStr !== 'string' || !monthStr.trim()) return [];
  const s = monthStr.trim().lowerCase ? monthStr.trim().toLowerCase() : String(monthStr).trim().toLowerCase();
  if (s === 'free') return [];
  if (s.includes('-')) {
    const parts = s.split('-');
    const startM = parts[0].trim();
    const endM = parts[1].trim();
    try {
      const idx1 = MONTH_KEYS.findIndex(m => m.startsWith(startM.substring(0, 3)));
      const idx2 = MONTH_KEYS.findIndex(m => m.startsWith(endM.substring(0, 3)));
      if (idx1 !== -1 && idx2 !== -1 && idx1 <= idx2) {
        return MONTH_KEYS.slice(idx1, idx2 + 1);
      }
    } catch (_) {}
  }
  for (const m of MONTH_KEYS) {
    if (m.startsWith(s.substring(0, 3))) return [m];
  }
  return [s];
}

function migrate() {
  console.log('🚀 Starting Reconciled Multi-Month ETL Migration (Jan-Juli 2026)...');
  console.log(`   DB: ${DB_PATH}`);

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

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
  console.log('✅ Schema created (fresh)');

  const insertPkg   = db.prepare('INSERT OR IGNORE INTO packages (code, speed_name, price) VALUES (?, ?, ?)');
  const insertArea  = db.prepare('INSERT OR IGNORE INTO areas (code, name, source_file) VALUES (?, ?, ?)');
  const insertCust  = db.prepare('INSERT OR IGNORE INTO customers (customer_code, name, area_id, package_id) VALUES (?, ?, ?, ?)');
  const insertInv   = db.prepare('INSERT OR IGNORE INTO invoices (customer_id, billing_period, amount, status, unpaid_amount, unpaid_months, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insertPay   = db.prepare('INSERT INTO payments (invoice_id, payment_method, amount_paid, payment_date, notes) VALUES (?, ?, ?, ?, ?)');
  const insertExp   = db.prepare('INSERT INTO expenses (expense_date, description, amount, category) VALUES (?, ?, ?, ?)');
  const insertHist  = db.prepare('INSERT INTO monthly_status_history (customer_id, month_year, status_text, source_sheet) VALUES (?, ?, ?, ?)');

  const getAreaId = db.prepare('SELECT id FROM areas WHERE code = ?');
  const getPkgId  = db.prepare('SELECT id FROM packages WHERE code = ?');
  const getCustId = db.prepare('SELECT id FROM customers WHERE customer_code = ?');
  const getInvId  = db.prepare('SELECT id FROM invoices WHERE customer_id = ? AND billing_period = ?');

  // ========================================================
  // 1. Packages & Areas
  // ========================================================
  console.log('\n📦 Importing Packages & Areas...');
  const wbDash = XLSX.readFile(DASHBOARD_PATH);
  const wsSetup = wbDash.Sheets['Setup'];
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

  for (const [sheetName, info] of Object.entries(AREA_MAP)) {
    insertArea.run(info.code, info.name, 'laporan juli.xls');
  }

  // ========================================================
  // 2. Customers (Master)
  // ========================================================
  console.log('\n👤 Importing Master Customers...');
  const sources = [DASHBOARD_PATH, BACKUP_PATH];
  let custCount = 0;

  for (const srcPath of sources) {
    const wb = XLSX.readFile(srcPath);
    const wsNP = wb.Sheets['NamaPelanggan'];
    if (!wsNP) continue;
    const npData = XLSX.utils.sheet_to_json(wsNP, { header: 1 });

    for (let i = 1; i < npData.length; i++) {
      const row = npData[i];
      const custCode = safeStr(row[2]);
      const custName = safeStr(row[3]);
      const area = safeStr(row[4]);
      const pkgCode = safeNum(row[5]);

      if (!custCode || !custName) continue;

      let areaCode = resolveAreaCode(area);
      let areaId = null;
      if (areaCode) {
        let areaRow = getAreaId.get(areaCode);
        if (!areaRow) {
          insertArea.run(areaCode, area, srcPath);
          areaRow = getAreaId.get(areaCode);
        }
        areaId = areaRow?.id;
      } else if (area) {
        const newCode = area.substring(0, 3).toUpperCase();
        let existingArea = getAreaId.get(newCode);
        if (!existingArea) {
          insertArea.run(newCode, area, srcPath);
          existingArea = getAreaId.get(newCode);
        }
        areaId = existingArea?.id;
      }

      let packageId = null;
      if (pkgCode > 0) {
        const pkgRow = getPkgId.get(pkgCode);
        packageId = pkgRow ? pkgRow.id : null;
      }

      if (areaId) {
        const res = insertCust.run(custCode, custName, areaId, packageId);
        if (res.changes > 0) custCount++;
      }
    }
  }
  console.log(`   ✅ ${custCount} unique master customers imported`);

  // Read backup & active dashboard rows for reconciliation
  const wbBack = XLSX.readFile(BACKUP_PATH);
  const wsBackTag = wbBack.Sheets['Tagihan Pelanggan'];
  const backTagData = XLSX.utils.sheet_to_json(wsBackTag, { header: 1 });

  const wsDashTag = wbDash.Sheets['Tagihan Pelanggan'];
  const dashTagData = XLSX.utils.sheet_to_json(wsDashTag, { header: 1 });

  const backMap = new Map();
  for (let i = 2; i < backTagData.length; i++) {
    const r = backTagData[i];
    const code = safeStr(r[2]);
    if (code) {
      backMap.set(code, {
        harga: safeNum(r[5]),
        cash: safeNum(r[6]),
        bca: safeNum(r[7]),
        bri: safeNum(r[8]),
        mandiri: safeNum(r[9]),
        bni: safeNum(r[10]),
        keterangan: safeStr(r[11]),
        unpaidRp: safeNum(r[12]),
        unpaidMonthStr: safeStr(r[13]),
      });
    }
  }

  const dashMap = new Map();
  for (let i = 2; i < dashTagData.length; i++) {
    const r = dashTagData[i];
    const code = safeStr(r[2]);
    if (code) {
      dashMap.set(code, {
        harga: safeNum(r[5]),
        cash: safeNum(r[6]),
        bca: safeNum(r[7]),
        bri: safeNum(r[8]),
        mandiri: safeNum(r[9]),
        bni: safeNum(r[10]),
        keterangan: safeStr(r[11]),
        unpaidRp: safeNum(r[12]),
        unpaidMonthStr: safeStr(r[13]),
      });
    }
  }

  // ========================================================
  // 3. Multi-Month Reconciled Invoices & Payments (Jan - Juli 2026)
  // ========================================================
  console.log('\n💰 Reconciling Monthly Invoices & Payments for Jan-Juli 2026...');
  const allCusts = db.prepare('SELECT id, customer_code, package_id FROM customers').all();

  let totalInvoices = 0;
  let totalPayments = 0;

  for (const cust of allCusts) {
    const cCode = cust.customer_code;
    const bData = backMap.get(cCode) || {};
    const dData = dashMap.get(cCode) || {};

    let price = dData.harga || bData.harga || 100000;
    if (price === 0 && cust.package_id) {
      const pkg = db.prepare('SELECT price FROM packages WHERE id = ?').get(cust.package_id);
      if (pkg) price = pkg.price;
    }
    if (price === 0) price = 100000;

    const bKet = (bData.keterangan || '').toUpperCase();
    const bUnpaidMonths = bKet.includes('BELUM') ? parseUnpaidMonths(bData.unpaidMonthStr) : [];

    const dKet = (dData.keterangan || '').toUpperCase();
    const dUnpaidMonths = dKet.includes('BELUM') ? parseUnpaidMonths(dData.unpaidMonthStr) : [];

    // Process each month 2026-01 to 2026-07
    for (let idx = 0; idx < MONTHS.length; idx++) {
      const pCode = MONTHS[idx];
      const mKey = MONTH_KEYS[idx];

      let isUnpaid = false;
      let notes = '';

      if (idx < 5) {
        // Jan - Mei baseline
        if (bUnpaidMonths.includes(mKey)) {
          isUnpaid = true;
          notes = `Belum Lunas (${mKey})`;
        } else {
          isUnpaid = false;
          notes = 'LUNAS (Baseline Jan-Mei)';
        }
      } else if (idx === 5) {
        // Juni 2026
        if (dUnpaidMonths.includes('juni')) {
          isUnpaid = true;
          notes = 'Belum Lunas (juni)';
        } else {
          isUnpaid = false;
          notes = 'LUNAS (Juni)';
        }
      } else if (idx === 6) {
        // Juli 2026
        if (dKet.includes('BELUM') && (dUnpaidMonths.includes('juli') || dData.unpaidMonthStr === 'free')) {
          isUnpaid = true;
          notes = `Belum Lunas (${dData.unpaidMonthStr || 'juli'})`;
        } else {
          isUnpaid = false;
          notes = dData.keterangan || 'LUNAS (Juli)';
        }
      }

      const status = isUnpaid ? 'BELUM LUNAS' : 'LUNAS';
      const unpaidAmount = isUnpaid ? price : 0;
      const unpaidMonthsCount = isUnpaid ? 1 : 0;

      insertInv.run(cust.id, pCode, price, status, unpaidAmount, unpaidMonthsCount, notes);
      totalInvoices++;

      const invRow = getInvId.get(cust.id, pCode);
      if (!invRow) continue;

      insertHist.run(cust.id, pCode, notes, idx < 5 ? 'dashboard_backup.xlsx' : 'dashboard.xlsx');

      // Create payment record if LUNAS
      if (!isUnpaid) {
        let payMethod = 'BRI';
        let amount = price;

        if (idx === 6 && dData) {
          if (dData.bca > 0) payMethod = 'BCA';
          else if (dData.bri > 0) payMethod = 'BRI';
          else if (dData.cash > 0) payMethod = 'CASH';
          else if (dData.mandiri > 0) payMethod = 'MANDIRI';
          else if (dData.bni > 0) payMethod = 'BNI';
        } else if (idx < 5 && bData) {
          if (bData.bca > 0) payMethod = 'BCA';
          else if (bData.bri > 0) payMethod = 'BRI';
          else if (bData.cash > 0) payMethod = 'CASH';
          else if (bData.mandiri > 0) payMethod = 'MANDIRI';
          else if (bData.bni > 0) payMethod = 'BNI';
        }

        insertPay.run(invRow.id, payMethod, amount, `${pCode}-15`, notes);
        totalPayments++;
      }
    }
  }

  console.log(`   ✅ Created ${totalInvoices} monthly invoices & ${totalPayments} payment records across 7 periods`);

  // ========================================================
  // 4. Expenses
  // ========================================================
  console.log('\n📤 Importing Expenses...');
  let expCount = 0;
  for (const srcPath of sources) {
    const wb = XLSX.readFile(srcPath);
    const wsExp = wb.Sheets['Pengeluaran'];
    if (!wsExp) continue;
    const expData = XLSX.utils.sheet_to_json(wsExp, { header: 1 });

    for (let i = 1; i < expData.length; i++) {
      const row = expData[i];
      const tanggal = safeStr(row[2]);
      const uraian = safeStr(row[3]);
      const jumlah = safeNum(row[4]);

      if (!tanggal || !uraian || jumlah === 0) continue;

      const category = uraian.toLowerCase().includes('fee') ? 'FEE' : 'OPERASIONAL';
      insertExp.run(tanggal, uraian, jumlah, category);
      expCount++;
    }
  }
  console.log(`   ✅ ${expCount} expenses imported`);

  // Summary
  const counts = {
    packages: db.prepare('SELECT COUNT(*) as c FROM packages').get().c,
    areas: db.prepare('SELECT COUNT(*) as c FROM areas').get().c,
    customers: db.prepare('SELECT COUNT(*) as c FROM customers').get().c,
    invoices: db.prepare('SELECT COUNT(*) as c FROM invoices').get().c,
    payments: db.prepare('SELECT COUNT(*) as c FROM payments').get().c,
    expenses: db.prepare('SELECT COUNT(*) as c FROM expenses').get().c,
    history: db.prepare('SELECT COUNT(*) as c FROM monthly_status_history').get().c,
  };

  console.log('\n============================================');
  console.log('  📊 MIGRATION COMPLETE — RECONCILED 7-MONTH DB');
  console.log('============================================');
  console.log(`  Packages:           ${counts.packages}`);
  console.log(`  Areas:              ${counts.areas}`);
  console.log(`  Customers:          ${counts.customers}`);
  console.log(`  Invoices:           ${counts.invoices} (7 periods: Jan-Juli 2026)`);
  console.log(`  Payments:           ${counts.payments} (7 periods: Jan-Juli 2026)`);
  console.log(`  Expenses:           ${counts.expenses}`);
  console.log(`  Monthly History:    ${counts.history}`);
  console.log('============================================\n');

  db.close();
  console.log('✅ Database updated successfully.');
  return counts;
}

export { migrate };

if (process.argv[1] && process.argv[1].endsWith('migrate_excel_to_sqlite.js')) {
  migrate();
}


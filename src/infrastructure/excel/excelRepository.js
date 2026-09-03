// ============================================================
// Infrastructure: Excel Migration Repository
// High-Performance Atomic SQLite Transactions with Backups
// ============================================================
import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { resolveDbPath } from '../database/connection.js';
import { OFFICIAL_AREAS } from '../../domain/excel/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..', '..');

/**
 * Creates an automatic database backup snapshot before mutations
 * @returns {string | null} Backup file path
 */
export function createDatabaseBackup() {
  try {
    const dbPath = resolveDbPath();
    if (!existsSync(dbPath)) return null;

    const backupDir = join(ROOT, 'data', 'backups');
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(backupDir, `wifi_billing_${timestamp}.db`);
    copyFileSync(dbPath, backupPath);
    return backupPath;
  } catch (err) {
    console.warn('⚠️ Gagal membuat cadangan database:', err.message);
    return null;
  }
}

/**
 * Performs Full Database Rebuild from parsed Excel data
 * @param {object} parsedData
 * @returns {object} Execution audit metrics
 */
export function commitFullRebuild(parsedData) {
  const dbPath = resolveDbPath();
  const schemaPath = join(ROOT, 'src', 'infrastructure', 'database', 'schema.sql');
  const backupPath = createDatabaseBackup();

  const db = new Database(dbPath, { timeout: 15000 });
  try { db.pragma('journal_mode = WAL'); } catch (_) {}
  try { db.pragma('foreign_keys = ON'); } catch (_) {}

  let totalCust = 0;
  let totalInvs = 0;
  let totalPays = 0;

  const transaction = db.transaction(() => {
    // 1. Drop and recreate schema
    db.exec(`
      DROP TABLE IF EXISTS monthly_status_history;
      DROP TABLE IF EXISTS payments;
      DROP TABLE IF EXISTS invoices;
      DROP TABLE IF EXISTS expenses;
      DROP TABLE IF EXISTS customers;
      DROP TABLE IF EXISTS areas;
      DROP TABLE IF EXISTS packages;
    `);

    const schema = readFileSync(schemaPath, 'utf-8');
    db.exec(schema);

    // 2. Prepare statements
    const insertPkg = db.prepare('INSERT OR IGNORE INTO packages (code, speed_name, price) VALUES (?, ?, ?)');
    const insertArea = db.prepare('INSERT OR IGNORE INTO areas (code, name, source_file) VALUES (?, ?, ?)');
    const insertCust = db.prepare('INSERT INTO customers (customer_code, name, area_id, package_id) VALUES (?, ?, ?, ?)');
    const insertInv = db.prepare('INSERT INTO invoices (customer_id, billing_period, amount, status, unpaid_amount, unpaid_months, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const insertPay = db.prepare('INSERT INTO payments (invoice_id, payment_method, amount_paid, payment_date, notes) VALUES (?, ?, ?, ?, ?)');
    const insertHist = db.prepare('INSERT INTO monthly_status_history (customer_id, month_year, status_text, source_sheet) VALUES (?, ?, ?, ?)');
    const insertExp = db.prepare('INSERT INTO expenses (expense_date, description, amount, category) VALUES (?, ?, ?, ?)');

    const getAreaId = db.prepare('SELECT id FROM areas WHERE code = ?');
    const getPkgId = db.prepare('SELECT id FROM packages WHERE code = ?');
    const getCustId = db.prepare('SELECT id FROM customers WHERE customer_code = ?');

    // 3. Packages
    insertPkg.run(10, '10mbps', 100000);
    insertPkg.run(20, '20mbps', 200000);
    insertPkg.run(30, '30mbps', 250000);

    // 4. Areas
    for (const info of Object.values(OFFICIAL_AREAS)) {
      insertArea.run(info.code, info.name, 'Excel Import');
    }

    // 5. Insert Customers
    const custIdCache = new Map();
    for (const c of parsedData.customers) {
      const areaRow = getAreaId.get(c.areaCode);
      const areaId = areaRow ? areaRow.id : 1;
      const pkgRow = getPkgId.get(c.packageCode || 10);
      const pkgId = pkgRow ? pkgRow.id : 1;

      insertCust.run(c.customerCode, c.name, areaId, pkgId);
      const custRow = getCustId.get(c.customerCode);
      if (custRow) {
        custIdCache.set(c.customerCode, custRow.id);
        totalCust++;
      }
    }

    // 6. Insert Invoices & Payments
    for (const inv of parsedData.invoices) {
      const customerId = custIdCache.get(inv.customerCode);
      if (!customerId) continue;

      const invRes = insertInv.run(
        customerId,
        inv.billingPeriod,
        inv.amount,
        inv.status,
        inv.unpaidAmount,
        inv.unpaidMonths,
        inv.notes
      );
      const invoiceId = invRes.lastInsertRowid;
      totalInvs++;

      if (inv.isLunas || inv.status === 'LUNAS') {
        const payDate = `${inv.billingPeriod}-15`;
        insertPay.run(invoiceId, inv.paymentMethod || 'BRI', inv.amount, payDate, inv.notes);
        totalPays++;
      }
    }

    // 7. Monthly status history
    if (Array.isArray(parsedData.monthlyHistory)) {
      for (const h of parsedData.monthlyHistory) {
        const customerId = custIdCache.get(h.customerCode);
        if (customerId) {
          insertHist.run(customerId, h.billingPeriod, h.statusText, h.sourceSheet || 'Excel');
        }
      }
    }

    // 8. Official July & August 2026 expenses
    const officialExpenses = [
      // Juli 2026 (Total: Rp 1.130.000)
      { date: '2026-07-13', description: 'fee mas fany', amount: 280000, category: 'FEE' },
      { date: '2026-07-13', description: 'fee mba ida', amount: 560000, category: 'FEE' },
      { date: '2026-07-17', description: 'fee mas fany', amount: 230000, category: 'FEE' },
      { date: '2026-07-31', description: 'fee mas fany', amount: 60000, category: 'FEE' },
      // Agustus 2026 (Total: Rp 1.515.000)
      { date: '2026-08-14', description: 'fee mas fany', amount: 335000, category: 'FEE' },
      { date: '2026-08-16', description: 'fee mas fany', amount: 180000, category: 'FEE' },
      { date: '2026-08-16', description: 'fee mba ida', amount: 575000, category: 'FEE' },
      { date: '2026-08-16', description: 'fee mba dita', amount: 285000, category: 'FEE' },
      { date: '2026-08-16', description: 'fee mba dita', amount: 35000, category: 'FEE' },
      { date: '2026-08-23', description: 'fee mas fany', amount: 60000, category: 'FEE' },
      { date: '2026-08-24', description: 'fee mba yeni', amount: 45000, category: 'FEE' },
    ];
    for (const exp of officialExpenses) {
      insertExp.run(exp.date, exp.description, exp.amount, exp.category);
    }
  });

  transaction();
  db.close();

  return {
    strategy: 'FULL_REBUILD',
    backupPath,
    insertedCustomers: totalCust,
    insertedInvoices: totalInvs,
    insertedPayments: totalPays,
    periodsCount: parsedData.periods.length,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Performs Incremental Merge / Smart Upsert
 * @param {object} parsedData
 * @returns {object} Execution audit metrics
 */
export function commitIncrementalUpsert(parsedData) {
  const dbPath = resolveDbPath();
  const backupPath = createDatabaseBackup();

  const db = new Database(dbPath, { timeout: 15000 });
  try { db.pragma('journal_mode = WAL'); } catch (_) {}
  try { db.pragma('foreign_keys = ON'); } catch (_) {}

  let insertedCust = 0;
  let updatedCust = 0;
  let insertedInvs = 0;
  let updatedInvs = 0;
  let updatedPays = 0;

  const transaction = db.transaction(() => {
    const getAreaId = db.prepare('SELECT id FROM areas WHERE code = ?');
    const getPkgId = db.prepare('SELECT id FROM packages WHERE code = ?');
    const getCust = db.prepare('SELECT id FROM customers WHERE customer_code = ?');
    const insertCust = db.prepare('INSERT INTO customers (customer_code, name, area_id, package_id) VALUES (?, ?, ?, ?)');
    const updateCust = db.prepare('UPDATE customers SET name = ?, area_id = ?, package_id = ? WHERE id = ?');

    const getInv = db.prepare('SELECT id FROM invoices WHERE customer_id = ? AND billing_period = ?');
    const insertInv = db.prepare('INSERT INTO invoices (customer_id, billing_period, amount, status, unpaid_amount, unpaid_months, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const updateInv = db.prepare('UPDATE invoices SET amount = ?, status = ?, unpaid_amount = ?, unpaid_months = ?, notes = ? WHERE id = ?');

    const deletePays = db.prepare('DELETE FROM payments WHERE invoice_id = ?');
    const insertPay = db.prepare('INSERT INTO payments (invoice_id, payment_method, amount_paid, payment_date, notes) VALUES (?, ?, ?, ?, ?)');
    const insertHist = db.prepare('INSERT INTO monthly_status_history (customer_id, month_year, status_text, source_sheet) VALUES (?, ?, ?, ?)');

    // 1. Upsert Customers
    const custIdCache = new Map();

    for (const c of parsedData.customers) {
      const areaRow = getAreaId.get(c.areaCode);
      const areaId = areaRow ? areaRow.id : 1;
      const pkgRow = getPkgId.get(c.packageCode || 10);
      const pkgId = pkgRow ? pkgRow.id : 1;

      const existingCust = getCust.get(c.customerCode);
      if (existingCust) {
        updateCust.run(c.name, areaId, pkgId, existingCust.id);
        custIdCache.set(c.customerCode, existingCust.id);
        updatedCust++;
      } else {
        const res = insertCust.run(c.customerCode, c.name, areaId, pkgId);
        custIdCache.set(c.customerCode, res.lastInsertRowid);
        insertedCust++;
      }
    }

    // 2. Upsert Invoices & Payments
    for (const inv of parsedData.invoices) {
      const customerId = custIdCache.get(inv.customerCode);
      if (!customerId) continue;

      const existingInv = getInv.get(customerId, inv.billingPeriod);
      let invoiceId = null;

      if (existingInv) {
        updateInv.run(inv.amount, inv.status, inv.unpaidAmount, inv.unpaidMonths, inv.notes, existingInv.id);
        invoiceId = existingInv.id;
        updatedInvs++;
      } else {
        const res = insertInv.run(
          customerId,
          inv.billingPeriod,
          inv.amount,
          inv.status,
          inv.unpaidAmount,
          inv.unpaidMonths,
          inv.notes
        );
        invoiceId = res.lastInsertRowid;
        insertedInvs++;
      }

      // Re-sync payments for this invoice
      deletePays.run(invoiceId);
      if (inv.isLunas || inv.status === 'LUNAS') {
        const payDate = `${inv.billingPeriod}-15`;
        insertPay.run(invoiceId, inv.paymentMethod || 'BRI', inv.amount, payDate, inv.notes);
        updatedPays++;
      }
    }

    // 3. Upsert Monthly History
    if (Array.isArray(parsedData.monthlyHistory)) {
      for (const h of parsedData.monthlyHistory) {
        const customerId = custIdCache.get(h.customerCode);
        if (customerId) {
          insertHist.run(customerId, h.billingPeriod, h.statusText, h.sourceSheet || 'Excel Merge');
        }
      }
    }
  });

  transaction();
  db.close();

  return {
    strategy: 'INCREMENTAL_UPSERT',
    backupPath,
    insertedCustomers: insertedCust,
    updatedCustomers: updatedCust,
    insertedInvoices: insertedInvs,
    updatedInvoices: updatedInvs,
    updatedPayments: updatedPays,
    periodsCount: parsedData.periods.length,
    timestamp: new Date().toISOString(),
  };
}

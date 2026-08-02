// ============================================================
// Infrastructure: Repository implementations (Ports & Adapters)
// Enhanced with Granular Month Filter & Multi-Select Area Filter.
// ============================================================
import { getReadonlyDatabase, getDatabase } from '../database/connection.js';
import { Ok, Err } from '../../domain/types/index.js';

// Month names in Indonesian
const MONTH_NAMES = {
  '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
  '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
  '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember'
};

function formatMonthLabel(yyyy_mm) {
  if (!yyyy_mm || !yyyy_mm.includes('-')) return yyyy_mm;
  const [yyyy, mm] = yyyy_mm.split('-');
  return `${MONTH_NAMES[mm] || mm} ${yyyy}`;
}

/** Helper to parse areas parameter (string comma-separated or array) */
function parseAreasParam(areas) {
  if (!areas) return [];
  if (Array.isArray(areas)) return areas.filter(Boolean);
  if (typeof areas === 'string') {
    return areas.split(',').map(a => a.trim()).filter(Boolean);
  }
  return [];
}

// ============================================================
// Available Months Query
// ============================================================
export function getAvailableMonths() {
  try {
    const db = getReadonlyDatabase();

    const invoicePeriods = db.prepare('SELECT DISTINCT billing_period as period FROM invoices').all().map(r => r.period);
    const historyPeriods = db.prepare('SELECT DISTINCT month_year as period FROM monthly_status_history').all().map(r => r.period);

    const allPeriods = Array.from(new Set([...invoicePeriods, ...historyPeriods]))
      .filter(p => /^\d{4}-\d{2}$/.test(p))
      .sort((a, b) => b.localeCompare(a));

    const result = allPeriods.map(p => ({
      code: p,
      label: formatMonthLabel(p),
    }));

    db.close();
    return Ok(result);
  } catch (err) {
    return Err(`Database error in getAvailableMonths: ${err.message}`);
  }
}

// ============================================================
// Dashboard / Summary Repository (Month + Multi-Area Support)
// ============================================================

/**
 * @param {object} [params]
 * @param {string} [params.month] - YYYY-MM or 'ALL'
 * @param {string|string[]} [params.areas] - Area names (array or comma-separated)
 * @param {string} [params.status]
 * @returns {import('../../domain/types/index.js').Result<object, string>}
 */
export function getDashboardSummary({ month = '2026-07', areas = [], status = '' } = {}) {
  try {
    const db = getReadonlyDatabase();
    const areaList = parseAreasParam(areas);

    let custWhere = [];
    let custParams = [];

    if (areaList.length > 0) {
      const placeholders = areaList.map(() => '?').join(',');
      custWhere.push(`a.name IN (${placeholders})`);
      custParams.push(...areaList);
    }

    const custWhereClause = custWhere.length > 0 ? `WHERE ${custWhere.join(' AND ')}` : '';

    // Total customers matching area filter
    const totalCustQuery = `
      SELECT COUNT(DISTINCT c.id) as c
      FROM customers c
      JOIN areas a ON c.area_id = a.id
      ${custWhereClause}
    `;
    const totalCustomers = db.prepare(totalCustQuery).get(...custParams).c;

    // Filter invoices by month & areas
    let invWhere = [];
    let invParams = [];

    if (month && month !== 'ALL') {
      invWhere.push('i.billing_period = ?');
      invParams.push(month);
    }
    if (areaList.length > 0) {
      const placeholders = areaList.map(() => '?').join(',');
      invWhere.push(`a.name IN (${placeholders})`);
      invParams.push(...areaList);
    }
    if (status) {
      invWhere.push('i.status = ?');
      invParams.push(status);
    }

    const invWhereClause = invWhere.length > 0 ? `WHERE ${invWhere.join(' AND ')}` : '';

    // Total revenue paid
    const paidQuery = `
      SELECT COALESCE(SUM(p.amount_paid), 0) as total
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN customers c ON i.customer_id = c.id
      JOIN areas a ON c.area_id = a.id
      ${invWhereClause}
    `;
    let totalPaid = db.prepare(paidQuery).get(...invParams).total;

    // Total outstanding (only BELUM LUNAS / ISOLIR with unpaid_amount > 0)
    const outstandingQuery = `
      SELECT COALESCE(SUM(i.unpaid_amount), 0) as total
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN areas a ON c.area_id = a.id
      ${invWhereClause ? invWhereClause + " AND i.status NOT IN ('LUNAS', 'FREE')" : "WHERE i.status NOT IN ('LUNAS', 'FREE')"}
    `;
    let totalOutstanding = db.prepare(outstandingQuery).get(...invParams).total;

    // If month is a historical month not directly in invoices (e.g. 2026-06), evaluate status from monthly_status_history
    if (month && month !== 'ALL' && totalPaid === 0 && totalOutstanding === 0) {
      let histWhere = ['msh.month_year = ?'];
      let histParams = [month];
      if (areaList.length > 0) {
        const placeholders = areaList.map(() => '?').join(',');
        histWhere.push(`a.name IN (${placeholders})`);
        histParams.push(...areaList);
      }
      const histWhereClause = `WHERE ${histWhere.join(' AND ')}`;

      const histQuery = `
        SELECT
          msh.status_text,
          COALESCE(pkg.price, 100000) as price
        FROM monthly_status_history msh
        JOIN customers c ON msh.customer_id = c.id
        JOIN areas a ON c.area_id = a.id
        LEFT JOIN packages pkg ON c.package_id = pkg.id
        ${histWhereClause}
      `;
      const histRows = db.prepare(histQuery).all(...histParams);

      for (const row of histRows) {
        if (row.status_text && row.status_text.toLowerCase().includes('lunas')) {
          totalPaid += row.price;
        } else if (row.status_text && !row.status_text.toLowerCase().includes('free')) {
          totalOutstanding += row.price;
        }
      }
    }

    // Expenses
    const totalExpenses = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses').get().total;

    // Payment breakdown by method
    const paymentBreakdownQuery = `
      SELECT p.payment_method as method, SUM(p.amount_paid) as total
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN customers c ON i.customer_id = c.id
      JOIN areas a ON c.area_id = a.id
      ${invWhereClause}
      GROUP BY p.payment_method ORDER BY total DESC
    `;
    const paymentBreakdown = db.prepare(paymentBreakdownQuery).all(...invParams).map(row => ({
      ...row,
      percentage: totalPaid > 0 ? Math.round((row.total / totalPaid) * 10000) / 100 : 0
    }));

    // Area breakdown
    const areaBreakdownQuery = `
      SELECT
        a.name as areaName,
        COUNT(DISTINCT c.id) as totalCustomers,
        COALESCE(SUM(CASE WHEN i.status = 'LUNAS' THEN i.amount ELSE 0 END), 0) as totalPaid,
        COALESCE(SUM(CASE WHEN i.status NOT IN ('LUNAS', 'FREE') THEN i.unpaid_amount ELSE 0 END), 0) as totalUnpaid
      FROM areas a
      LEFT JOIN customers c ON c.area_id = a.id
      LEFT JOIN invoices i ON i.customer_id = c.id ${month && month !== 'ALL' ? 'AND i.billing_period = ?' : ''}
      ${custWhereClause}
      GROUP BY a.id, a.name
      HAVING totalCustomers > 0
      ORDER BY totalCustomers DESC
    `;
    const areaParams = (month && month !== 'ALL') ? [month, ...custParams] : custParams;
    const areaBreakdown = db.prepare(areaBreakdownQuery).all(...areaParams).map(row => ({
      ...row,
      collectionRate: (row.totalPaid + row.totalUnpaid) > 0
        ? Math.round((row.totalPaid / (row.totalPaid + row.totalUnpaid)) * 10000) / 100
        : 100
    }));

    // Status distribution
    const statusQuery = `
      SELECT i.status, COUNT(*) as count
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN areas a ON c.area_id = a.id
      ${invWhereClause}
      GROUP BY i.status ORDER BY count DESC
    `;
    const statusDistribution = db.prepare(statusQuery).all(...invParams);

    const lunasCount = statusDistribution.find(s => s.status === 'LUNAS')?.count || 0;
    const belumLunasCount = statusDistribution.find(s => s.status === 'BELUM LUNAS')?.count || 0;
    const isolirCount = statusDistribution.find(s => s.status === 'ISOLIR')?.count || 0;

    const arpu = totalCustomers > 0 ? Math.round(totalPaid / totalCustomers) : 0;

    db.close();

    return Ok({
      totalCustomers,
      totalRevenuePaid: totalPaid,
      totalOutstanding,
      totalExpenses,
      netBalance: totalPaid - totalExpenses,
      paymentBreakdown,
      areaBreakdown,
      statusDistribution,
      lunasCount,
      belumLunasCount,
      isolirCount,
      selectedMonth: month,
      selectedAreas: areaList,
      arpu,
    });
  } catch (err) {
    return Err(`Database error in getDashboardSummary: ${err.message}`);
  }
}

// ============================================================
// Report Table Repository (Month + Multi-Area Filter Support)
// ============================================================

/**
 * @param {object} params
 * @param {string} [params.search]
 * @param {string} [params.status]
 * @param {string|string[]} [params.areas]
 * @param {string} [params.month]
 * @param {string} [params.sortBy]
 * @param {string} [params.sortDir]
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @returns {import('../../domain/types/index.js').Result<object, string>}
 */
export function getReportTable({
  search = '',
  status = '',
  areas = [],
  month = '2026-07',
  sortBy = 'customer_code',
  sortDir = 'ASC',
  page = 1,
  limit = 50,
} = {}) {
  try {
    const db = getReadonlyDatabase();

    const SORTABLE = ['customer_code', 'name', 'area_name', 'amount', 'status', 'unpaid_amount'];
    const safeSortBy = SORTABLE.includes(sortBy) ? sortBy : 'customer_code';
    const safeSortDir = sortDir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const areaList = parseAreasParam(areas);

    let where = [];
    let params = [];

    if (search) {
      where.push("(c.customer_code LIKE ? OR c.name LIKE ? OR a.name LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("i.status = ?");
      params.push(status);
    }
    if (areaList.length > 0) {
      const placeholders = areaList.map(() => '?').join(',');
      where.push(`a.name IN (${placeholders})`);
      params.push(...areaList);
    }
    if (month && month !== 'ALL') {
      where.push("i.billing_period = ?");
      params.push(month);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) as total
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN areas a ON c.area_id = a.id
      ${whereClause}
    `;
    let totalRows = db.prepare(countQuery).get(...params).total;

    // Data query
    let dataQuery = `
      SELECT
        c.id as customer_id,
        c.customer_code,
        c.name,
        a.name as area_name,
        p.speed_name as package_name,
        p.price as package_price,
        i.id as invoice_id,
        i.amount,
        i.status,
        i.unpaid_amount,
        i.unpaid_months,
        i.notes as keterangan,
        i.billing_period,
        COALESCE((SELECT SUM(py.amount_paid) FROM payments py WHERE py.invoice_id = i.id AND py.payment_method = 'CASH'), 0) as cash_paid,
        COALESCE((SELECT SUM(py.amount_paid) FROM payments py WHERE py.invoice_id = i.id AND py.payment_method = 'BCA'), 0) as bca_paid,
        COALESCE((SELECT SUM(py.amount_paid) FROM payments py WHERE py.invoice_id = i.id AND py.payment_method = 'BRI'), 0) as bri_paid,
        COALESCE((SELECT SUM(py.amount_paid) FROM payments py WHERE py.invoice_id = i.id AND py.payment_method = 'MANDIRI'), 0) as mandiri_paid,
        COALESCE((SELECT SUM(py.amount_paid) FROM payments py WHERE py.invoice_id = i.id AND py.payment_method = 'BNI'), 0) as bni_paid
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN areas a ON c.area_id = a.id
      LEFT JOIN packages p ON c.package_id = p.id
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortDir}
      LIMIT ? OFFSET ?
    `;

    const offset = (page - 1) * limit;
    let rows = db.prepare(dataQuery).all(...params, limit, offset);

    // If month is a historical month (e.g. 2026-06) not in invoices table directly, fallback to monthly_status_history
    if (totalRows === 0 && month && month !== 'ALL') {
      let hWhere = ['msh.month_year = ?'];
      let hParams = [month];

      if (search) {
        hWhere.push("(c.customer_code LIKE ? OR c.name LIKE ? OR a.name LIKE ?)");
        hParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (areaList.length > 0) {
        const placeholders = areaList.map(() => '?').join(',');
        hWhere.push(`a.name IN (${placeholders})`);
        hParams.push(...areaList);
      }

      const hWhereClause = `WHERE ${hWhere.join(' AND ')}`;

      const hCountQuery = `
        SELECT COUNT(*) as total
        FROM monthly_status_history msh
        JOIN customers c ON msh.customer_id = c.id
        JOIN areas a ON c.area_id = a.id
        ${hWhereClause}
      `;
      totalRows = db.prepare(hCountQuery).get(...hParams).total;

      const hDataQuery = `
        SELECT
          c.id as customer_id,
          c.customer_code,
          c.name,
          a.name as area_name,
          p.speed_name as package_name,
          p.price as package_price,
          NULL as invoice_id,
          COALESCE(p.price, 100000) as amount,
          CASE WHEN LOWER(msh.status_text) LIKE '%lunas%' THEN 'LUNAS' ELSE 'BELUM LUNAS' END as status,
          CASE WHEN LOWER(msh.status_text) LIKE '%lunas%' THEN 0 ELSE COALESCE(p.price, 100000) END as unpaid_amount,
          0 as unpaid_months,
          msh.status_text as keterangan,
          msh.month_year as billing_period,
          0 as cash_paid, 0 as bca_paid, 0 as bri_paid, 0 as mandiri_paid, 0 as bni_paid
        FROM monthly_status_history msh
        JOIN customers c ON msh.customer_id = c.id
        JOIN areas a ON c.area_id = a.id
        LEFT JOIN packages p ON c.package_id = p.id
        ${hWhereClause}
        ORDER BY c.customer_code ASC
        LIMIT ? OFFSET ?
      `;

      rows = db.prepare(hDataQuery).all(...hParams, limit, offset);
    }

    db.close();

    return Ok({
      data: rows,
      pagination: {
        page,
        limit,
        totalRows,
        totalPages: Math.ceil(totalRows / limit),
      },
    });
  } catch (err) {
    return Err(`Database error in getReportTable: ${err.message}`);
  }
}

// ============================================================
// Historical Trends Repository
// ============================================================

export function getHistoricalTrends() {
  try {
    const db = getReadonlyDatabase();

    const invoiceTrends = db.prepare(`
      SELECT
        i.billing_period as period,
        COALESCE(SUM(CASE WHEN i.status = 'LUNAS' THEN i.amount ELSE 0 END), 0) as paidAmount,
        COALESCE(SUM(CASE WHEN i.status NOT IN ('LUNAS', 'FREE') THEN i.unpaid_amount ELSE 0 END), 0) as unpaidAmount,
        COUNT(DISTINCT i.customer_id) as totalCustomers,
        COUNT(CASE WHEN i.status = 'LUNAS' THEN 1 END) as lunasCount
      FROM invoices i
      GROUP BY i.billing_period
    `).all();

    const historyTrends = db.prepare(`
      SELECT
        msh.month_year as period,
        COUNT(CASE WHEN LOWER(msh.status_text) LIKE '%lunas%' THEN 1 END) * 100000 as paidAmount,
        COUNT(CASE WHEN LOWER(msh.status_text) NOT LIKE '%lunas%' AND LOWER(msh.status_text) NOT LIKE '%free%' AND msh.status_text != '' THEN 1 END) * 100000 as unpaidAmount,
        COUNT(DISTINCT msh.customer_id) as totalCustomers,
        COUNT(CASE WHEN LOWER(msh.status_text) LIKE '%lunas%' THEN 1 END) as lunasCount
      FROM monthly_status_history msh
      GROUP BY msh.month_year
    `).all();

    const trendMap = new Map();
    for (const h of historyTrends) {
      trendMap.set(h.period, {
        period: h.period,
        paidAmount: h.paidAmount,
        unpaidAmount: h.unpaidAmount,
        totalCustomers: h.totalCustomers,
        lunasCount: h.lunasCount,
      });
    }
    for (const inv of invoiceTrends) {
      trendMap.set(inv.period, {
        period: inv.period,
        paidAmount: inv.paidAmount,
        unpaidAmount: inv.unpaidAmount,
        totalCustomers: inv.totalCustomers,
        lunasCount: inv.lunasCount,
      });
    }

    const combinedTrends = Array.from(trendMap.values())
      .sort((a, b) => a.period.localeCompare(b.period))
      .map(row => ({
        ...row,
        periodLabel: formatMonthLabel(row.period),
        collectionRate: (row.paidAmount + row.unpaidAmount) > 0
          ? Math.round((row.paidAmount / (row.paidAmount + row.unpaidAmount)) * 10000) / 100
          : 100
      }));

    db.close();
    return Ok(combinedTrends);
  } catch (err) {
    return Err(`Database error in getHistoricalTrends: ${err.message}`);
  }
}

// ============================================================
// MUTATION REPOSITORIES (CRUD via Website)
// ============================================================

export function createCustomer({ customerCode, name, areaId, packageId }) {
  try {
    const db = getDatabase();

    if (!customerCode || !name || !areaId) {
      db.close();
      return Err('Kode pelanggan, nama, dan area wajib diisi.');
    }

    const existing = db.prepare('SELECT id FROM customers WHERE customer_code = ?').get(customerCode);
    if (existing) {
      db.close();
      return Err(`Kode pelanggan ${customerCode} sudah digunakan.`);
    }

    const insertCust = db.prepare(
      'INSERT INTO customers (customer_code, name, area_id, package_id) VALUES (?, ?, ?, ?)'
    );
    const res = insertCust.run(customerCode, name, areaId, packageId || null);

    let price = 100000;
    if (packageId) {
      const pkg = db.prepare('SELECT price FROM packages WHERE id = ?').get(packageId);
      if (pkg) price = pkg.price;
    }

    const insertInv = db.prepare(
      'INSERT INTO invoices (customer_id, billing_period, amount, status, unpaid_amount, unpaid_months) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertInv.run(res.lastInsertRowid, '2026-07', price, 'BELUM LUNAS', price, 1);

    db.close();
    return Ok({ id: res.lastInsertRowid, customerCode, name });
  } catch (err) {
    return Err(`Gagal menambah pelanggan: ${err.message}`);
  }
}

export function updateCustomer(id, { customerCode, name, areaId, packageId }) {
  try {
    const db = getDatabase();

    const existing = db.prepare('SELECT id FROM customers WHERE id = ?').get(id);
    if (!existing) {
      db.close();
      return Err('Pelanggan tidak ditemukan.');
    }

    const codeCheck = db.prepare('SELECT id FROM customers WHERE customer_code = ? AND id != ?').get(customerCode, id);
    if (codeCheck) {
      db.close();
      return Err(`Kode pelanggan ${customerCode} sudah digunakan oleh pelanggan lain.`);
    }

    const stmt = db.prepare(
      'UPDATE customers SET customer_code = ?, name = ?, area_id = ?, package_id = ? WHERE id = ?'
    );
    stmt.run(customerCode, name, areaId, packageId || null, id);

    db.close();
    return Ok({ id, customerCode, name });
  } catch (err) {
    return Err(`Gagal mengedit pelanggan: ${err.message}`);
  }
}

export function updateInvoice(id, { status, amount, notes }) {
  try {
    const db = getDatabase();

    const existing = db.prepare('SELECT id FROM invoices WHERE id = ?').get(id);
    if (!existing) {
      db.close();
      return Err('Tagihan tidak ditemukan.');
    }

    const unpaidAmount = status === 'LUNAS' ? 0 : amount;
    const unpaidMonths = status === 'LUNAS' ? 0 : 1;

    const stmt = db.prepare(
      'UPDATE invoices SET status = ?, amount = ?, unpaid_amount = ?, unpaid_months = ?, notes = ? WHERE id = ?'
    );
    stmt.run(status.toUpperCase(), amount, unpaidAmount, unpaidMonths, notes || null, id);

    db.close();
    return Ok({ id, status, amount });
  } catch (err) {
    return Err(`Gagal mengedit tagihan: ${err.message}`);
  }
}

export function getCustomersList({ search = '', areaId = '', page = 1, limit = 50 } = {}) {
  try {
    const db = getReadonlyDatabase();

    let where = [];
    let params = [];

    if (search) {
      where.push('(c.customer_code LIKE ? OR c.name LIKE ? OR a.name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (areaId) {
      where.push('c.area_id = ?');
      params.push(areaId);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) as total
      FROM customers c
      JOIN areas a ON c.area_id = a.id
      ${whereClause}
    `;
    const totalRows = db.prepare(countQuery).get(...params).total;

    const dataQuery = `
      SELECT
        c.id,
        c.customer_code,
        c.name,
        c.area_id,
        c.package_id,
        a.name as area_name,
        p.speed_name as package_name,
        COALESCE(p.price, 100000) as package_price,
        (SELECT status FROM invoices WHERE customer_id = c.id ORDER BY billing_period DESC LIMIT 1) as latest_status
      FROM customers c
      JOIN areas a ON c.area_id = a.id
      LEFT JOIN packages p ON c.package_id = p.id
      ${whereClause}
      ORDER BY c.customer_code ASC
      LIMIT ? OFFSET ?
    `;

    const offset = (page - 1) * limit;
    const rows = db.prepare(dataQuery).all(...params, limit, offset);

    db.close();
    return Ok({
      data: rows,
      pagination: {
        page,
        limit,
        totalRows,
        totalPages: Math.ceil(totalRows / limit),
      },
    });
  } catch (err) {
    return Err(`Database error in getCustomersList: ${err.message}`);
  }
}

export function recordPayment({ invoiceId, paymentMethod, amountPaid, notes }) {
  try {
    const db = getDatabase();

    const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    if (!inv) {
      db.close();
      return Err('Tagihan tidak ditemukan.');
    }

    const insertPay = db.prepare(
      "INSERT INTO payments (invoice_id, payment_method, amount_paid, payment_date, notes) VALUES (?, ?, ?, date('now'), ?)"
    );
    insertPay.run(invoiceId, paymentMethod.toUpperCase(), amountPaid, notes || null);

    const updateInv = db.prepare(
      "UPDATE invoices SET status = 'LUNAS', unpaid_amount = 0, unpaid_months = 0, notes = ? WHERE id = ?"
    );
    updateInv.run(`LUNAS (${paymentMethod}) ${notes || ''}`, invoiceId);

    db.close();
    return Ok({ invoiceId, status: 'LUNAS', amountPaid });
  } catch (err) {
    return Err(`Gagal mencatat pembayaran: ${err.message}`);
  }
}

export function createExpense({ expenseDate, description, amount, category = 'OPERASIONAL' }) {
  try {
    const db = getDatabase();

    if (!expenseDate || !description || !amount) {
      db.close();
      return Err('Tanggal, uraian, dan jumlah wajib diisi.');
    }

    const insertExp = db.prepare(
      'INSERT INTO expenses (expense_date, description, amount, category) VALUES (?, ?, ?, ?)'
    );
    const res = insertExp.run(expenseDate, description, amount, category.toUpperCase());

    db.close();
    return Ok({ id: res.lastInsertRowid, description, amount });
  } catch (err) {
    return Err(`Gagal menambah pengeluaran: ${err.message}`);
  }
}

export function getExpenses() {
  try {
    const db = getReadonlyDatabase();
    const rows = db.prepare('SELECT * FROM expenses ORDER BY id DESC').all();
    const total = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses').get().total;
    db.close();
    return Ok({ data: rows, total });
  } catch (err) {
    return Err(`Database error in getExpenses: ${err.message}`);
  }
}

export function getAreas() {
  try {
    const db = getReadonlyDatabase();
    const rows = db.prepare('SELECT * FROM areas ORDER BY name').all();
    db.close();
    return Ok(rows);
  } catch (err) {
    return Err(`Database error in getAreas: ${err.message}`);
  }
}

export function getPackages() {
  try {
    const db = getReadonlyDatabase();
    const rows = db.prepare('SELECT * FROM packages ORDER BY price').all();
    db.close();
    return Ok(rows);
  } catch (err) {
    return Err(`Database error in getPackages: ${err.message}`);
  }
}

export function getMonthlyHistory(customerCode) {
  try {
    const db = getReadonlyDatabase();
    const rows = db.prepare(`
      SELECT msh.month_year, msh.status_text, msh.source_sheet
      FROM monthly_status_history msh
      JOIN customers c ON msh.customer_id = c.id
      WHERE c.customer_code = ?
      ORDER BY msh.month_year
    `).all(customerCode);
    db.close();
    return Ok(rows);
  } catch (err) {
    return Err(`Database error in getMonthlyHistory: ${err.message}`);
  }
}

const MONTH_SHORT_ID = {
  '01': 'Jan',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Apr',
  '05': 'Mei',
  '06': 'Juni',
  '07': 'Juli',
  '08': 'Agustus',
  '09': 'September',
  '10': 'Oktober',
  '11': 'November',
  '12': 'Desember',
};

function formatUnpaidMonthsDetail(periodsStr) {
  if (!periodsStr) return '0 Bulan';
  const periods = Array.from(new Set(periodsStr.split(',').map(s => s.trim()))).sort();
  const monthNames = periods.map(p => {
    const parts = p.split('-');
    const m = parts[1];
    return MONTH_SHORT_ID[m] || m;
  });
  if (periods.length === 1) {
    return `1 Bulan (${monthNames[0]})`;
  }
  return `${periods.length} Bulan (${monthNames.join(', ')})`;
}

// ============================================================
// Unpaid Customers Report List (For PDF Page 3+)
// ============================================================
export function getUnpaidReportList({ month = '2026-07', areas = [] } = {}) {
  try {
    const db = getReadonlyDatabase();
    const areaList = parseAreasParam(areas);

    let areaFilter = '';
    let areaParams = [];

    if (areaList.length > 0) {
      const placeholders = areaList.map(() => '?').join(',');
      areaFilter = `AND a.name IN (${placeholders})`;
      areaParams.push(...areaList);
    }

    // 1. Get all active customers matching area filter
    const custQuery = `
      SELECT
        c.id as customer_id,
        c.customer_code,
        c.name as customer_name,
        a.name as area_name,
        COALESCE(p.speed_name, '10mbps') as package_name,
        COALESCE(p.price, 100000) as package_price
      FROM customers c
      JOIN areas a ON c.area_id = a.id
      LEFT JOIN packages p ON c.package_id = p.id
      WHERE 1=1 ${areaFilter}
      ORDER BY a.name ASC, c.customer_code ASC
    `;
    const customers = db.prepare(custQuery).all(...areaParams);

    let totalUnpaidCount = 0;
    let totalUnpaidAmount = 0;
    let totalFreeCount = 0;
    const resultList = [];

    for (const cust of customers) {
      // Check target month status
      const targetInv = db.prepare(
        'SELECT status, amount, unpaid_amount, notes FROM invoices WHERE customer_id = ? AND billing_period = ?'
      ).get(cust.id, month);

      const targetStatus = targetInv ? targetInv.status : '';

      if (targetStatus === 'FREE' || (targetInv?.notes || '').toLowerCase().includes('free')) {
        // Customer is FREE in the target month
        totalFreeCount++;
        resultList.push({
          customer_code: cust.customer_code,
          customer_name: cust.customer_name,
          area_name: cust.area_name,
          package_name: cust.package_name,
          package_price: cust.package_price,
          amount: 0,
          unpaid_amount: 0,
          unpaid_months: 0,
          unpaid_detail: 'FREE',
          is_free: true,
          status_label: 'FREE / GRATIS',
          keterangan: 'FREE (Gratis / Diskon)',
        });
      } else {
        // Check unpaid invoices for periods <= month where status != 'LUNAS' AND status != 'FREE'
        const unpaidInvoices = db.prepare(`
          SELECT billing_period, amount, unpaid_amount, status, notes
          FROM invoices
          WHERE customer_id = ?
            AND billing_period <= ?
            AND status NOT IN ('LUNAS', 'FREE')
            AND LOWER(COALESCE(notes, '')) NOT LIKE '%free%'
          ORDER BY billing_period ASC
        `).all(cust.id, month);

        if (unpaidInvoices.length > 0) {
          const sumUnpaid = unpaidInvoices.reduce(
            (acc, inv) => acc + (inv.unpaid_amount > 0 ? inv.unpaid_amount : (inv.amount || cust.package_price)),
            0
          );
          const periodsStr = unpaidInvoices.map(i => i.billing_period).join(',');
          const detailStr = formatUnpaidMonthsDetail(periodsStr);

          totalUnpaidCount++;
          totalUnpaidAmount += sumUnpaid;

          resultList.push({
            customer_code: cust.customer_code,
            customer_name: cust.customer_name,
            area_name: cust.area_name,
            package_name: cust.package_name,
            package_price: cust.package_price,
            amount: sumUnpaid,
            unpaid_amount: sumUnpaid,
            unpaid_months: unpaidInvoices.length,
            unpaid_detail: detailStr,
            is_free: false,
            status_label: 'BELUM LUNAS',
            keterangan: detailStr,
          });
        }
      }
    }

    db.close();

    return Ok({
      unpaidCustomers: resultList,
      totalUnpaidCount,
      totalUnpaidAmount,
      totalFreeCount,
    });
  } catch (err) {
    return Err(`Database error in getUnpaidReportList: ${err.message}`);
  }
}


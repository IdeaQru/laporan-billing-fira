// ============================================================
// Express REST API Server — JWT Auth + Granular Month & Multi-Area Filter
// ============================================================
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {
  getDashboardSummary,
  getReportTable,
  getExpenses,
  getAreas,
  getPackages,
  getMonthlyHistory,
  getHistoricalTrends,
  getAvailableMonths,
  getCustomersList,
  getUnpaidReportList,
  createCustomer,
  updateCustomer,
  updateInvoice,
  recordPayment,
  createExpense,
} from '../infrastructure/repositories/index.js';
import {
  calcCollectionEfficiency,
  calcNetBalance,
  findHighestUnpaidArea,
  findLowestUnpaidArea,
  generateDetailNarrative,
} from '../domain/services/index.js';
import ExcelJS from 'exceljs';
import { migrate } from '../infrastructure/etl/migrate_excel_to_sqlite.js';
import { generateDashboardExcel } from '../infrastructure/etl/generate_dashboard_excel.js';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = join(__dirname, '..', '..');


const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'laporan-wifi-secret-2026-fira';

// Hashed password for 'admin'
const HASHED_PASSWORD = bcrypt.hashSync('admin', 10);

// In-memory user store (single account)
const USERS = [
  { id: 1, username: 'Fira', passwordHash: HASHED_PASSWORD, role: 'admin' },
];

// ============================================================
// Auth Middleware
// ============================================================
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // Support query parameter ?token=... for browser download links (<a href="...">)
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) return res.status(401).json({ error: 'Token tidak ditemukan. Silakan login.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: 'Token tidak valid atau sudah kedaluwarsa. Silakan login ulang.' });
  }
}

app.use(cors({ origin: '*' }));
app.use(express.json());

// ============================================================
// POST /api/auth/login — Public (no auth required)
// ============================================================
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi.' });
  }

  const user = USERS.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Username atau password salah.' });

  const valid = bcrypt.compareSync(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Username atau password salah.' });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, username: user.username, role: user.role, expiresIn: 28800 });
});

// ============================================================
// GET /api/auth/verify — Verify existing token
// ============================================================
app.get('/api/auth/verify', requireAuth, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Apply auth middleware to all remaining /api/* routes
app.use('/api', requireAuth);

// ============================================================
// GET /api/months — List of available historical months
// ============================================================
app.get('/api/months', (req, res) => {
  const result = getAvailableMonths();
  if (!result.ok) return res.status(500).json({ error: result.error });
  res.json(result.value);
});

// ============================================================
// GET /api/dashboard/summary — Supports ?month=2026-06&areas=Jambu,Blimbingsari
// ============================================================
app.get('/api/dashboard/summary', (req, res) => {
  const { month, areas, status } = req.query;
  const result = getDashboardSummary({
    month: month || '2026-07',
    areas: areas || [],
    status: status || '',
  });

  if (!result.ok) {
    return res.status(500).json({ error: result.error });
  }

  const data = result.value;
  const collectionEfficiency = calcCollectionEfficiency(data.totalRevenuePaid, data.totalOutstanding);
  const netBalance = calcNetBalance(data.totalRevenuePaid, data.totalExpenses);
  const highestUnpaidArea = findHighestUnpaidArea(data.areaBreakdown);
  const lowestUnpaidArea = findLowestUnpaidArea(data.areaBreakdown);

  const detailNarrative = generateDetailNarrative({
    totalCustomers: data.totalCustomers,
    totalRevenuePaid: data.totalRevenuePaid,
    totalOutstanding: data.totalOutstanding,
    totalExpenses: data.totalExpenses,
    netBalance,
    collectionEfficiency,
    highestUnpaidArea,
    lowestUnpaidArea,
    paymentBreakdown: data.paymentBreakdown,
    areaBreakdown: data.areaBreakdown,
  });

  res.json({
    ...data,
    collectionEfficiency,
    netBalance,
    highestUnpaidArea,
    lowestUnpaidArea,
    detailNarrative,
  });
});

// ============================================================
// GET /api/dashboard/history-trends — Historical Trends Across Periods
// ============================================================
app.get('/api/dashboard/history-trends', (req, res) => {
  const result = getHistoricalTrends();
  if (!result.ok) {
    return res.status(500).json({ error: result.error });
  }
  res.json(result.value);
});

// ============================================================
// GET /api/reports/table — Report table with month & multi-area filter
// ============================================================
app.get('/api/reports/table', (req, res) => {
  const { search, status, areas, month, sortBy, sortDir, page, limit } = req.query;
  const result = getReportTable({
    search: search || '',
    status: status || '',
    areas: areas || [],
    month: month || '2026-07',
    sortBy: sortBy || 'customer_code',
    sortDir: sortDir || 'ASC',
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50,
  });

  if (!result.ok) {
    return res.status(500).json({ error: result.error });
  }
  res.json(result.value);
});

// ============================================================
// GET /api/reports/unpaid-list — Full unpaid list for PDF report (Page 3+)
// ============================================================
app.get('/api/reports/unpaid-list', (req, res) => {
  const { month, areas } = req.query;
  const result = getUnpaidReportList({
    month: month || '2026-07',
    areas: areas || [],
  });

  if (!result.ok) {
    return res.status(500).json({ error: result.error });
  }
  res.json(result.value);
});

// ============================================================
// POST Endpoints: CRUD
// ============================================================
app.get('/api/customers', (req, res) => {
  const { search, areaId, page, limit } = req.query;
  const result = getCustomersList({
    search: search || '',
    areaId: areaId || '',
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50,
  });
  if (!result.ok) return res.status(500).json({ error: result.error });
  res.json(result.value);
});

app.post('/api/customers', (req, res) => {
  const { customerCode, name, areaId, packageId } = req.body;
  const result = createCustomer({
    customerCode,
    name,
    areaId: parseInt(areaId),
    packageId: packageId ? parseInt(packageId) : null,
  });
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.status(201).json(result.value);
});

app.put('/api/customers/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { customerCode, name, areaId, packageId } = req.body;
  const result = updateCustomer(id, {
    customerCode,
    name,
    areaId: parseInt(areaId),
    packageId: packageId ? parseInt(packageId) : null,
  });
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json(result.value);
});

app.put('/api/invoices/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { status, amount, notes } = req.body;
  const result = updateInvoice(id, {
    status,
    amount: parseInt(amount),
    notes,
  });
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json(result.value);
});

app.post('/api/invoices/:id/pay', (req, res) => {
  const invoiceId = parseInt(req.params.id);
  const { paymentMethod, amountPaid, notes } = req.body;
  const result = recordPayment({
    invoiceId,
    paymentMethod,
    amountPaid: parseInt(amountPaid),
    notes,
  });
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json(result.value);
});

app.post('/api/expenses', (req, res) => {
  const { expenseDate, description, amount, category } = req.body;
  const result = createExpense({
    expenseDate,
    description,
    amount: parseInt(amount),
    category,
  });
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.status(201).json(result.value);
});

// ============================================================
// Query Endpoints: Expenses, Areas, Packages, Customer History
// ============================================================
app.get('/api/expenses', (req, res) => {
  const result = getExpenses();
  if (!result.ok) return res.status(500).json({ error: result.error });
  res.json(result.value);
});

app.get('/api/areas', (req, res) => {
  const result = getAreas();
  if (!result.ok) return res.status(500).json({ error: result.error });
  res.json(result.value);
});

app.get('/api/packages', (req, res) => {
  const result = getPackages();
  if (!result.ok) return res.status(500).json({ error: result.error });
  res.json(result.value);
});

app.get('/api/customers/:code/history', (req, res) => {
  const result = getMonthlyHistory(req.params.code);
  if (!result.ok) return res.status(500).json({ error: result.error });
  res.json(result.value);
});

// ============================================================
// GET /api/reports/export/excel — Export XLSX
// ============================================================
app.get('/api/reports/export/excel', async (req, res) => {
  const { search, status, areas, month } = req.query;
  const result = getReportTable({
    search: search || '',
    status: status || '',
    areas: areas || [],
    month: month || '2026-07',
    page: 1,
    limit: 10000,
  });

  if (!result.ok) {
    return res.status(500).json({ error: result.error });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Laporan WiFi Billing';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Laporan Tagihan', {
    properties: { tabColor: { argb: '4F46E5' } },
  });

  ws.mergeCells('A1:Q1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `LAPORAN TAGIHAN WIFI BILLING BULAN ${month || 'JULI 2026'}`;
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F46E5' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 35;

  ws.mergeCells('A2:Q2');
  const dateCell = ws.getCell('A2');
  dateCell.value = `Dicetak: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
  dateCell.font = { italic: true, size: 10, color: { argb: '6B7280' } };
  dateCell.alignment = { horizontal: 'center' };
  ws.getRow(2).height = 22;

  const headers = [
    'No', 'Periode', 'ID Pelanggan', 'Nama', 'Area', 'Paket', 'Harga Paket',
    'Tagihan', 'Status', 'CASH', 'BCA', 'BRI', 'MANDIRI', 'BNI',
    'Tunggakan (Rp)', 'Tunggakan (Bulan)', 'Keterangan'
  ];

  const headerRow = ws.addRow(headers);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  const data = result.value.data;
  let totalTagihan = 0, totalCash = 0, totalBca = 0, totalBri = 0, totalMandiri = 0, totalBni = 0, totalTunggakan = 0;

  data.forEach((row, idx) => {
    const r = ws.addRow([
      idx + 1,
      row.billing_period,
      row.customer_code,
      row.name,
      row.area_name,
      row.package_name || '-',
      row.package_price || 0,
      row.amount,
      row.status,
      row.cash_paid || 0,
      row.bca_paid || 0,
      row.bri_paid || 0,
      row.mandiri_paid || 0,
      row.bni_paid || 0,
      row.unpaid_amount || 0,
      row.unpaid_months || 0,
      row.keterangan || '',
    ]);

    totalTagihan += row.amount;
    totalCash += (row.cash_paid || 0);
    totalBca += (row.bca_paid || 0);
    totalBri += (row.bri_paid || 0);
    totalMandiri += (row.mandiri_paid || 0);
    totalBni += (row.bni_paid || 0);
    totalTunggakan += (row.unpaid_amount || 0);

    const statusCell = r.getCell(9);
    if (row.status === 'LUNAS') {
      statusCell.font = { bold: true, color: { argb: '059669' } };
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D1FAE5' } };
    } else {
      statusCell.font = { bold: true, color: { argb: 'D97706' } };
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
    }

    [7, 8, 10, 11, 12, 13, 14, 15].forEach(col => {
      r.getCell(col).numFmt = '#,##0';
    });
  });

  const totalRow = ws.addRow([
    '', '', '', '', '', 'TOTAL', '',
    totalTagihan, '', totalCash, totalBca, totalBri, totalMandiri, totalBni,
    totalTunggakan, '', '',
  ]);
  totalRow.font = { bold: true, size: 11 };
  totalRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
  });

  ws.columns = [
    { width: 5 }, { width: 12 }, { width: 14 }, { width: 22 }, { width: 18 }, { width: 12 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 12 },
    { width: 12 }, { width: 12 }, { width: 12 }, { width: 16 }, { width: 16 }, { width: 20 },
  ];

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=laporan_wifi_billing.xlsx');

  await workbook.xlsx.write(res);
  res.end();
});

// ============================================================
// Sync Database Route
// ============================================================
app.post('/api/sync', async (req, res) => {
  try {
    const counts = migrate();

    // Auto-regenerate dashboard.xlsx after successful migration
    const dashPath = join(ROOT, 'data', 'raw', 'dashboard.xlsx');
    try {
      await generateDashboardExcel(dashPath);
      console.log('✅ dashboard.xlsx auto-regenerated after sync');
    } catch (dashErr) {
      console.warn('⚠️  dashboard.xlsx generation failed (non-fatal):', dashErr.message);
    }

    res.json({
      success: true,
      message: 'Database berhasil disinkronkan dari berkas sumber Excel dan dashboard.xlsx diperbarui',
      counts,
    });
  } catch (err) {
    console.error('Error during database sync:', err);
    res.status(500).json({ error: `Gagal menyinkronkan database: ${err.message}` });
  }
});

// ============================================================
// Export Dashboard Excel (Template Source Format)
// ============================================================
app.get('/api/reports/export/dashboard-template', (req, res) => {
  const { month, areas, search, status } = req.query;
  const areaList = areas ? String(areas).split(',') : [];

  const result = getReportTable({
    month,
    areas: areaList,
    search,
    status,
    page: 1,
    limit: 10000,
  });

  if (!result.ok) {
    return res.status(500).json({ error: result.error });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Laporan WiFi Billing System';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Tagihan Pelanggan', {
    properties: { tabColor: { argb: '0284C7' } },
  });

  ws.mergeCells('A1:N1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `REKAP TAGIHAN PELANGGAN WIFI BILLING - PERIODE ${month === 'ALL' ? 'SEMUA BULAN' : (month || 'JULI 2026')}`;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0284C7' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 32;

  const headers = [
    'NO', 'NAMA KELOMPOK / AREA', 'KODE/ID PELANGGAN', 'NAMA PELANGGAN', 'PAKET', 'HARGA',
    'CASH', 'BCA', 'BRI', 'MANDIRI', 'BNI', 'KETERANGAN', 'TUNGGAKAN (RP)', 'TUNGGAKAN (BULAN)'
  ];

  const headerRow = ws.addRow(headers);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  const data = result.value.data;
  let totalHarga = 0, totalCash = 0, totalBca = 0, totalBri = 0, totalMandiri = 0, totalBni = 0, totalTunggakan = 0;

  data.forEach((row, idx) => {
    const r = ws.addRow([
      idx + 1,
      row.area_name || '-',
      row.customer_code,
      row.name,
      row.package_name || '-',
      row.package_price || 0,
      row.cash_paid || 0,
      row.bca_paid || 0,
      row.bri_paid || 0,
      row.mandiri_paid || 0,
      row.bni_paid || 0,
      row.keterangan || row.status || '',
      row.unpaid_amount || 0,
      row.unpaid_months || 0,
    ]);

    totalHarga += (row.package_price || 0);
    totalCash += (row.cash_paid || 0);
    totalBca += (row.bca_paid || 0);
    totalBri += (row.bri_paid || 0);
    totalMandiri += (row.mandiri_paid || 0);
    totalBni += (row.bni_paid || 0);
    totalTunggakan += (row.unpaid_amount || 0);

    const ketCell = r.getCell(12);
    if (row.status === 'LUNAS') {
      ketCell.font = { bold: true, color: { argb: '059669' } };
    } else if ((row.keterangan || '').toLowerCase().includes('free')) {
      ketCell.font = { bold: true, color: { argb: '0284C7' } };
    } else {
      ketCell.font = { bold: true, color: { argb: 'DC2626' } };
    }

    [6, 7, 8, 9, 10, 11, 13].forEach(col => {
      r.getCell(col).numFmt = '#,##0';
    });
  });

  const totalRow = ws.addRow([
    '', 'TOTAL', '', '', '',
    totalHarga, totalCash, totalBca, totalBri, totalMandiri, totalBni,
    '', totalTunggakan, '',
  ]);
  totalRow.font = { bold: true, size: 11 };
  totalRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
  });

  ws.columns = [
    { width: 6 }, { width: 18 }, { width: 18 }, { width: 24 }, { width: 14 }, { width: 14 },
    { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 },
    { width: 22 }, { width: 16 }, { width: 16 },
  ];

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=dashboard_wifi_${month || 'juli_2026'}.xlsx`);

  workbook.xlsx.write(res).then(() => {
    res.end();
  });
});

// ============================================================
// GET /api/reports/export/dashboard-full — Download Full 6-Sheet dashboard.xlsx
// ============================================================
app.get('/api/reports/export/dashboard-full', async (req, res) => {
  try {
    const tmpPath = join(ROOT, 'data', 'raw', 'dashboard.xlsx');
    await generateDashboardExcel(tmpPath);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=dashboard_wifi_lengkap_${new Date().toISOString().slice(0,10)}.xlsx`);

    const ExcelJSWorkbook = new ExcelJS.Workbook();
    await ExcelJSWorkbook.xlsx.readFile(tmpPath);
    await ExcelJSWorkbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error generating dashboard-full:', err);
    res.status(500).json({ error: `Gagal mengekspor dashboard: ${err.message}` });
  }
});

// Export for Vercel serverless
export default app;

// Local dev runner
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Laporan WiFi API Server running on http://localhost:${PORT}`);
  });
}



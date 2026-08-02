// ============================================================
// generate_dashboard_excel.js
// Generates dashboard.xlsx with 6 complete sheets from SQLite:
//   1. Dashboard  — KPI summary + area breakdown + payment breakdown
//   2. NamaPelanggan — Master customer list
//   3. Tagihan Pelanggan — Invoice detail + payment channels
//   4. Pengeluaran — Expense records
//   5. Setup       — Package configuration
//   6. Read Me     — System documentation
// ============================================================
import ExcelJS from 'exceljs';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { resolveDbPath } from '../database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = join(__dirname, '..', '..', '..');

// ============================================================
// Style helpers
// ============================================================
const COLORS = {
  primary      : '4F46E5',   // indigo
  primaryDark  : '312E81',
  secondary    : '0284C7',   // sky
  success      : '059669',   // emerald
  warning      : 'D97706',   // amber
  danger       : 'DC2626',   // red
  purple       : '7C3AED',
  slate        : '1E293B',
  slateLight   : 'E2E8F0',
  white        : 'FFFFFF',
  lightGreen   : 'D1FAE5',
  lightAmber   : 'FEF3C7',
  lightBlue    : 'DBEAFE',
  lightPurple  : 'EDE9FE',
  headerBg     : '0F172A',
  free         : '0284C7',
};

function applyHeaderStyle(cell, bgColor = COLORS.headerBg) {
  cell.font  = { bold: true, size: 10, color: { argb: COLORS.white } };
  cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border = {
    top:    { style: 'thin', color: { argb: '334155' } },
    bottom: { style: 'thin', color: { argb: '334155' } },
    left:   { style: 'thin', color: { argb: '334155' } },
    right:  { style: 'thin', color: { argb: '334155' } },
  };
}

function applyDataBorder(cell) {
  cell.border = {
    top:    { style: 'hair', color: { argb: 'CBD5E1' } },
    bottom: { style: 'hair', color: { argb: 'CBD5E1' } },
    left:   { style: 'hair', color: { argb: 'CBD5E1' } },
    right:  { style: 'hair', color: { argb: 'CBD5E1' } },
  };
}

function applyTotalRow(row, colCount) {
  row.height = 24;
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    if (colNumber > colCount) return;
    cell.font = { bold: true, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slateLight } };
    applyDataBorder(cell);
  });
}

function addTitleRow(ws, title, colSpan, bgColor = COLORS.primary) {
  const range = `A1:${String.fromCharCode(64 + colSpan)}1`;
  ws.mergeCells(range);
  const cell = ws.getCell('A1');
  cell.value = title;
  cell.font  = { bold: true, size: 14, color: { argb: COLORS.white } };
  cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 36;
}

const IDR_FMT = '#,##0';

const MONTH_NAMES = {
  '01':'Januari','02':'Februari','03':'Maret','04':'April',
  '05':'Mei','06':'Juni','07':'Juli','08':'Agustus',
  '09':'September','10':'Oktober','11':'November','12':'Desember',
};
function monthLabel(yyyymm) {
  if (!yyyymm) return '';
  const [y, m] = yyyymm.split('-');
  return `${MONTH_NAMES[m] || m} ${y}`;
}
function today() {
  return new Date().toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

// ============================================================
// generateDashboardExcel(outputPath)
// ============================================================
export async function generateDashboardExcel(outputPath) {
  const DB_PATH = resolveDbPath();
  if (!existsSync(DB_PATH)) throw new Error(`Database tidak ditemukan: ${DB_PATH}`);

  const db = new Database(DB_PATH, { readonly: true });

  // ---- Fetch all data ----
  const packages   = db.prepare('SELECT * FROM packages ORDER BY price').all();
  const areas      = db.prepare('SELECT * FROM areas ORDER BY name').all();
  const customers  = db.prepare(`
    SELECT c.*, a.name as area_name, a.code as area_code,
           p.speed_name as package_name, COALESCE(p.price, 100000) as package_price
    FROM customers c
    JOIN areas a ON c.area_id = a.id
    LEFT JOIN packages p ON c.package_id = p.id
    ORDER BY a.name ASC, c.customer_code ASC
  `).all();

  const invoices = db.prepare(`
    SELECT i.*, c.customer_code, c.name as customer_name,
           a.name as area_name, a.code as area_code,
           p.speed_name as package_name, COALESCE(p.price, i.amount, 100000) as package_price,
           COALESCE((SELECT SUM(py.amount_paid) FROM payments py WHERE py.invoice_id = i.id AND py.payment_method = 'CASH'),    0) as cash_paid,
           COALESCE((SELECT SUM(py.amount_paid) FROM payments py WHERE py.invoice_id = i.id AND py.payment_method = 'BCA'),     0) as bca_paid,
           COALESCE((SELECT SUM(py.amount_paid) FROM payments py WHERE py.invoice_id = i.id AND py.payment_method = 'BRI'),     0) as bri_paid,
           COALESCE((SELECT SUM(py.amount_paid) FROM payments py WHERE py.invoice_id = i.id AND py.payment_method = 'MANDIRI'),0) as mandiri_paid,
           COALESCE((SELECT SUM(py.amount_paid) FROM payments py WHERE py.invoice_id = i.id AND py.payment_method = 'BNI'),     0) as bni_paid
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    JOIN areas a ON c.area_id = a.id
    LEFT JOIN packages p ON c.package_id = p.id
    ORDER BY a.name ASC, c.customer_code ASC, i.billing_period ASC
  `).all();

  const expenses = db.prepare('SELECT * FROM expenses ORDER BY id ASC').all();

  // Periods available
  const periods = db.prepare('SELECT DISTINCT billing_period FROM invoices ORDER BY billing_period').all().map(r => r.billing_period);

  // Latest period for KPI
  const latestPeriod = periods[periods.length - 1] || '2026-07';

  // KPI for latest period
  const kpi = db.prepare(`
    SELECT
      COUNT(DISTINCT i.customer_id) as totalCust,
      COALESCE(SUM(CASE WHEN i.status = 'LUNAS' THEN i.amount ELSE 0 END), 0) as totalPaid,
      COALESCE(SUM(CASE WHEN i.status = 'BELUM LUNAS' OR i.status = 'ISOLIR' THEN i.amount ELSE 0 END), 0) as totalUnpaid,
      COUNT(CASE WHEN i.status = 'LUNAS' THEN 1 END) as lunasCount,
      COUNT(CASE WHEN i.status = 'BELUM LUNAS' OR i.status = 'ISOLIR' THEN 1 END) as belumCount,
      COUNT(CASE WHEN i.status = 'FREE' THEN 1 END) as freeCount
    FROM invoices i
    WHERE i.billing_period = ?
  `).get(latestPeriod);

  const totalExpenses = db.prepare('SELECT COALESCE(SUM(amount), 0) as t FROM expenses').get().t;
  const netBalance    = (kpi?.totalPaid || 0) - totalExpenses;

  // Payment breakdown for latest period
  const payBreakdown = db.prepare(`
    SELECT p.payment_method as method, SUM(p.amount_paid) as total
    FROM payments p
    JOIN invoices i ON p.invoice_id = i.id
    WHERE i.billing_period = ?
    GROUP BY p.payment_method ORDER BY total DESC
  `).all(latestPeriod);

  // Area breakdown for latest period
  const areaBreakdown = db.prepare(`
    SELECT a.name as areaName, a.code as areaCode,
           COUNT(DISTINCT i.customer_id) as totalCust,
           SUM(CASE WHEN i.status='LUNAS' THEN i.amount ELSE 0 END) as paid,
           SUM(CASE WHEN i.status!='LUNAS' AND i.status!='FREE' THEN i.amount ELSE 0 END) as unpaid
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    JOIN areas a ON c.area_id = a.id
    WHERE i.billing_period = ?
    GROUP BY a.id ORDER BY a.name
  `).all(latestPeriod);

  db.close();

  // ============================================================
  // Build Workbook
  // ============================================================
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'Laporan WiFi Billing System';
  wb.created  = new Date();
  wb.modified = new Date();

  // ============================================================
  // SHEET 1: Dashboard
  // ============================================================
  const wsDash = wb.addWorksheet('Dashboard', { properties: { tabColor: { argb: COLORS.primary } } });

  // Title
  wsDash.mergeCells('A1:L1');
  const dashTitle = wsDash.getCell('A1');
  dashTitle.value = 'DASHBOARD PEMBAYARAN TAGIHAN WIFI';
  dashTitle.font  = { bold: true, size: 18, color: { argb: COLORS.white } };
  dashTitle.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
  dashTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  wsDash.getRow(1).height = 48;

  wsDash.mergeCells('A2:L2');
  const dashSub = wsDash.getCell('A2');
  dashSub.value = `Periode: ${monthLabel(latestPeriod)}  |  Dicetak: ${today()}`;
  dashSub.font  = { italic: true, size: 10, color: { argb: '64748B' } };
  dashSub.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
  dashSub.alignment = { horizontal: 'center' };
  wsDash.getRow(2).height = 22;

  // KPI section header
  wsDash.mergeCells('A4:L4');
  const kpiHdr = wsDash.getCell('A4');
  kpiHdr.value = '📊 RINGKASAN KPI';
  kpiHdr.font  = { bold: true, size: 12, color: { argb: COLORS.white } };
  kpiHdr.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryDark } };
  kpiHdr.alignment = { horizontal: 'center', vertical: 'middle' };
  wsDash.getRow(4).height = 28;

  // KPI cards (row 5-9)
  const kpiData = [
    ['Total Pelanggan',      kpi?.totalCust    || 0, 'orang',    COLORS.primary,  COLORS.lightBlue],
    ['Total Pemasukan',      kpi?.totalPaid    || 0, 'IDR',      COLORS.success,  COLORS.lightGreen],
    ['Total Tunggakan',      kpi?.totalUnpaid  || 0, 'IDR',      COLORS.danger,   COLORS.lightAmber],
    ['Total Pengeluaran',    totalExpenses,           'IDR',      COLORS.warning,  COLORS.lightAmber],
    ['Saldo Bersih',         netBalance,              'IDR',      netBalance >= 0 ? COLORS.success : COLORS.danger, COLORS.lightGreen],
    ['Sudah Lunas',          kpi?.lunasCount   || 0, 'pelanggan', COLORS.success, COLORS.lightGreen],
    ['Belum Lunas',          kpi?.belumCount   || 0, 'pelanggan', COLORS.danger,  COLORS.lightAmber],
    ['FREE / Gratis',        kpi?.freeCount    || 0, 'pelanggan', COLORS.free,    COLORS.lightBlue],
  ];

  let kpiRow = 5;
  for (const [label, value, unit, textColor, bgColor] of kpiData) {
    wsDash.mergeCells(`A${kpiRow}:D${kpiRow}`);
    wsDash.mergeCells(`E${kpiRow}:H${kpiRow}`);
    wsDash.mergeCells(`I${kpiRow}:L${kpiRow}`);

    const lblCell = wsDash.getCell(`A${kpiRow}`);
    lblCell.value = label;
    lblCell.font  = { bold: true, size: 10, color: { argb: '334155' } };
    lblCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
    lblCell.alignment = { horizontal: 'right', vertical: 'middle' };
    wsDash.getRow(kpiRow).height = 22;

    const valCell = wsDash.getCell(`E${kpiRow}`);
    if (unit === 'IDR') {
      valCell.value  = value;
      valCell.numFmt = IDR_FMT;
    } else {
      valCell.value = value;
    }
    valCell.font  = { bold: true, size: 14, color: { argb: textColor } };
    valCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    valCell.alignment = { horizontal: 'center', vertical: 'middle' };

    const unitCell = wsDash.getCell(`I${kpiRow}`);
    unitCell.value = unit === 'IDR' ? 'Rupiah' : unit;
    unitCell.font  = { size: 9, color: { argb: '64748B' } };
    unitCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
    unitCell.alignment = { horizontal: 'left', vertical: 'middle' };

    kpiRow++;
  }

  // Area Breakdown Table
  const areaStart = kpiRow + 2;
  wsDash.mergeCells(`A${areaStart}:L${areaStart}`);
  const areaHdr = wsDash.getCell(`A${areaStart}`);
  areaHdr.value = '🗺️ BREAKDOWN PER WILAYAH';
  areaHdr.font  = { bold: true, size: 12, color: { argb: COLORS.white } };
  areaHdr.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.secondary } };
  areaHdr.alignment = { horizontal: 'center', vertical: 'middle' };
  wsDash.getRow(areaStart).height = 28;

  const areaColHdr = wsDash.getRow(areaStart + 1);
  areaColHdr.height = 24;
  const areaCols = ['Wilayah', 'Kode', 'Total Pelanggan', 'Total Lunas (Rp)', 'Total Tunggakan (Rp)', 'Efisiensi Penagihan (%)'];
  areaCols.forEach((h, i) => {
    const cell = areaColHdr.getCell(i + 1);
    cell.value = h;
    applyHeaderStyle(cell, COLORS.secondary);
  });

  let areaDataRow = areaStart + 2;
  let grandPaid = 0, grandUnpaid = 0;
  for (const ab of areaBreakdown) {
    const total = ab.paid + ab.unpaid;
    const efficiency = total > 0 ? Math.round((ab.paid / total) * 10000) / 100 : 100;
    grandPaid   += ab.paid;
    grandUnpaid += ab.unpaid;
    const r = wsDash.getRow(areaDataRow);
    r.getCell(1).value = ab.areaName;
    r.getCell(2).value = ab.areaCode;
    r.getCell(3).value = ab.totalCust;
    r.getCell(4).value = ab.paid;   r.getCell(4).numFmt = IDR_FMT;
    r.getCell(5).value = ab.unpaid; r.getCell(5).numFmt = IDR_FMT;
    r.getCell(6).value = `${efficiency.toFixed(1)}%`;
    r.getCell(6).font  = { color: { argb: efficiency >= 80 ? COLORS.success : COLORS.danger }, bold: true };
    r.eachCell({ includeEmpty: true }, (cell, cn) => { if (cn <= 6) applyDataBorder(cell); });
    r.height = 20;
    areaDataRow++;
  }
  // Area total row
  const areaTotRow = wsDash.getRow(areaDataRow);
  areaTotRow.getCell(1).value = 'TOTAL';
  areaTotRow.getCell(1).font  = { bold: true };
  areaTotRow.getCell(4).value = grandPaid;   areaTotRow.getCell(4).numFmt = IDR_FMT;
  areaTotRow.getCell(5).value = grandUnpaid; areaTotRow.getCell(5).numFmt = IDR_FMT;
  applyTotalRow(areaTotRow, 6);

  // Payment breakdown table
  const payStart = areaDataRow + 3;
  wsDash.mergeCells(`A${payStart}:F${payStart}`);
  const payHdr = wsDash.getCell(`A${payStart}`);
  payHdr.value = '💳 BREAKDOWN METODE PEMBAYARAN';
  payHdr.font  = { bold: true, size: 12, color: { argb: COLORS.white } };
  payHdr.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.purple } };
  payHdr.alignment = { horizontal: 'center', vertical: 'middle' };
  wsDash.getRow(payStart).height = 28;

  const payColHdr = wsDash.getRow(payStart + 1);
  payColHdr.height = 24;
  ['Metode', 'Total (Rp)', '%'].forEach((h, i) => {
    const cell = payColHdr.getCell(i + 1);
    cell.value = h;
    applyHeaderStyle(cell, COLORS.purple);
  });

  const grandTotalPay = payBreakdown.reduce((s, r) => s + r.total, 0);
  let payRow = payStart + 2;
  for (const pb of payBreakdown) {
    const pct = grandTotalPay > 0 ? ((pb.total / grandTotalPay) * 100).toFixed(1) : '0.0';
    const r = wsDash.getRow(payRow);
    r.getCell(1).value = pb.method;
    r.getCell(2).value = pb.total; r.getCell(2).numFmt = IDR_FMT;
    r.getCell(3).value = `${pct}%`;
    r.eachCell({ includeEmpty: true }, (cell, cn) => { if (cn <= 3) applyDataBorder(cell); });
    r.height = 20;
    payRow++;
  }

  wsDash.columns = [
    { width: 18 }, { width: 10 }, { width: 14 }, { width: 18 },
    { width: 18 }, { width: 20 }, { width: 14 }, { width: 14 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
  ];

  // ============================================================
  // SHEET 2: NamaPelanggan
  // ============================================================
  const wsNP = wb.addWorksheet('NamaPelanggan', { properties: { tabColor: { argb: COLORS.secondary } } });
  addTitleRow(wsNP, 'MASTER DATA PELANGGAN WIFI', 8, COLORS.secondary);

  wsNP.mergeCells('A2:H2');
  wsNP.getCell('A2').value = `Total: ${customers.length} pelanggan  |  Diperbarui: ${today()}`;
  wsNP.getCell('A2').font  = { italic: true, size: 9, color: { argb: '64748B' } };
  wsNP.getCell('A2').alignment = { horizontal: 'center' };
  wsNP.getRow(2).height = 20;

  const npHeaders = ['NO', 'ID PELANGGAN', 'NAMA PELANGGAN', 'WILAYAH', 'KODE PAKET', 'PAKET', 'HARGA PAKET'];
  const npHdrRow = wsNP.getRow(3);
  npHdrRow.height = 28;
  npHeaders.forEach((h, i) => { const cell = npHdrRow.getCell(i + 1); cell.value = h; applyHeaderStyle(cell); });

  customers.forEach((c, idx) => {
    const r = wsNP.addRow([
      idx + 1,
      c.customer_code,
      c.name,
      c.area_name,
      c.package_name || '10mbps',
      c.package_price || 100000,
    ]);
    r.height = 18;
    r.getCell(6).numFmt = IDR_FMT;
    r.eachCell({ includeEmpty: true }, (cell, cn) => { if (cn <= 6) applyDataBorder(cell); });
    // Alternate row color
    if (idx % 2 === 0) {
      r.eachCell({ includeEmpty: true }, (cell, cn) => {
        if (cn <= 6) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
      });
    }
  });

  // Total row
  const npTotal = wsNP.addRow(['', `TOTAL: ${customers.length}`, '', '', '', '']);
  applyTotalRow(npTotal, 6);

  wsNP.columns = [{ width: 5 }, { width: 14 }, { width: 28 }, { width: 18 }, { width: 14 }, { width: 14 }];

  // ============================================================
  // SHEET 3: Tagihan Pelanggan (latest period by default, all periods)
  // ============================================================
  const wsTP = wb.addWorksheet('Tagihan Pelanggan', { properties: { tabColor: { argb: COLORS.success } } });

  addTitleRow(wsTP, `REKAP TAGIHAN PELANGGAN WIFI BILLING — SEMUA PERIODE`, 16, COLORS.slate);

  wsTP.mergeCells('A2:P2');
  wsTP.getCell('A2').value = `Total: ${invoices.length} tagihan  |  Diperbarui: ${today()}`;
  wsTP.getCell('A2').font  = { italic: true, size: 9, color: { argb: '64748B' } };
  wsTP.getCell('A2').alignment = { horizontal: 'center' };
  wsTP.getRow(2).height = 20;

  const tpHeaders = [
    'NO', 'PERIODE', 'ID PELANGGAN', 'NAMA PELANGGAN', 'WILAYAH',
    'PAKET', 'HARGA', 'STATUS',
    'CASH', 'BCA', 'BRI', 'MANDIRI', 'BNI',
    'TUNGGAKAN (Rp)', 'TUNGGAKAN (BLN)', 'KETERANGAN'
  ];
  const tpHdrRow = wsTP.getRow(3);
  tpHdrRow.height = 28;
  tpHeaders.forEach((h, i) => { const cell = tpHdrRow.getCell(i + 1); cell.value = h; applyHeaderStyle(cell); });

  let tpTotalHarga = 0, tpCash = 0, tpBca = 0, tpBri = 0, tpMandiri = 0, tpBni = 0, tpTunggakan = 0;

  invoices.forEach((inv, idx) => {
    const r = wsTP.addRow([
      idx + 1,
      inv.billing_period,
      inv.customer_code,
      inv.customer_name,
      inv.area_name,
      inv.package_name || '10mbps',
      inv.package_price || 100000,
      inv.status,
      inv.cash_paid || 0,
      inv.bca_paid  || 0,
      inv.bri_paid  || 0,
      inv.mandiri_paid || 0,
      inv.bni_paid  || 0,
      inv.unpaid_amount || 0,
      inv.unpaid_months || 0,
      inv.notes || '',
    ]);
    r.height = 18;

    tpTotalHarga  += (inv.package_price || 0);
    tpCash        += (inv.cash_paid || 0);
    tpBca         += (inv.bca_paid  || 0);
    tpBri         += (inv.bri_paid  || 0);
    tpMandiri     += (inv.mandiri_paid || 0);
    tpBni         += (inv.bni_paid  || 0);
    tpTunggakan   += (inv.unpaid_amount || 0);

    // Status coloring
    const statusCell = r.getCell(8);
    if (inv.status === 'LUNAS') {
      statusCell.font = { bold: true, color: { argb: COLORS.success } };
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightGreen } };
    } else if (inv.status === 'FREE') {
      statusCell.font = { bold: true, color: { argb: COLORS.free } };
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlue } };
    } else {
      statusCell.font = { bold: true, color: { argb: COLORS.danger } };
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightAmber } };
    }

    [7, 9, 10, 11, 12, 13, 14].forEach(cn => { r.getCell(cn).numFmt = IDR_FMT; });
    r.eachCell({ includeEmpty: true }, (cell, cn) => { if (cn <= 16) applyDataBorder(cell); });
  });

  const tpTotal = wsTP.addRow([
    '', '', '', '', '', 'TOTAL', tpTotalHarga, '',
    tpCash, tpBca, tpBri, tpMandiri, tpBni, tpTunggakan, '', '',
  ]);
  applyTotalRow(tpTotal, 16);
  [7, 9, 10, 11, 12, 13, 14].forEach(cn => { tpTotal.getCell(cn).numFmt = IDR_FMT; });

  wsTP.columns = [
    { width: 5 }, { width: 12 }, { width: 14 }, { width: 28 }, { width: 18 },
    { width: 12 }, { width: 14 }, { width: 14 },
    { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 },
    { width: 16 }, { width: 16 }, { width: 28 },
  ];

  // ============================================================
  // SHEET 4: Pengeluaran
  // ============================================================
  const wsExp = wb.addWorksheet('Pengeluaran', { properties: { tabColor: { argb: COLORS.warning } } });
  addTitleRow(wsExp, 'PENGELUARAN OPERASIONAL & FEE', 6, COLORS.warning);

  wsExp.mergeCells('A2:F2');
  wsExp.getCell('A2').value = `Total: ${expenses.length} transaksi  |  Diperbarui: ${today()}`;
  wsExp.getCell('A2').font  = { italic: true, size: 9, color: { argb: '64748B' } };
  wsExp.getCell('A2').alignment = { horizontal: 'center' };
  wsExp.getRow(2).height = 20;

  const expHeaders = ['NO', 'TANGGAL', 'URAIAN', 'KATEGORI', 'JUMLAH (Rp)', 'TOTAL KUMULATIF (Rp)'];
  const expHdrRow = wsExp.getRow(3);
  expHdrRow.height = 28;
  expHeaders.forEach((h, i) => { const cell = expHdrRow.getCell(i + 1); cell.value = h; applyHeaderStyle(cell, COLORS.warning); });

  let expRunning = 0;
  expenses.forEach((exp, idx) => {
    expRunning += exp.amount;
    const r = wsExp.addRow([idx + 1, exp.expense_date, exp.description, exp.category, exp.amount, expRunning]);
    r.height = 18;
    r.getCell(5).numFmt = IDR_FMT;
    r.getCell(6).numFmt = IDR_FMT;
    if (exp.category === 'FEE') {
      r.getCell(4).font = { bold: true, color: { argb: COLORS.purple } };
    }
    r.eachCell({ includeEmpty: true }, (cell, cn) => { if (cn <= 6) applyDataBorder(cell); });
    if (idx % 2 === 0) {
      r.eachCell({ includeEmpty: true }, (cell, cn) => {
        if (cn <= 6) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7ED' } };
      });
    }
  });

  const expTotRow = wsExp.addRow(['', '', 'TOTAL', '', expRunning, '']);
  expTotRow.getCell(5).numFmt = IDR_FMT;
  applyTotalRow(expTotRow, 6);

  wsExp.columns = [{ width: 5 }, { width: 20 }, { width: 36 }, { width: 16 }, { width: 18 }, { width: 22 }];

  // ============================================================
  // SHEET 5: Setup (Package Configuration)
  // ============================================================
  const wsSetup = wb.addWorksheet('Setup', { properties: { tabColor: { argb: COLORS.purple } } });
  addTitleRow(wsSetup, 'KONFIGURASI PAKET INTERNET', 4, COLORS.purple);

  const setupHeaders = ['KODE PAKET', 'PAKET', 'HARGA (Rp)', 'KETERANGAN'];
  const setupHdrRow = wsSetup.getRow(2);
  setupHdrRow.height = 28;
  setupHeaders.forEach((h, i) => { const cell = setupHdrRow.getCell(i + 1); cell.value = h; applyHeaderStyle(cell, COLORS.purple); });

  packages.forEach((pkg) => {
    const r = wsSetup.addRow([pkg.code, pkg.speed_name, pkg.price, 'Paket standar']);
    r.height = 22;
    r.getCell(3).numFmt = IDR_FMT;
    r.eachCell({ includeEmpty: true }, (cell, cn) => { if (cn <= 4) applyDataBorder(cell); });
  });

  wsSetup.columns = [{ width: 14 }, { width: 18 }, { width: 18 }, { width: 30 }];

  // ============================================================
  // SHEET 6: Read Me
  // ============================================================
  const wsRM = wb.addWorksheet('Read Me', { properties: { tabColor: { argb: COLORS.slate } } });
  addTitleRow(wsRM, 'PANDUAN DASHBOARD WIFI BILLING', 7, COLORS.slate);

  const readmeLines = [
    [''],
    ['📌 DESKRIPSI SISTEM'],
    ['Dashboard ini dibuat secara otomatis oleh sistem Laporan WiFi Billing.'],
    ['Data bersumber dari file: data laporan fixxx.xls'],
    [''],
    ['📋 KETERANGAN SHEET'],
    ['• Dashboard       — Ringkasan KPI, area breakdown, dan metode pembayaran'],
    ['• NamaPelanggan   — Master data seluruh pelanggan per wilayah'],
    ['• Tagihan Pelanggan — Rincian tagihan bulanan + metode pembayaran'],
    ['• Pengeluaran     — Catatan pengeluaran operasional & fee'],
    ['• Setup           — Konfigurasi paket internet'],
    ['• Read Me         — Panduan sistem ini'],
    [''],
    ['📊 STATUS TAGIHAN'],
    ['• LUNAS        — Pelanggan sudah membayar tagihan bulan tersebut'],
    ['• BELUM LUNAS  — Pelanggan belum membayar tagihan'],
    ['• FREE         — Pelanggan mendapatkan layanan gratis/diskon'],
    ['• ISOLIR       — Pelanggan sedang dalam status isolir'],
    [''],
    ['💳 METODE PEMBAYARAN'],
    ['• CASH / Tunai  — Pembayaran langsung'],
    ['• BCA, BRI, MANDIRI, BNI — Transfer bank'],
    [''],
    [`📅 Diperbarui: ${today()}`],
  ];

  let rmRow = 2;
  for (const [text] of readmeLines) {
    wsRM.mergeCells(`A${rmRow}:G${rmRow}`);
    const cell = wsRM.getCell(`A${rmRow}`);
    cell.value = text || '';
    if (text && text.startsWith('📌') || text && text.startsWith('📋') || text && text.startsWith('📊') || text && text.startsWith('💳') || text && text.startsWith('📅')) {
      cell.font = { bold: true, size: 11, color: { argb: COLORS.primary } };
    } else {
      cell.font = { size: 10, color: { argb: '334155' } };
    }
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    wsRM.getRow(rmRow).height = 20;
    rmRow++;
  }

  wsRM.columns = Array(7).fill({ width: 22 });

  // ============================================================
  // Write file
  // ============================================================
  const dir = dirname(outputPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  await wb.xlsx.writeFile(outputPath);
  console.log(`✅ Dashboard Excel berhasil ditulis ke: ${outputPath}`);

  return {
    sheets: ['Dashboard', 'NamaPelanggan', 'Tagihan Pelanggan', 'Pengeluaran', 'Setup', 'Read Me'],
    customers: customers.length,
    invoices: invoices.length,
    expenses: expenses.length,
    packages: packages.length,
    outputPath,
  };
}

// CLI runner
const isMain = process.argv[1] && process.argv[1].endsWith('generate_dashboard_excel.js');
if (isMain) {
  const __filename2 = fileURLToPath(import.meta.url);
  const __dirname2  = dirname(__filename2);
  const ROOT2       = join(__dirname2, '..', '..', '..');
  const outPath     = join(ROOT2, 'data', 'raw', 'dashboard.xlsx');
  generateDashboardExcel(outPath)
    .then(info => {
      console.log('📊 Dashboard generated:', JSON.stringify(info, null, 2));
      try {
        copyFileSync(outPath, join(ROOT2, 'dashboard.xlsx'));
        console.log(`✅ Also copied to root: ${join(ROOT2, 'dashboard.xlsx')}`);
      } catch (e) {
        console.warn('⚠️  Could not copy to root:', e.message);
      }
    })
    .catch(err => { console.error('❌', err.message); process.exit(1); });
}

// ============================================================
// Application Use Case: Excel Template Generator
// Generates standard ready-to-fill templates for users
// ============================================================
import ExcelJS from 'exceljs';
import { OFFICIAL_AREAS } from '../../domain/excel/types.js';

/**
 * Generates a Multi-Sheet Area Matrix Template Workbook
 * @returns {Promise<ExcelJS.Workbook>}
 */
export async function generateMultiSheetTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Laporan WiFi Billing System';
  wb.created = new Date();

  const months = ['2026-06', '2026-07', '2026-08', '2026-09'];

  for (const [code, info] of Object.entries(OFFICIAL_AREAS)) {
    const ws = wb.addWorksheet(info.name, {
      properties: { tabColor: { argb: '4F46E5' } },
    });

    // Title
    ws.mergeCells('A1:J1');
    const titleCell = ws.getCell('A1');
    titleCell.value = `DATA TAGIHAN WILAYAH ${info.name.toUpperCase()} (${code})`;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 32;

    // Header row
    const headers = ['NO', 'KODE PELANGGAN', 'NAMA PELANGGAN', 'WILAYAH', 'PAKET', 'TARIF (RP)', ...months];
    const hRow = ws.addRow(headers);
    hRow.height = 26;
    hRow.eachCell((cell) => {
      cell.font = { bold: true, size: 10, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F46E5' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Sample data rows
    const sampleRows = [
      [1, `${code}-001`, 'CONTOH PELANGGAN 1', info.name, '10mbps', 100000, 'LUNAS (BRI)', 'LUNAS (CASH)', 'LUNAS', ''],
      [2, `${code}-002`, 'CONTOH PELANGGAN 2', info.name, '10mbps', 100000, 'LUNAS', 'FREE', 'BELUM', ''],
      [3, `${code}-003`, 'CONTOH PELANGGAN 3', info.name, '20mbps', 200000, 'LUNAS', 'LUNAS (BCA)', '', ''],
    ];

    sampleRows.forEach((r) => {
      const row = ws.addRow(r);
      row.height = 20;
      row.getCell(6).numFmt = '#,##0';
    });

    ws.columns = [
      { width: 6 },
      { width: 18 },
      { width: 26 },
      { width: 16 },
      { width: 12 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
    ];
  }

  return wb;
}

/**
 * Generates a Single-Sheet Billing Rekap Template Workbook
 * @returns {Promise<ExcelJS.Workbook>}
 */
export async function generateSingleSheetTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Laporan WiFi Billing System';
  wb.created = new Date();

  const ws = wb.addWorksheet('Tagihan Pelanggan', {
    properties: { tabColor: { argb: '059669' } },
  });

  // Title
  ws.mergeCells('A1:N1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'TEMPLATE REKAP TAGIHAN PELANGGAN WIFI BILLING';
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 32;

  const headers = [
    'NO', 'PERIODE', 'ID PELANGGAN', 'NAMA PELANGGAN', 'WILAYAH',
    'PAKET', 'HARGA', 'STATUS', 'CASH', 'BCA', 'BRI', 'MANDIRI', 'BNI', 'KETERANGAN'
  ];

  const hRow = ws.addRow(headers);
  hRow.height = 26;
  hRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '059669' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const sampleRows = [
    [1, '2026-07', 'BLI-001', 'BAIHAKI', 'Blimbingsari', '10mbps', 100000, 'LUNAS', 0, 0, 100000, 0, 0, 'Lunas BRI'],
    [2, '2026-07', 'IDN-001', 'ANDI SUSANTO', 'Idinan', '10mbps', 100000, 'LUNAS', 100000, 0, 0, 0, 0, 'Lunas Cash'],
    [3, '2026-07', 'JMB-001', 'BUDI SANTOSO', 'Jambu', '10mbps', 100000, 'BELUM LUNAS', 0, 0, 0, 0, 0, 'Belum Bayar'],
    [4, '2026-07', 'TLS-001', 'CITRA LESTARI', 'Tanah Los', '20mbps', 200000, 'FREE', 0, 0, 0, 0, 0, 'Free Promo'],
  ];

  sampleRows.forEach((r) => {
    const row = ws.addRow(r);
    row.height = 20;
    row.getCell(7).numFmt = '#,##0';
    row.getCell(9).numFmt = '#,##0';
    row.getCell(10).numFmt = '#,##0';
    row.getCell(11).numFmt = '#,##0';
    row.getCell(12).numFmt = '#,##0';
    row.getCell(13).numFmt = '#,##0';
  });

  ws.columns = [
    { width: 6 },
    { width: 14 },
    { width: 16 },
    { width: 24 },
    { width: 18 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 24 },
  ];

  return wb;
}

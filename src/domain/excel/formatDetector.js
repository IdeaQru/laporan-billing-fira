// ============================================================
// Format Detector: Intelligent Excel Schema Detection
// Pure synchronous domain logic (Skill 3 & 4 compliant)
// ============================================================
import { matchOfficialArea, OFFICIAL_AREAS } from './types.js';

/**
 * Detects the format of an Excel workbook.
 * @param {object} params
 * @param {string[]} params.sheetNames
 * @param {Record<string, any[][]>} [params.sampleRowsBySheet] - First 10 rows per sheet
 * @returns {{
 *   format: 'MULTI_SHEET_AREA_MATRIX' | 'SINGLE_SHEET_BILLING_REKAP' | 'CONSOLIDATED_DASHBOARD' | 'CUSTOMER_MASTER' | 'UNKNOWN',
 *   confidence: number,
 *   detectedAreas: Array<{ sheetName: string, code: string, name: string }>,
 *   detectedMonths: string[],
 *   details: string
 * }}
 */
export function detectExcelFormat({ sheetNames = [], sampleRowsBySheet = {} }) {
  if (!Array.isArray(sheetNames) || sheetNames.length === 0) {
    return {
      format: 'UNKNOWN',
      confidence: 0,
      detectedAreas: [],
      detectedMonths: [],
      details: 'Workbook kosong atau tidak memiliki sheet.',
    };
  }

  // 1. Check for Consolidated 6-Sheet Dashboard
  const dashKeywords = ['dashboard', 'namapelanggan', 'tagihan pelanggan', 'pengeluaran', 'setup'];
  const matchedDashSheets = sheetNames.filter(s =>
    dashKeywords.some(kw => s.toLowerCase().includes(kw))
  );
  if (matchedDashSheets.length >= 3) {
    return {
      format: 'CONSOLIDATED_DASHBOARD',
      confidence: 0.95,
      detectedAreas: Object.values(OFFICIAL_AREAS).map(a => ({ sheetName: a.name, code: a.code, name: a.name })),
      detectedMonths: [],
      details: `Terdeteksi ${matchedDashSheets.length} sheet standar Consolidated Dashboard.`,
    };
  }

  // 2. Check for Multi-Sheet Area Matrix
  const detectedAreas = [];
  for (const sheet of sheetNames) {
    const matched = matchOfficialArea(sheet);
    if (matched) {
      detectedAreas.push({ sheetName: sheet, code: matched.code, name: matched.name });
    }
  }

  if (detectedAreas.length >= 2) {
    return {
      format: 'MULTI_SHEET_AREA_MATRIX',
      confidence: detectedAreas.length >= 6 ? 0.98 : 0.85,
      detectedAreas,
      detectedMonths: [],
      details: `Terdeteksi ${detectedAreas.length} sheet wilayah/area (${detectedAreas.map(a => a.name).join(', ')}).`,
    };
  }

  // 3. Inspect Single Sheet or First Sheet Rows
  const primarySheet = sheetNames[0];
  const rows = sampleRowsBySheet[primarySheet] || [];

  if (rows.length > 0) {
    // Find header row in first 10 rows (must have at least 3 non-empty cells)
    let headerRow = null;
    let headerRowIdx = -1;

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i] || [];
      const nonEmptyCells = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
      if (nonEmptyCells.length < 3) continue;

      const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ');
      if (
        (rowStr.includes('nama') || rowStr.includes('pelanggan') || rowStr.includes('kode') || rowStr.includes('id')) &&
        (rowStr.includes('paket') || rowStr.includes('tagihan') || rowStr.includes('harga') || rowStr.includes('tunggakan') || rowStr.includes('cash') || rowStr.includes('bri') || rowStr.includes('bca'))
      ) {
        headerRow = row;
        headerRowIdx = i;
        break;
      }
    }

    if (headerRow) {
      const headerStr = headerRow.map(c => String(c || '').toLowerCase()).join(' ');
      
      const hasPaymentCols = headerStr.includes('cash') || headerStr.includes('bri') || headerStr.includes('bca') || headerStr.includes('status') || headerStr.includes('tunggakan');
      const hasAreaCol = headerStr.includes('area') || headerStr.includes('wilayah') || headerStr.includes('kelompok');
      
      if (hasPaymentCols) {
        return {
          format: 'SINGLE_SHEET_BILLING_REKAP',
          confidence: 0.9,
          detectedAreas: [],
          detectedMonths: [],
          details: `Sheet "${primarySheet}" memiliki struktur kolom Rekap Tagihan & Pembayaran (Header baris ke-${headerRowIdx + 1}).`,
        };
      }

      if (hasAreaCol && (headerStr.includes('kode') || headerStr.includes('id'))) {
        return {
          format: 'CUSTOMER_MASTER',
          confidence: 0.85,
          detectedAreas: [],
          detectedMonths: [],
          details: `Sheet "${primarySheet}" memiliki struktur kolom Master Data Pelanggan.`,
        };
      }
    }
  }

  // Fallback: If 1 sheet matched an official area
  if (detectedAreas.length === 1) {
    return {
      format: 'MULTI_SHEET_AREA_MATRIX',
      confidence: 0.7,
      detectedAreas,
      detectedMonths: [],
      details: `Terdeteksi 1 sheet area "${detectedAreas[0].name}".`,
    };
  }

  return {
    format: 'UNKNOWN',
    confidence: 0.3,
    detectedAreas: [],
    detectedMonths: [],
    details: 'Struktur Excel belum dikenali secara otomatis. Engine akan mencoba deteksi cerdas.',
  };
}

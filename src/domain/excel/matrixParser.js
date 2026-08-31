// ============================================================
// Multi-Sheet Area Matrix Parser
// Pure synchronous domain logic (Skill 3 & 4 compliant)
// Supports Column-A markers + Resilient Dynamic Header Scanning
// ============================================================
import { Ok, Err, matchOfficialArea, parseBillingPeriod, classifyPaymentMethod, OFFICIAL_AREAS } from './types.js';

/**
 * Helper to safely extract integer number
 */
function safeNum(val, fallback = 0) {
  if (val === null || val === undefined || val === '') return fallback;
  const n = Number(val);
  return isNaN(n) ? fallback : Math.round(n);
}

/**
 * Helper to clean string
 */
function safeStr(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Parses boundaries of a sheet:
 * 1. Checks for column A markers ("variable", "first", "last")
 * 2. If not found, scans dynamically for header row, start row, and end row.
 * @param {any[][]} rows
 * @returns {{
 *   varRowIdx: number,
 *   firstRowIdx: number,
 *   lastRowIdx: number,
 *   nameColIdx: number,
 *   priceColIdx: number,
 *   colMonthMap: Record<number, string>
 * }}
 */
export function scanSheetBoundaries(rows = []) {
  let varRowIdx = -1;
  let firstRowIdx = -1;
  let lastRowIdx = -1;

  // 1. Check for explicit Column-A markers
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    const colA = String(row[0] || '').trim().toLowerCase();
    if (colA === 'variable') varRowIdx = i;
    if (colA === 'first') firstRowIdx = i;
    if (colA === 'last') lastRowIdx = i;
  }

  // If column-A markers exist
  if (varRowIdx !== -1 && firstRowIdx !== -1 && lastRowIdx !== -1) {
    const hRow = rows[varRowIdx] || [];
    const colMonthMap = {};
    for (let c = 0; c < hRow.length; c++) {
      const p = parseBillingPeriod(hRow[c]);
      if (p) colMonthMap[c] = p;
    }
    return {
      varRowIdx,
      firstRowIdx,
      lastRowIdx,
      nameColIdx: 2, // Standard column C
      priceColIdx: 5, // Standard column F
      colMonthMap,
    };
  }

  // 2. Dynamic Scanning (Fallback when Column-A markers are absent)
  // Find header row containing month serials or "PEMBAYARAN" / "NAMA"
  let detectedHeaderIdx = -1;
  let bestMonthMap = {};

  for (let r = 0; r < Math.min(rows.length, 12); r++) {
    const row = rows[r] || [];
    const tempMonthMap = {};
    for (let c = 0; c < row.length; c++) {
      const p = parseBillingPeriod(row[c]);
      if (p) tempMonthMap[c] = p;
    }

    if (Object.keys(tempMonthMap).length >= 2) {
      detectedHeaderIdx = r;
      bestMonthMap = tempMonthMap;
      break;
    }
  }

  if (detectedHeaderIdx === -1) {
    // Look for row with keywords
    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r] || [];
      const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ');
      if (rowStr.includes('nama') && (rowStr.includes('pembayaran') || rowStr.includes('no'))) {
        detectedHeaderIdx = r;
        break;
      }
    }
  }

  if (detectedHeaderIdx === -1) {
    return { varRowIdx: -1, firstRowIdx: -1, lastRowIdx: -1, nameColIdx: 2, priceColIdx: 5, colMonthMap: {} };
  }

  varRowIdx = detectedHeaderIdx;
  const headerRow = rows[varRowIdx] || [];

  // Identify column indices for name and price
  let nameColIdx = 2;
  let priceColIdx = 5;

  headerRow.forEach((cell, idx) => {
    const s = String(cell || '').toLowerCase();
    if (s.includes('nama')) nameColIdx = idx;
    if (s.includes('pembayaran') || s.includes('harga') || s.includes('tarif')) priceColIdx = idx;
  });

  // Extract month columns from header row
  const colMonthMap = Object.keys(bestMonthMap).length > 0 ? bestMonthMap : {};
  if (Object.keys(colMonthMap).length === 0) {
    for (let c = 0; c < headerRow.length; c++) {
      const p = parseBillingPeriod(headerRow[c]);
      if (p) colMonthMap[c] = p;
    }
  }

  // Find first customer row
  firstRowIdx = varRowIdx + 1;
  while (firstRowIdx < rows.length) {
    const row = rows[firstRowIdx] || [];
    const nameVal = safeStr(row[nameColIdx]);
    if (nameVal && !nameVal.toUpperCase().includes('TOTAL') && !nameVal.toUpperCase().includes('JUMLAH')) {
      break;
    }
    firstRowIdx++;
  }

  // Find last customer row
  lastRowIdx = firstRowIdx;
  for (let r = firstRowIdx; r < rows.length; r++) {
    const row = rows[r] || [];
    const nameVal = safeStr(row[nameColIdx]);
    if (!nameVal) {
      // Check if subsequent rows also empty
      const next1 = safeStr((rows[r + 1] || [])[nameColIdx]);
      const next2 = safeStr((rows[r + 2] || [])[nameColIdx]);
      if (!next1 && !next2) break;
      continue;
    }
    if (nameVal.toUpperCase().includes('TOTAL') || nameVal.toUpperCase().includes('JUMLAH') || nameVal.toUpperCase().includes('REKAP')) {
      break;
    }
    lastRowIdx = r;
  }

  return {
    varRowIdx,
    firstRowIdx,
    lastRowIdx,
    nameColIdx,
    priceColIdx,
    colMonthMap,
  };
}

/**
 * Parses Multi-Sheet Area Matrix Workbook
 * @param {Record<string, any[][]>} sheetsData - Map of sheetName -> 2D array of rows
 * @param {object} [options]
 * @param {Map<string, number>} [options.masterPackageMap] - custCode/custName -> packageCode
 * @returns {import('../types/index.js').Result<object, string>}
 */
export function parseMultiSheetAreaMatrix(sheetsData, options = {}) {
  const masterPkgMap = options.masterPackageMap || new Map();

  const customers = [];
  const invoices = [];
  const monthlyHistory = [];
  const allPeriodsSet = new Set();
  const areaBreakdowns = {};

  let totalFree = 0;
  let totalUnpaid = 0;
  let totalLunas = 0;

  for (const [sheetName, rows] of Object.entries(sheetsData)) {
    const areaMatch = matchOfficialArea(sheetName);
    if (!areaMatch) {
      // Skip non-area sheets (e.g. Summary, Notes, etc.)
      continue;
    }

    const boundaries = scanSheetBoundaries(rows);
    const { varRowIdx, firstRowIdx, lastRowIdx, nameColIdx, priceColIdx, colMonthMap } = boundaries;

    if (varRowIdx === -1 || firstRowIdx === -1 || lastRowIdx === -1 || firstRowIdx > lastRowIdx) {
      continue;
    }

    const monthEntries = Object.entries(colMonthMap);
    if (monthEntries.length === 0) {
      continue;
    }

    monthEntries.forEach(([, p]) => allPeriodsSet.add(p));

    let areaCustIdx = 1;
    let sheetLunas = 0;
    let sheetFree = 0;
    let sheetUnpaid = 0;

    for (let r = firstRowIdx; r <= lastRowIdx; r++) {
      const row = rows[r] || [];
      const rawName = safeStr(row[nameColIdx]);

      if (!rawName || rawName.toUpperCase().includes('TOTAL') || rawName.toUpperCase().includes('JUMLAH')) {
        continue;
      }

      // Determine customer code (e.g. BLI-001)
      const existingCodeCol = safeStr(row[1]);
      let custCode = '';
      if (/^[A-Z]{3}-\d{3,4}$/i.test(existingCodeCol)) {
        custCode = existingCodeCol.toUpperCase();
      } else {
        custCode = `${areaMatch.code}-${String(areaCustIdx).padStart(3, '0')}`;
      }
      areaCustIdx++;

      // Monthly tariff / base price
      let basePrice = safeNum(row[priceColIdx]);
      if (basePrice < 30000 || basePrice > 2000000) {
        basePrice = 100000;
      }

      // Package Code mapping
      let pkgCode = masterPkgMap.get(custCode.toUpperCase()) || masterPkgMap.get(rawName.toUpperCase()) || 10;

      customers.push({
        customerCode: custCode,
        name: rawName,
        areaCode: areaMatch.code,
        areaName: areaMatch.name,
        packageCode: pkgCode,
        packagePrice: basePrice,
        sourceSheet: sheetName,
      });

      // Process each month column independently
      for (const [colIdxStr, period] of monthEntries) {
        const cIdx = Number(colIdxStr);
        const rawCell = row[cIdx];
        const valStr = safeStr(rawCell).toLowerCase();

        let status = 'BELUM LUNAS';
        let invoiceAmount = basePrice;
        let unpaidAmount = basePrice;
        let unpaidMonths = 1;
        let notes = 'Belum Lunas';
        let isLunas = false;
        let paymentMethod = 'BRI';

        if (valStr === 'free' || valStr === 'gratis' || valStr.includes('diskon')) {
          status = 'FREE';
          unpaidAmount = 0;
          unpaidMonths = 0;
          notes = safeStr(rawCell) || 'FREE';
          totalFree++;
          sheetFree++;
        } else if (
          !rawCell ||
          rawCell === '' ||
          valStr === '' ||
          valStr === '-' ||
          valStr === '0' ||
          valStr === 'belum' ||
          valStr === 'isolir'
        ) {
          status = valStr === 'isolir' ? 'ISOLIR' : 'BELUM LUNAS';
          unpaidAmount = basePrice;
          unpaidMonths = 1;
          notes = valStr === 'isolir' ? 'ISOLIR' : 'Belum Lunas';
          totalUnpaid++;
          sheetUnpaid++;
        } else {
          // LUNAS
          isLunas = true;
          status = 'LUNAS';
          unpaidAmount = 0;
          unpaidMonths = 0;
          notes = safeStr(rawCell);
          paymentMethod = classifyPaymentMethod(notes);
          totalLunas++;
          sheetLunas++;
        }

        invoices.push({
          customerCode: custCode,
          customerName: rawName,
          areaCode: areaMatch.code,
          areaName: areaMatch.name,
          billingPeriod: period,
          amount: invoiceAmount,
          status,
          unpaidAmount,
          unpaidMonths,
          notes,
          isLunas,
          paymentMethod,
        });

        monthlyHistory.push({
          customerCode: custCode,
          billingPeriod: period,
          statusText: notes,
          sourceSheet: sheetName,
        });
      }
    }

    areaBreakdowns[areaMatch.name] = {
      areaCode: areaMatch.code,
      areaName: areaMatch.name,
      customerCount: areaCustIdx - 1,
      lunas: sheetLunas,
      free: sheetFree,
      unpaid: sheetUnpaid,
    };
  }

  if (customers.length === 0) {
    return Err('Tidak ditemukan data pelanggan valid di dalam sheet area Excel.');
  }

  const sortedPeriods = Array.from(allPeriodsSet).sort();

  return Ok({
    format: 'MULTI_SHEET_AREA_MATRIX',
    customers,
    invoices,
    monthlyHistory,
    periods: sortedPeriods,
    summary: {
      totalCustomers: customers.length,
      totalInvoices: invoices.length,
      totalPayments: totalLunas,
      totalFree,
      totalUnpaid,
      periodsCount: sortedPeriods.length,
      areaBreakdowns,
    },
  });
}

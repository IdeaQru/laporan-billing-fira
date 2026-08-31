// ============================================================
// Single-Sheet Billing Rekap Parser
// Pure synchronous domain logic (Skill 3 & 4 compliant)
// Handles exported tables, consolidated reports, and monthly billing rekaps
// ============================================================
import { Ok, Err, matchOfficialArea, parseBillingPeriod, classifyPaymentMethod, OFFICIAL_AREAS } from './types.js';

function safeNum(val, fallback = 0) {
  if (val === null || val === undefined || val === '') return fallback;
  const n = Number(val);
  return isNaN(n) ? fallback : Math.round(n);
}

function safeStr(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Parses Single-Sheet Billing Rekap rows
 * @param {any[][]} rows
 * @param {object} [options]
 * @param {string} [options.defaultPeriod] - Fallback period if not specified per row
 * @returns {import('../types/index.js').Result<object, string>}
 */
export function parseSingleSheetBillingRekap(rows = [], options = {}) {
  if (!rows || rows.length < 2) {
    return Err('Sheet tidak memiliki cukup baris data.');
  }

  // 1. Detect period from Title or options
  let filePeriod = options.defaultPeriod || '2026-07';
  for (let r = 0; r < Math.min(rows.length, 3); r++) {
    const titleStr = (rows[r] || []).join(' ');
    const detectedP = parseBillingPeriod(titleStr);
    if (detectedP) {
      filePeriod = detectedP;
      break;
    }
  }

  // 2. Find header row
  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r] || [];
    const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ');
    if (rowStr.includes('nama') && (rowStr.includes('paket') || rowStr.includes('harga') || rowStr.includes('tagihan') || rowStr.includes('tunggakan') || rowStr.includes('bri') || rowStr.includes('cash'))) {
      headerRowIdx = r;
      break;
    }
  }

  if (headerRowIdx === -1) {
    return Err('Baris header kolom rekap tagihan tidak ditemukan.');
  }

  const headerRow = rows[headerRowIdx] || [];
  const colMap = {
    period: -1,
    area: -1,
    code: -1,
    name: -1,
    package: -1,
    price: -1,
    status: -1,
    cash: -1,
    bca: -1,
    bri: -1,
    mandiri: -1,
    bni: -1,
    notes: -1,
    unpaidAmount: -1,
    unpaidMonths: -1,
  };

  headerRow.forEach((cell, idx) => {
    const h = safeStr(cell).toLowerCase();
    if (h.includes('periode') || h.includes('bulan')) colMap.period = idx;
    else if (h.includes('area') || h.includes('wilayah') || h.includes('kelompok')) colMap.area = idx;
    else if (h.includes('kode') || h.includes('id pelanggan')) colMap.code = idx;
    else if (h.includes('nama') && !h.includes('kelompok') && !h.includes('area')) colMap.name = idx;
    else if (h.includes('paket') && !h.includes('harga')) colMap.package = idx;
    else if (h.includes('harga') || h.includes('tarif') || h.includes('tagihan')) colMap.price = idx;
    else if (h.includes('status')) colMap.status = idx;
    else if (h === 'cash' || h.includes('tunai')) colMap.cash = idx;
    else if (h === 'bca') colMap.bca = idx;
    else if (h === 'bri') colMap.bri = idx;
    else if (h === 'mandiri') colMap.mandiri = idx;
    else if (h === 'bni') colMap.bni = idx;
    else if (h.includes('tunggakan') && (h.includes('rp') || h.includes('nominal') || !h.includes('bln') && !h.includes('bulan'))) colMap.unpaidAmount = idx;
    else if (h.includes('tunggakan') && (h.includes('bln') || h.includes('bulan'))) colMap.unpaidMonths = idx;
    else if (h.includes('keterangan') || h.includes('ket') || h.includes('notes')) colMap.notes = idx;
  });

  if (colMap.name === -1) {
    return Err('Kolom "NAMA PELANGGAN" tidak ditemukan dalam baris header.');
  }

  const customers = [];
  const invoices = [];
  const monthlyHistory = [];
  const periodsSet = new Set();

  let totalLunas = 0;
  let totalUnpaid = 0;
  let totalFree = 0;

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const custName = safeStr(row[colMap.name]);

    if (!custName || custName.toUpperCase().includes('TOTAL') || custName.toUpperCase().includes('JUMLAH')) {
      continue;
    }

    // Determine area
    let rawArea = colMap.area !== -1 ? safeStr(row[colMap.area]) : '';
    let areaInfo = matchOfficialArea(rawArea);

    // Determine customer code
    let custCode = colMap.code !== -1 ? safeStr(row[colMap.code]) : '';
    if (!custCode || custCode === '-') {
      // Derive area code if code is missing
      const prefix = areaInfo ? areaInfo.code : 'CUST';
      custCode = `${prefix}-${String(customers.length + 1).padStart(3, '0')}`;
    }

    if (!areaInfo && custCode.includes('-')) {
      const prefix = custCode.split('-')[0];
      areaInfo = matchOfficialArea(prefix);
    }

    const finalAreaCode = areaInfo ? areaInfo.code : 'IDN';
    const finalAreaName = areaInfo ? areaInfo.name : 'Idinan';

    // Pricing & package
    let basePrice = colMap.price !== -1 ? safeNum(row[colMap.price]) : 100000;
    if (basePrice < 30000 || basePrice > 2000000) basePrice = 100000;

    const pkgName = colMap.package !== -1 ? safeStr(row[colMap.package]) : '10mbps';

    customers.push({
      customerCode: custCode,
      name: custName,
      areaCode: finalAreaCode,
      areaName: finalAreaName,
      packageName: pkgName,
      packagePrice: basePrice,
      packageCode: 10,
    });

    // Billing period for this row
    let rowPeriod = filePeriod;
    if (colMap.period !== -1) {
      const parsedP = parseBillingPeriod(row[colMap.period]);
      if (parsedP) rowPeriod = parsedP;
    }
    periodsSet.add(rowPeriod);

    // Multi-channel payment values
    const cashVal = colMap.cash !== -1 ? safeNum(row[colMap.cash]) : 0;
    const bcaVal = colMap.bca !== -1 ? safeNum(row[colMap.bca]) : 0;
    const briVal = colMap.bri !== -1 ? safeNum(row[colMap.bri]) : 0;
    const mandiriVal = colMap.mandiri !== -1 ? safeNum(row[colMap.mandiri]) : 0;
    const bniVal = colMap.bni !== -1 ? safeNum(row[colMap.bni]) : 0;
    const totalPaidVal = cashVal + bcaVal + briVal + mandiriVal + bniVal;

    // Status & Notes
    const rawStatus = colMap.status !== -1 ? safeStr(row[colMap.status]) : '';
    const rawNotes = colMap.notes !== -1 ? safeStr(row[colMap.notes]) : '';
    const combinedStatusText = `${rawStatus} ${rawNotes}`.trim();

    let status = 'BELUM LUNAS';
    let unpaidAmount = colMap.unpaidAmount !== -1 ? safeNum(row[colMap.unpaidAmount], basePrice) : basePrice;
    let unpaidMonths = colMap.unpaidMonths !== -1 ? safeNum(row[colMap.unpaidMonths], 1) : 1;
    let isLunas = false;
    let paymentMethod = 'BRI';

    if (combinedStatusText.toLowerCase().includes('free') || combinedStatusText.toLowerCase().includes('gratis')) {
      status = 'FREE';
      unpaidAmount = 0;
      unpaidMonths = 0;
      totalFree++;
    } else if (totalPaidVal > 0 || combinedStatusText.toLowerCase().includes('lunas')) {
      status = 'LUNAS';
      unpaidAmount = 0;
      unpaidMonths = 0;
      isLunas = true;
      totalLunas++;

      // Detect highest paid method
      if (cashVal >= bcaVal && cashVal >= briVal && cashVal >= mandiriVal && cashVal >= bniVal && cashVal > 0) {
        paymentMethod = 'CASH';
      } else if (bcaVal >= briVal && bcaVal >= mandiriVal && bcaVal >= bniVal && bcaVal > 0) {
        paymentMethod = 'BCA';
      } else if (mandiriVal >= briVal && mandiriVal >= bniVal && mandiriVal > 0) {
        paymentMethod = 'MANDIRI';
      } else if (bniVal >= briVal && bniVal > 0) {
        paymentMethod = 'BNI';
      } else {
        paymentMethod = classifyPaymentMethod(combinedStatusText);
      }
    } else {
      status = combinedStatusText.toLowerCase().includes('isolir') ? 'ISOLIR' : 'BELUM LUNAS';
      totalUnpaid++;
    }

    invoices.push({
      customerCode: custCode,
      customerName: custName,
      areaCode: finalAreaCode,
      areaName: finalAreaName,
      billingPeriod: rowPeriod,
      amount: basePrice,
      status,
      unpaidAmount,
      unpaidMonths,
      notes: rawNotes || rawStatus || status,
      isLunas,
      paymentMethod,
      paymentDetails: {
        cash: cashVal,
        bca: bcaVal,
        bri: briVal,
        mandiri: mandiriVal,
        bni: bniVal,
      },
    });

    monthlyHistory.push({
      customerCode: custCode,
      billingPeriod: rowPeriod,
      statusText: rawNotes || rawStatus || status,
      sourceSheet: 'Tagihan Pelanggan',
    });
  }

  if (customers.length === 0) {
    return Err('Tidak ada data baris tagihan yang berhasil diproses.');
  }

  const sortedPeriods = Array.from(periodsSet).sort();

  return Ok({
    format: 'SINGLE_SHEET_BILLING_REKAP',
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
    },
  });
}

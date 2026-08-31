// ============================================================
// Excel Data Validator & Dry-Run Analyzer
// Pure synchronous domain logic (Skill 3 & 4 compliant)
// ============================================================
import { Ok, Err } from './types.js';

/**
 * Validates parsed Excel data and generates pre-flight dry-run metrics
 * @param {object} parsedData
 * @param {Array<any>} parsedData.customers
 * @param {Array<any>} parsedData.invoices
 * @param {string[]} parsedData.periods
 * @param {string} parsedData.format
 * @returns {import('../types/index.js').Result<object, string>}
 */
export function validateAndAnalyzeParsedData(parsedData) {
  if (!parsedData || !Array.isArray(parsedData.customers) || parsedData.customers.length === 0) {
    return Err('Data pelanggan kosong atau tidak valid.');
  }

  const warnings = [];
  const errors = [];

  const seenCodes = new Set();
  let duplicateCount = 0;

  for (const c of parsedData.customers) {
    if (!c.customerCode) {
      errors.push(`Pelanggan "${c.name}" tidak memiliki Kode Pelanggan.`);
    } else if (seenCodes.has(c.customerCode)) {
      duplicateCount++;
    } else {
      seenCodes.add(c.customerCode);
    }

    if (!c.name || c.name.length < 2) {
      warnings.push(`Nama pelanggan "${c.customerCode}" terlalu pendek atau tidak valid.`);
    }

    if (c.packagePrice <= 0) {
      warnings.push(`Harga tarif pelanggan "${c.customerCode}" adalah 0.`);
    }
  }

  if (duplicateCount > 0) {
    warnings.push(`Ditemukan ${duplicateCount} kode pelanggan duplikat dalam berkas (akan digabungkan/disinkronkan).`);
  }

  // Pre-flight metrics
  let totalRevenuePaid = 0;
  let totalOutstanding = 0;
  let totalInvoices = parsedData.invoices.length;
  let lunasCount = 0;
  let unpaidCount = 0;
  let freeCount = 0;

  const areaMap = {};
  const periodMap = {};

  for (const inv of parsedData.invoices) {
    if (inv.status === 'LUNAS') {
      totalRevenuePaid += inv.amount;
      lunasCount++;
    } else if (inv.status === 'FREE') {
      freeCount++;
    } else {
      totalOutstanding += (inv.unpaidAmount || inv.amount);
      unpaidCount++;
    }

    // Area breakdown
    if (!areaMap[inv.areaName]) {
      areaMap[inv.areaName] = { areaName: inv.areaName, areaCode: inv.areaCode, count: 0, paid: 0, unpaid: 0 };
    }
    areaMap[inv.areaName].count++;
    if (inv.status === 'LUNAS') areaMap[inv.areaName].paid += inv.amount;
    else if (inv.status !== 'FREE') areaMap[inv.areaName].unpaid += (inv.unpaidAmount || inv.amount);

    // Period breakdown
    if (!periodMap[inv.billingPeriod]) {
      periodMap[inv.billingPeriod] = { period: inv.billingPeriod, invoices: 0, lunas: 0, unpaid: 0, paidAmount: 0 };
    }
    periodMap[inv.billingPeriod].invoices++;
    if (inv.status === 'LUNAS') {
      periodMap[inv.billingPeriod].lunas++;
      periodMap[inv.billingPeriod].paidAmount += inv.amount;
    } else if (inv.status !== 'FREE') {
      periodMap[inv.billingPeriod].unpaid++;
    }
  }

  const collectionRate = (totalRevenuePaid + totalOutstanding) > 0
    ? Math.round((totalRevenuePaid / (totalRevenuePaid + totalOutstanding)) * 10000) / 100
    : 100;

  return Ok({
    isValid: errors.length === 0,
    errors,
    warnings,
    metrics: {
      totalCustomers: parsedData.customers.length,
      uniqueCustomers: seenCodes.size,
      totalInvoices,
      totalRevenuePaid,
      totalOutstanding,
      collectionRate,
      lunasCount,
      unpaidCount,
      freeCount,
      periods: parsedData.periods,
      areaBreakdown: Object.values(areaMap),
      periodBreakdown: Object.values(periodMap).sort((a, b) => a.period.localeCompare(b.period)),
    },
    samplePreviewRows: parsedData.invoices.slice(0, 30),
  });
}

// ============================================================
// Domain Types & Contracts: Excel Processing Engine
// Functional Core, Imperative Shell Standards (Rule-Set Compliant)
// ============================================================
import { Ok, Err, andThen, map, pipe } from '../types/index.js';

export { Ok, Err, andThen, map, pipe };

/**
 * Supported Excel Formats
 * @type {readonly ['MULTI_SHEET_AREA_MATRIX', 'SINGLE_SHEET_BILLING_REKAP', 'CONSOLIDATED_DASHBOARD', 'CUSTOMER_MASTER', 'UNKNOWN']}
 */
export const EXCEL_FORMATS = Object.freeze([
  'MULTI_SHEET_AREA_MATRIX',
  'SINGLE_SHEET_BILLING_REKAP',
  'CONSOLIDATED_DASHBOARD',
  'CUSTOMER_MASTER',
  'UNKNOWN',
]);

/**
 * Supported Database Update Strategies
 * @type {readonly ['FULL_REBUILD', 'INCREMENTAL_UPSERT', 'PERIOD_UPDATE', 'MASTER_ONLY']}
 */
export const UPDATE_STRATEGIES = Object.freeze([
  'FULL_REBUILD',
  'INCREMENTAL_UPSERT',
  'PERIOD_UPDATE',
  'MASTER_ONLY',
]);

/**
 * Standard Official 8 Areas Mapping
 */
export const OFFICIAL_AREAS = Object.freeze({
  BLI: { code: 'BLI', name: 'Blimbingsari', aliases: ['blimbing', 'blimbing_bsari', 'bsari', 'blimbingsari'] },
  IDN: { code: 'IDN', name: 'Idinan', aliases: ['idinan', 'idn'] },
  TLS: { code: 'TLS', name: 'Tanah Los', aliases: ['tanahlos', 'tanahlos_tlos', 'tlos', 'tanah los'] },
  JMB: { code: 'JMB', name: 'Jambu', aliases: ['jambu', 'jmb'] },
  PGG: { code: 'PGG', name: 'Panggang', aliases: ['panggang', 'pgg'] },
  PLK: { code: 'PLK', name: 'Palpakis', aliases: ['palpakis', 'plk'] },
  SWT: { code: 'SWT', name: 'Sumberwatu', aliases: ['sumberwatu', 'sumberwatu_swatu', 'swatu', 'sumber watu'] },
  TMS: { code: 'TMS', name: 'Tamansari', aliases: ['tamansari', 'tms', 'taman sari'] },
  KBD: { code: 'KBD', name: 'Kebundadap', aliases: ['kebundadap', 'kbd', 'kebun dadap', 'kebun_dadap', 'bondadap'] },
});

/**
 * Matches area name or alias to official area code & name.
 * Total function: returns null if not recognized.
 * @param {string} raw
 * @returns {{ code: string, name: string } | null}
 */
export function matchOfficialArea(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const clean = raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const [code, info] of Object.entries(OFFICIAL_AREAS)) {
    if (code.toLowerCase() === clean) return { code: info.code, name: info.name };
    if (info.name.toLowerCase().replace(/[^a-z0-9]/g, '') === clean) {
      return { code: info.code, name: info.name };
    }
    for (const alias of info.aliases) {
      const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean === cleanAlias || clean.includes(cleanAlias) || cleanAlias.includes(clean)) {
        return { code: info.code, name: info.name };
      }
    }
  }
  return null;
}

/**
 * Safely converts an Excel date serial or string to "YYYY-MM"
 * @param {any} val
 * @returns {string | null}
 */
export function parseBillingPeriod(val) {
  if (val === null || val === undefined) return null;
  
  // If string formatted as YYYY-MM
  const str = String(val).trim();
  if (/^\d{4}-\d{2}$/.test(str)) {
    return str;
  }

  // If Indonesian/English month name e.g. "Juli 2026", "Jul-26", "07/2026"
  const monthMap = {
    jan: '01', januari: '01', january: '01',
    feb: '02', februari: '02', february: '02',
    mar: '03', maret: '03', march: '03',
    apr: '04', april: '04',
    mei: '05', may: '05',
    jun: '06', juni: '06', june: '06',
    jul: '07', juli: '07', july: '07',
    agu: '08', agustus: '08', aug: '08', august: '08',
    sep: '09', september: '09',
    okt: '10', oktober: '10', oct: '10', october: '10',
    nov: '11', november: '11',
    des: '12', desember: '12', dec: '12', december: '12',
  };

  const lowerStr = str.toLowerCase();
  for (const [mName, mNum] of Object.entries(monthMap)) {
    if (lowerStr.includes(mName)) {
      const yearMatch = lowerStr.match(/20\d{2}/) || lowerStr.match(/'?(\d{2})/);
      if (yearMatch) {
        const y = yearMatch[0].length === 2 ? `20${yearMatch[0]}` : yearMatch[0].replace("'", '');
        return `${y}-${mNum}`;
      }
    }
  }

  // If slash format e.g. 07/2026 or 2026/07
  const slashMatch = str.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[2]}-${String(slashMatch[1]).padStart(2, '0')}`;
  }

  // If Excel date serial number (e.g. 45809)
  const n = Number(val);
  if (!isNaN(n) && n >= 40000 && n <= 60000) {
    const date = new Date((n - 25569) * 86400 * 1000);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  return null;
}

/**
 * Normalizes payment methods
 * @param {any} raw
 * @returns {'CASH' | 'BCA' | 'BRI' | 'MANDIRI' | 'BNI'}
 */
export function classifyPaymentMethod(raw) {
  const t = String(raw || '').toLowerCase();
  if (t.includes('cash') || t.includes('tunai')) return 'CASH';
  if (t.includes('bca')) return 'BCA';
  if (t.includes('bni')) return 'BNI';
  if (t.includes('mandiri')) return 'MANDIRI';
  return 'BRI'; // Default transfer / general
}

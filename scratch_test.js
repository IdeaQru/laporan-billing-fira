import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'wifi_billing.db');
const db = new Database(DB_PATH, { readonly: true });

const MONTH_SHORT_ID = {
  '01': 'Jan',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Apr',
  '05': 'Mei',
  '06': 'Juni',
  '07': 'Juli',
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

const targetMonth = '2026-07';

const query = `
  SELECT
    c.id as customer_id,
    c.customer_code,
    c.name as customer_name,
    a.name as area_name,
    COALESCE(p.speed_name, 'Standar') as package_name,
    COALESCE(p.price, i.amount, 0) as package_price,
    SUM(CASE WHEN LOWER(COALESCE(i.notes, '')) LIKE '%free%' THEN 0 ELSE COALESCE(NULLIF(i.unpaid_amount, 0), i.amount, p.price, 100000) END) as total_unpaid_amount,
    COUNT(CASE WHEN LOWER(COALESCE(i.notes, '')) LIKE '%free%' THEN NULL ELSE i.id END) as unpaid_months_count,
    GROUP_CONCAT(i.billing_period, ',') as unpaid_periods,
    MAX(CASE WHEN LOWER(COALESCE(i.notes, '')) LIKE '%free%' THEN 1 ELSE 0 END) as is_free_flag
  FROM invoices i
  JOIN customers c ON i.customer_id = c.id
  JOIN areas a ON c.area_id = a.id
  LEFT JOIN packages p ON c.package_id = p.id
  WHERE (i.status != 'LUNAS' OR LOWER(COALESCE(i.notes, '')) LIKE '%free%')
    AND i.billing_period <= ?
  GROUP BY c.id
  ORDER BY a.name ASC, c.customer_code ASC
`;

const rows = db.prepare(query).all(targetMonth);
console.log(`Found ${rows.length} accumulated unpaid customers up to ${targetMonth}:`);

let multiMonthCount = 0;
for (const r of rows) {
  const detailStr = formatUnpaidMonthsDetail(r.unpaid_periods);
  if (r.unpaid_months_count > 1 || multiMonthCount < 10) {
    console.log(`- [${r.customer_code}] ${r.customer_name} (${r.area_name}): Rp ${r.total_unpaid_amount.toLocaleString('id-ID')} | Detail: ${detailStr}`);
    if (r.unpaid_months_count > 1) multiMonthCount++;
  }
}
console.log(`Total multi-month delinquent customers: ${multiMonthCount}`);

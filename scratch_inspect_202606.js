import Database from 'better-sqlite3';

const db = new Database('data/wifi_billing.db', { readonly: true });

console.log('=== INSPECTING INVOICES FOR PERIOD 2026-06 ===');
const invs202606 = db.prepare(`
  SELECT i.id, i.billing_period, i.status, i.amount, i.unpaid_amount, i.notes, c.customer_code, c.name as cust_name, a.name as area_name
  FROM invoices i
  JOIN customers c ON i.customer_id = c.id
  JOIN areas a ON c.area_id = a.id
  WHERE i.billing_period = '2026-06'
`).all();

console.log(`Total invoices for 2026-06: ${invs202606.length}`);
const statusCounts = {};
invs202606.forEach(inv => {
  statusCounts[inv.status] = (statusCounts[inv.status] || 0) + 1;
});
console.log('Status breakdown for 2026-06:', statusCounts);

console.log('\nSample non-LUNAS invoices for 2026-06:');
invs202606.filter(inv => inv.status !== 'LUNAS').forEach(inv => {
  console.log(`  ${inv.customer_code} (${inv.cust_name}, ${inv.area_name}): status=${inv.status}, amount=${inv.amount}, unpaid=${inv.unpaid_amount}, notes="${inv.notes}"`);
});

db.close();

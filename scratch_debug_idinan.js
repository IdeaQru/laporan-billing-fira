import Database from 'better-sqlite3';

const db = new Database('data/wifi_billing.db', { readonly: true });
const custs = db.prepare(`
  SELECT c.id, c.customer_code, c.name, a.name as area_name
  FROM customers c JOIN areas a ON c.area_id = a.id
  WHERE a.name = 'Idinan'
`).all();

console.log('Customers in Idinan:', custs.length);
for (const cust of custs) {
  const inv = db.prepare('SELECT status, notes FROM invoices WHERE customer_id = ? AND billing_period = ?').get(cust.id, '2026-04');
  console.log(`  ${cust.customer_code} (${cust.name}): inv=`, inv);
}
db.close();

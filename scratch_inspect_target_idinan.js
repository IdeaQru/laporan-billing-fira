import Database from 'better-sqlite3';

const db = new Database('data/wifi_billing.db', { readonly: true });
const targetCodes = ['IDN-038', 'IDN-039', 'IDN-040', 'IDN-041', 'IDN-042'];

for (const code of targetCodes) {
  const cust = db.prepare('SELECT id, customer_code, name FROM customers WHERE customer_code = ?').get(code);
  if (!cust) {
    console.log(`Customer ${code} not found!`);
    continue;
  }
  console.log(`\n=== ${cust.customer_code} (${cust.name}) ===`);
  const invs = db.prepare('SELECT billing_period, amount, status, notes FROM invoices WHERE customer_id = ? ORDER BY billing_period').all(cust.id);
  invs.forEach(inv => {
    console.log(`  ${inv.billing_period} | status=${inv.status.padEnd(11)} | amount=${inv.amount} | notes=${inv.notes}`);
  });
}

db.close();

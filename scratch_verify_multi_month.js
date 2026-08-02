import Database from 'better-sqlite3';

const db = new Database('data/wifi_billing.db', { readonly: true });
const sampleCusts = ['LINDA', 'WAWAN', 'SAN@ULAN', 'YENI@HARIYANTO'];

for (const name of sampleCusts) {
  const c = db.prepare('SELECT c.id, c.customer_code, c.name FROM customers c WHERE c.name LIKE ?').get(`%${name}%`);
  if (c) {
    const invs = db.prepare('SELECT billing_period, amount, status, notes FROM invoices WHERE customer_id = ? ORDER BY billing_period').all(c.id);
    console.log(`=== Cust ${c.customer_code} (${c.name}) ===`);
    invs.forEach(inv => console.log('  ', inv.billing_period, '| Status:', inv.status.padEnd(11), '| Amount:', inv.amount, '| Notes:', inv.notes));
  }
}
db.close();

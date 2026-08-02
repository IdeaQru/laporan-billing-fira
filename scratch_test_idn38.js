import Database from 'better-sqlite3';

const db = new Database('data/wifi_billing.db', { readonly: true });
const cust = db.prepare('SELECT id, customer_code, name FROM customers WHERE customer_code = ?').get('IDN-038');
console.log('Cust:', cust);
const inv = db.prepare('SELECT * FROM invoices WHERE customer_id = ? AND billing_period = ?').get(cust.id, '2026-04');
console.log('Inv 2026-04:', inv);
db.close();

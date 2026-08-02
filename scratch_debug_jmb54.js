import Database from 'better-sqlite3';

const db = new Database('data/wifi_billing.db', { readonly: true });
const cust = db.prepare('SELECT id, customer_code, name FROM customers WHERE customer_code = ?').get('JMB-054');
console.log('Cust JMB-054:', cust);

const invs = db.prepare('SELECT billing_period, amount, unpaid_amount, status, notes FROM invoices WHERE customer_id = ? ORDER BY billing_period').all(cust.id);
console.log('Invoices for JMB-054:');
invs.forEach(inv => console.log('  ', inv.billing_period, '| status:', inv.status, '| unpaid:', inv.unpaid_amount, '| notes:', inv.notes));

db.close();

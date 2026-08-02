import Database from 'better-sqlite3';

const db = new Database('data/wifi_billing.db', { readonly: true });
const p  = db.prepare('SELECT COUNT(*) as c FROM packages').get().c;
const a  = db.prepare('SELECT COUNT(*) as c FROM areas').get().c;
const c  = db.prepare('SELECT COUNT(*) as c FROM customers').get().c;
const i  = db.prepare('SELECT COUNT(*) as c FROM invoices').get().c;
const py = db.prepare('SELECT COUNT(*) as c FROM payments').get().c;
const e  = db.prepare('SELECT COUNT(*) as c FROM expenses').get().c;
const h  = db.prepare('SELECT COUNT(*) as c FROM monthly_status_history').get().c;

const periods = db.prepare('SELECT DISTINCT billing_period FROM invoices ORDER BY billing_period').all().map(r => r.billing_period);
const areas   = db.prepare('SELECT code, name, (SELECT COUNT(*) FROM customers WHERE area_id = areas.id) as cust FROM areas ORDER BY name').all();
const statusDist = db.prepare('SELECT status, COUNT(*) as cnt FROM invoices GROUP BY status ORDER BY cnt DESC').all();

console.log('=== DATABASE VERIFICATION ===');
console.log(`Packages: ${p} | Areas: ${a} | Customers: ${c}`);
console.log(`Invoices: ${i} | Payments: ${py} | Expenses: ${e} | History: ${h}`);
console.log(`Periods (${periods.length}): ${periods.join(', ')}`);
console.log('Areas breakdown:');
areas.forEach(ar => console.log(`  ${ar.code} - ${ar.name}: ${ar.cust} customers`));
console.log('Status distribution:');
statusDist.forEach(s => console.log(`  ${s.status}: ${s.cnt}`));
db.close();

import Database from 'better-sqlite3';
import { resolveDbPath } from '../database/connection.js';

const dbPath = resolveDbPath();
const db = new Database(dbPath, { readonly: true });

const p = db.prepare('SELECT COUNT(*) as c FROM packages').get().c;
const a = db.prepare('SELECT COUNT(*) as c FROM areas').get().c;
const c = db.prepare('SELECT COUNT(*) as c FROM customers').get().c;
const i = db.prepare('SELECT COUNT(*) as c FROM invoices').get().c;
const py = db.prepare('SELECT COUNT(*) as c FROM payments').get().c;
const e = db.prepare('SELECT COUNT(*) as c FROM expenses').get().c;
const h = db.prepare('SELECT COUNT(*) as c FROM monthly_status_history').get().c;

const periods = db.prepare('SELECT DISTINCT billing_period FROM invoices ORDER BY billing_period').all().map(r => r.billing_period);
const areas = db.prepare('SELECT code, name, (SELECT COUNT(*) FROM customers WHERE area_id = areas.id) as cust FROM areas ORDER BY name').all();
const statusDist = db.prepare('SELECT status, COUNT(*) as cnt FROM invoices GROUP BY status ORDER BY cnt DESC').all();
const payDist = db.prepare('SELECT payment_method, COUNT(*) as cnt, SUM(amount_paid) as total FROM payments GROUP BY payment_method ORDER BY cnt DESC').all();

console.log('============================================');
console.log('       DATABASE VERIFICATION REPORT         ');
console.log('============================================');
console.log(`Database File : ${dbPath}`);
console.log(`Packages      : ${p}`);
console.log(`Areas         : ${a}`);
console.log(`Customers     : ${c}`);
console.log(`Invoices      : ${i}`);
console.log(`Payments      : ${py}`);
console.log(`Expenses      : ${e}`);
console.log(`History       : ${h}`);
console.log(`Periods (${periods.length}): ${periods.join(', ')}`);
console.log('--------------------------------------------');
console.log('Areas breakdown:');
areas.forEach(ar => console.log(`  ${ar.code} - ${ar.name.padEnd(15)}: ${ar.cust} customers`));
console.log('--------------------------------------------');
console.log('Invoice Status distribution:');
statusDist.forEach(s => console.log(`  ${s.status.padEnd(12)}: ${s.cnt}`));
console.log('--------------------------------------------');
console.log('Payment Method distribution:');
payDist.forEach(p => console.log(`  ${p.payment_method.padEnd(8)}: ${p.cnt} payments (Rp ${p.total.toLocaleString('id-ID')})`));
console.log('============================================');

db.close();

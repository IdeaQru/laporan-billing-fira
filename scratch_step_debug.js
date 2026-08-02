import Database from 'better-sqlite3';

const db = new Database('data/wifi_billing.db', { readonly: true });
const month = '2026-04';
const areaList = ['Idinan'];

const placeholders = areaList.map(() => '?').join(',');
const areaFilter = `AND a.name IN (${placeholders})`;

const custQuery = `
  SELECT
    c.id as customer_id,
    c.customer_code,
    c.name as customer_name,
    a.name as area_name,
    COALESCE(p.speed_name, '10mbps') as package_name,
    COALESCE(p.price, 100000) as package_price
  FROM customers c
  JOIN areas a ON c.area_id = a.id
  LEFT JOIN packages p ON c.package_id = p.id
  WHERE 1=1 ${areaFilter}
  ORDER BY a.name ASC, c.customer_code ASC
`;
const customers = db.prepare(custQuery).all(...areaList);
console.log('Customers count:', customers.length);

for (const cust of customers) {
  if (['IDN-038', 'IDN-039', 'IDN-040'].includes(cust.customer_code)) {
    const targetInv = db.prepare(
      'SELECT status, amount, unpaid_amount, notes FROM invoices WHERE customer_id = ? AND billing_period = ?'
    ).get(cust.customer_id, month);
    console.log(`Cust ${cust.customer_code} (${cust.customer_name}): targetInv=`, targetInv);
  }
}
db.close();

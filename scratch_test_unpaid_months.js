import { getUnpaidReportList } from './src/infrastructure/repositories/index.js';

const testMonths = ['2026-04', '2026-05', '2026-06', '2026-07'];

for (const m of testMonths) {
  const res = getUnpaidReportList({ month: m, areas: ['Idinan'] });
  if (res.ok) {
    console.log(`\n=== Month ${m} (Unpaid/Free Count: ${res.value.unpaidCustomers.length}) ===`);
    res.value.unpaidCustomers.forEach(c => {
      if (['IDN-038', 'IDN-039', 'IDN-040', 'IDN-041', 'IDN-042'].includes(c.customer_code)) {
        console.log(`  ${c.customer_code} - ${c.customer_name} | status=${c.status_label} | detail=${c.unpaid_detail}`);
      }
    });
  }
}

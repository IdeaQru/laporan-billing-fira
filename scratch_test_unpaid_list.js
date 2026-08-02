import { getUnpaidReportList, getReportTable } from './src/infrastructure/repositories/index.js';

const res = getUnpaidReportList({ month: '2026-07', areas: ['Idinan'] });

if (res.ok) {
  console.log(`Unpaid Report List for Idinan (2026-07): Total=${res.value.unpaidCustomers.length}`);
  res.value.unpaidCustomers.forEach((c, idx) => {
    if (['IDN-038', 'IDN-039', 'IDN-040', 'IDN-041', 'IDN-042'].includes(c.customer_code)) {
      console.log(`  [${idx+1}] ${c.customer_code} - ${c.customer_name} | status=${c.status_label} | amount=${c.amount} | detail=${c.unpaid_detail}`);
    }
  });
} else {
  console.error(res.error);
}

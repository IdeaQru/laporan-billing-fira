import { getUnpaidReportList } from './src/infrastructure/repositories/index.js';

const res = getUnpaidReportList({ month: '2026-07' });

console.log('Result for 2026-07 in getUnpaidReportList:');
console.log('  ok:', res.ok);
if (res.ok) {
  console.log('  totalUnpaidCount:', res.value.totalUnpaidCount);
  console.log('  totalUnpaidAmount:', res.value.totalUnpaidAmount);
  console.log('  totalFreeCount:', res.value.totalFreeCount);
  console.log('  unpaidCustomers length:', res.value.unpaidCustomers.length);
  res.value.unpaidCustomers.forEach(c => console.log('    ', c.customer_code, c.customer_name, c.area_name, c.status_label, c.amount, c.unpaid_detail));
}

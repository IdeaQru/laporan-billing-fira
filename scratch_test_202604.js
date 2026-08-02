import { getUnpaidReportList } from './src/infrastructure/repositories/index.js';

const res = getUnpaidReportList({ month: '2026-04', areas: ['Idinan'] });
console.log('Result 2026-04:', {
  ok: res.ok,
  totalUnpaidCount: res.value?.totalUnpaidCount,
  totalUnpaidAmount: res.value?.totalUnpaidAmount,
  totalFreeCount: res.value?.totalFreeCount,
  listLength: res.value?.unpaidCustomers.length,
});
res.value?.unpaidCustomers.forEach(c => {
  console.log(`  ${c.customer_code} (${c.customer_name}): status=${c.status_label}, amount=${c.amount}`);
});

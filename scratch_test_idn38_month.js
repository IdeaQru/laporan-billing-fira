import { getUnpaidReportList } from './src/infrastructure/repositories/index.js';

const res = getUnpaidReportList({ month: '2026-04', areas: ['Idinan'] });
console.log('Unpaid/Free Count in 2026-04:', res.value.unpaidCustomers.length);
res.value.unpaidCustomers.forEach(c => console.log('  ', c.customer_code, c.customer_name, c.status_label));

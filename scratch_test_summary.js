import { getDashboardSummary, getHistoricalTrends } from './src/infrastructure/repositories/index.js';

const dash = getDashboardSummary({ month: '2026-07' });
if (dash.ok) {
  console.log('=== DASHBOARD SUMMARY (2026-07) ===');
  console.log('  Total Customers :', dash.value.totalCustomers);
  console.log('  Total Paid      : Rp', dash.value.totalRevenuePaid.toLocaleString('id-ID'));
  console.log('  Total Outstanding: Rp', dash.value.totalOutstanding.toLocaleString('id-ID'));
  console.log('  Lunas Count     :', dash.value.lunasCount);
  console.log('  Belum Lunas Count:', dash.value.belumLunasCount);
  console.log('  Isolir Count    :', dash.value.isolirCount);
  console.log('  Area Breakdown  :');
  dash.value.areaBreakdown.forEach(a => {
    console.log(`    ${a.areaName.padEnd(15)} | Cust: ${a.totalCustomers} | Paid: Rp ${a.totalPaid.toLocaleString('id-ID')} | Unpaid: Rp ${a.totalUnpaid.toLocaleString('id-ID')} | Eff: ${a.collectionRate}%`);
  });
} else {
  console.error('Dash error:', dash.error);
}

const trends = getHistoricalTrends();
if (trends.ok) {
  console.log('\n=== HISTORICAL TRENDS (Sample 5 Periods) ===');
  trends.value.slice(-5).forEach(t => {
    console.log(`  Period ${t.period} (${t.periodLabel}): Paid=Rp ${t.paidAmount.toLocaleString('id-ID')}, Unpaid=Rp ${t.unpaidAmount.toLocaleString('id-ID')}, Eff=${t.collectionRate}%`);
  });
} else {
  console.error('Trends error:', trends.error);
}

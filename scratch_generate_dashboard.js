// Script to generate full 6-sheet dashboard.xlsx
import { generateDashboardExcel } from './src/infrastructure/etl/generate_dashboard_excel.js';
import { join } from 'path';
import { copyFileSync } from 'fs';

const outPath = 'data/raw/dashboard.xlsx';

generateDashboardExcel(outPath)
  .then(info => {
    console.log('✅ Dashboard Excel generated successfully!');
    console.log('   Sheets:', info.sheets.join(', '));
    console.log('   Customers:', info.customers);
    console.log('   Invoices:', info.invoices);
    console.log('   Expenses:', info.expenses);
    
    // Copy to root
    try {
      copyFileSync(outPath, 'dashboard.xlsx');
      console.log('✅ Copied to root: dashboard.xlsx');
    } catch (e) {
      console.warn('⚠️  Could not copy to root:', e.message);
    }
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  });

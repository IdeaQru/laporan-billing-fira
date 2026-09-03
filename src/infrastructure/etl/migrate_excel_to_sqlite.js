// ============================================================
// ETL Migration: Excel → SQLite (Unified Excel Engine)
// Mendukung Multi-Sheet Matrix (8+ area, termasuk Kebundadap KBD),
// Single-Sheet Billing Rekap, & Konsolidasi Dashboard
// ============================================================
import { existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { executeExcelUpdate } from '../../application/excel/executeExcelUpdateUseCase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..', '..');

// -- Dynamic Path Resolvers --
function resolveLaporanPath() {
  const candidates = [
    join(ROOT, 'laporan hadissss.xls'),
    join(ROOT, 'data', 'raw', 'laporan hadissss.xls'),
    join(ROOT, 'data', 'raw', 'uploaded_laporan.xls'),
    join(ROOT, 'data', 'raw', 'uploaded_laporan.xlsx'),
    join(ROOT, 'data', 'raw', 'data laporan fixxx.xls'),
    join(ROOT, 'data', 'raw', 'laporan juli.xls'),
    join(ROOT, 'data', 'raw', 'data laporan fix.xls'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  const rawDir = join(ROOT, 'data', 'raw');
  if (existsSync(rawDir)) {
    const files = readdirSync(rawDir);
    const found = files.find(f =>
      (f.toLowerCase().includes('laporan') || f.toLowerCase().includes('fix'))
      && (f.endsWith('.xls') || f.endsWith('.xlsx'))
      && !f.toLowerCase().includes('dashboard')
    );
    if (found) return join(rawDir, found);
  }
  return candidates[0];
}

/**
 * Main migration entry point
 */
async function migrate() {
  const LAPORAN_PATH = resolveLaporanPath();
  if (!existsSync(LAPORAN_PATH)) {
    throw new Error(`File Excel tidak ditemukan: ${LAPORAN_PATH}`);
  }

  console.log('🚀 Menjalankan ETL Migration via Unified Excel Engine...');
  console.log(`   Sumber data: ${LAPORAN_PATH}`);

  const updateRes = await executeExcelUpdate(LAPORAN_PATH, { strategy: 'FULL_REBUILD' });
  if (!updateRes.ok) {
    throw new Error(`Migrasi gagal: ${updateRes.error}`);
  }

  const { auditMetrics, analysisSummary } = updateRes.value;
  console.log('\n============================================');
  console.log('  📊 MIGRATION COMPLETE (UNIFIED ENGINE)');
  console.log('============================================');
  console.log(`  Format          : ${updateRes.value.format}`);
  console.log(`  Total Pelanggan : ${analysisSummary.totalCustomers}`);
  console.log(`  Total Tagihan   : ${analysisSummary.totalInvoices}`);
  console.log(`  Total Lunas     : ${analysisSummary.lunasCount}`);
  console.log(`  Total Unpaid    : ${analysisSummary.unpaidCount}`);
  console.log(`  Total Free      : ${analysisSummary.freeCount}`);
  console.log(`  Collection Rate : ${analysisSummary.collectionRate}%`);
  console.log(`  Total Pendapatan: Rp ${analysisSummary.totalRevenuePaid.toLocaleString()}`);
  console.log(`  Cadangan DB     : ${auditMetrics.backupPath}`);
  console.log('============================================\n');

  return analysisSummary;
}

export { migrate };

if (process.argv[1] && process.argv[1].endsWith('migrate_excel_to_sqlite.js')) {
  migrate().catch(err => {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  });
}

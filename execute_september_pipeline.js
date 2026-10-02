// ============================================================
// Pipeline Eksekusi Laporan September & Dashboard Generator
// Menjalankan:
//   1. ETL Migration dari 'laporan_september fixx.xls' -> SQLite DB
//   2. Pembuatan 6-Sheet Consolidated Excel Dashboard (dashboard.xlsx)
//   3. Injeksi Template Dashboard Excel (dashboard_september_injected.xlsx)
//   4. Verifikasi Data & Audit KPI September 2026 untuk Database Web
// ============================================================

import { existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import Database from 'better-sqlite3';
import { migrate } from './src/infrastructure/etl/migrate_excel_to_sqlite.js';
import { generateDashboardExcel } from './src/infrastructure/etl/generate_dashboard_excel.js';
import { resolveDbPath } from './src/infrastructure/database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = __dirname;

const TARGET_FILE = process.argv[2] || join(ROOT, 'laporan_september fixx.xls');

function runPythonScript(scriptPath) {
  return new Promise((resolve) => {
    if (!existsSync(scriptPath)) {
      console.warn(`⚠️ Script python tidak ditemukan: ${scriptPath}`);
      return resolve(false);
    }

    // Try finding python executable
    const pythonCommands = ['python', 'd:/python/python.exe', 'py'];
    let attempted = 0;

    function tryNext() {
      if (attempted >= pythonCommands.length) {
        console.warn('⚠️ Python tidak ditemukan di PATH. Lewati injeksi python template.');
        return resolve(false);
      }

      const cmd = pythonCommands[attempted++];
      const proc = spawn(cmd, [scriptPath], { cwd: ROOT, stdio: 'inherit' });

      proc.on('error', () => {
        tryNext();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          tryNext();
        }
      });
    }

    tryNext();
  });
}

async function main() {
  console.log('\n============================================================');
  console.log('   🚀 PIPELINE EKSEKUSI LAPORAN SEPTEMBER 2026');
  console.log('   Sumber File : ' + TARGET_FILE);
  console.log('============================================================\n');

  if (!existsSync(TARGET_FILE)) {
    console.error(`❌ File laporan tidak ditemukan di: ${TARGET_FILE}`);
    process.exit(1);
  }

  // ------------------------------------------------------------
  // LANGKAH 1: Migrasi Data Excel ke Database SQLite Web
  // ------------------------------------------------------------
  console.log('📦 [1/4] Mengimpor data ke SQLite Database Web (wifi_billing.db)...');
  const summary = await migrate(TARGET_FILE);

  // ------------------------------------------------------------
  // LANGKAH 2: Regenerasi Konsolidasi Dashboard Excel (dashboard.xlsx)
  // ------------------------------------------------------------
  console.log('\n📊 [2/4] Membuat berkas dashboard.xlsx (6 sheet)...');
  const dashPath = join(ROOT, 'data', 'raw', 'dashboard.xlsx');
  try {
    await generateDashboardExcel(dashPath);
    copyFileSync(dashPath, join(ROOT, 'dashboard.xlsx'));
    console.log('   ✅ Berkas dashboard.xlsx berhasil dibuat.');
  } catch (err) {
    console.warn('   ⚠️ Gagal membuat dashboard.xlsx:', err.message);
  }

  // ------------------------------------------------------------
  // LANGKAH 3: Injeksi Template Dashboard Excel (dashboard_september_injected.xlsx)
  // ------------------------------------------------------------
  console.log('\n📋 [3/4] Menjalankan injeksi template (dashboard_september_injected.xlsx)...');
  const pyScript = join(ROOT, 'create_dashboard_september.py');
  const pySuccess = await runPythonScript(pyScript);
  if (pySuccess) {
    console.log('   ✅ Template injected: dashboard_september_injected.xlsx');
  }

  // ------------------------------------------------------------
  // LANGKAH 4: Audit & Verifikasi Data September 2026 di Database Web
  // ------------------------------------------------------------
  console.log('\n🔍 [4/4] Memverifikasi data September 2026 di Database Web...');
  const dbPath = resolveDbPath();
  const db = new Database(dbPath, { readonly: true });

  const septKpi = db.prepare(`
    SELECT 
      COUNT(DISTINCT i.customer_id) as totalCust,
      SUM(CASE WHEN i.status = 'LUNAS' THEN 1 ELSE 0 END) as lunas,
      SUM(CASE WHEN i.status = 'BELUM LUNAS' THEN 1 ELSE 0 END) as belumLunas,
      SUM(CASE WHEN i.status = 'FREE' THEN 1 ELSE 0 END) as free,
      SUM(CASE WHEN i.status IN ('SUDAH OFF', 'OFF') THEN 1 ELSE 0 END) as off,
      SUM(CASE WHEN i.status = 'LUNAS' THEN i.amount ELSE 0 END) as totalPendapatan,
      SUM(CASE WHEN i.status NOT IN ('LUNAS', 'FREE', 'SUDAH OFF', 'OFF') THEN i.unpaid_amount ELSE 0 END) as totalTunggakan
    FROM invoices i
    WHERE i.billing_period = '2026-09'
  `).get();

  const payChannels = db.prepare(`
    SELECT p.payment_method, COUNT(*) as count, SUM(p.amount_paid) as total
    FROM payments p
    JOIN invoices i ON p.invoice_id = i.id
    WHERE i.billing_period = '2026-09'
    GROUP BY p.payment_method
    ORDER BY total DESC
  `).all();

  const areaBreakdown = db.prepare(`
    SELECT 
      a.name as areaName,
      COUNT(DISTINCT i.customer_id) as totalCust,
      SUM(CASE WHEN i.status = 'LUNAS' THEN 1 ELSE 0 END) as lunas,
      SUM(CASE WHEN i.status = 'BELUM LUNAS' THEN 1 ELSE 0 END) as belumLunas,
      SUM(CASE WHEN i.status = 'FREE' THEN 1 ELSE 0 END) as free,
      SUM(CASE WHEN i.status IN ('SUDAH OFF', 'OFF') THEN 1 ELSE 0 END) as off,
      SUM(CASE WHEN i.status = 'LUNAS' THEN i.amount ELSE 0 END) as totalUang
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    JOIN areas a ON c.area_id = a.id
    WHERE i.billing_period = '2026-09'
    GROUP BY a.id
    ORDER BY a.name ASC
  `).all();

  const expTotal = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date LIKE '2026-09%'`).get().total;

  db.close();

  const collectionRate = septKpi.totalCust > 0 
    ? ((septKpi.lunas / (septKpi.totalCust - septKpi.free - septKpi.off)) * 100).toFixed(2)
    : 0;

  console.log('\n============================================================');
  console.log('   🎉 REKAPITULASI RESMI SEPTEMBER 2026 (DATABASE WEB)');
  console.log('============================================================');
  console.log(`   Total Pelanggan Aktif : ${septKpi.totalCust}`);
  console.log(`   Pelanggan LUNAS       : ${septKpi.lunas}`);
  console.log(`   Pelanggan BELUM LUNAS : ${septKpi.belumLunas}`);
  console.log(`   Pelanggan FREE        : ${septKpi.free}`);
  console.log(`   Pelanggan SUDAH OFF   : ${septKpi.off}`);
  console.log(`   Collection Rate       : ${collectionRate}%`);
  console.log(`   Total Pemasukan Masuk : Rp ${Number(septKpi.totalPendapatan).toLocaleString('id-ID')}`);
  console.log(`   Total Pengeluaran     : Rp ${Number(expTotal).toLocaleString('id-ID')}`);
  console.log(`   Saldo Bersih (Net)    : Rp ${Number(septKpi.totalPendapatan - expTotal).toLocaleString('id-ID')}`);
  console.log(`   Total Tunggakan       : Rp ${Number(septKpi.totalTunggakan).toLocaleString('id-ID')}`);
  console.log('------------------------------------------------------------');
  console.log('   💳 Breakdown Saluran Pembayaran (September 2026):');
  payChannels.forEach(p => {
    console.log(`      - ${p.payment_method.padEnd(8)}: ${String(p.count).padStart(3)} trx | Rp ${Number(p.total).toLocaleString('id-ID')}`);
  });
  console.log('------------------------------------------------------------');
  console.log('   📍 Breakdown Per Wilayah (10 Area):');
  areaBreakdown.forEach(a => {
    console.log(`      - ${a.areaName.padEnd(14)}: ${a.totalCust} cust (Lunas: ${a.lunas}, Belum: ${a.belumLunas}, Free: ${a.free}, Off: ${a.off}) -> Rp ${Number(a.totalUang).toLocaleString('id-ID')}`);
  });
  console.log('============================================================\n');
  console.log('💡 Semua database SQLite web & dashboard Excel sudah ter-update!');
  console.log('   Untuk melihat di web, jalankan perintah:');
  console.log('   > npm run dev');
  console.log('   Lalu buka browser: http://localhost:5173\n');
}

main().catch(err => {
  console.error('\n❌ Terjadi kesalahan dalam pipeline:', err.message);
  process.exit(1);
});

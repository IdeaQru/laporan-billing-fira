// ============================================================
// Application Use Case: Execute Excel Update (Atomic Mutation Pipeline)
// Railway-Oriented Error Handling (Skill 6 compliant)
// ============================================================
import { Ok, Err } from '../../domain/types/index.js';
import { inspectExcelFile } from './inspectExcelUseCase.js';
import { commitFullRebuild, commitIncrementalUpsert } from '../../infrastructure/excel/excelRepository.js';
import { generateDashboardExcel } from '../../infrastructure/etl/generate_dashboard_excel.js';
import { writeFileSync, copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..', '..');

/**
 * Executes Database Update from Excel Buffer / File
 * @param {Buffer | string} source
 * @param {object} params
 * @param {'FULL_REBUILD' | 'INCREMENTAL_UPSERT' | 'PERIOD_UPDATE'} [params.strategy]
 * @param {string} [params.targetPeriod]
 * @returns {Promise<import('../../domain/types/index.js').Result<object, string>>}
 */
export async function executeExcelUpdate(source, params = {}) {
  try {
    const strategy = params.strategy || 'FULL_REBUILD';

    // 1. Dry-run inspection & validation first
    const inspectRes = inspectExcelFile(source, params);
    if (!inspectRes.ok) {
      return Err(inspectRes.error);
    }

    const { parsedData, analysis, formatInfo } = inspectRes.value;

    // 2. Persist uploaded file to data/raw/
    const rawDir = join(ROOT, 'data', 'raw');
    if (!existsSync(rawDir)) {
      mkdirSync(rawDir, { recursive: true });
    }

    if (Buffer.isBuffer(source)) {
      const uploadedPath = join(rawDir, 'uploaded_laporan.xls');
      writeFileSync(uploadedPath, source);

      // If full rebuild, also update main fixxx.xls if writable
      if (strategy === 'FULL_REBUILD') {
        try {
          writeFileSync(join(rawDir, 'data laporan fixxx.xls'), source);
        } catch (_) {}
      }
    }

    // 3. Execute atomic SQLite transaction
    let auditMetrics = null;
    if (strategy === 'INCREMENTAL_UPSERT') {
      auditMetrics = commitIncrementalUpsert(parsedData);
    } else {
      auditMetrics = commitFullRebuild(parsedData);
    }

    // 4. Auto-regenerate 6-sheet consolidated dashboard.xlsx
    let dashboardGenerated = false;
    try {
      const dashPath = join(rawDir, 'dashboard.xlsx');
      await generateDashboardExcel(dashPath);
      copyFileSync(dashPath, join(ROOT, 'dashboard.xlsx'));
      dashboardGenerated = true;
    } catch (dashErr) {
      console.warn('⚠️ Gagal men-generate dashboard.xlsx (non-fatal):', dashErr.message);
    }

    return Ok({
      success: true,
      strategy,
      format: formatInfo.format,
      auditMetrics,
      analysisSummary: analysis.metrics,
      dashboardGenerated,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return Err(`Eksekusi pembaruan database gagal: ${err.message}`);
  }
}

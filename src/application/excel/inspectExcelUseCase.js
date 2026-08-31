// ============================================================
// Application Use Case: Inspect Excel File (Dry-Run Pipeline)
// Pure declarative data flow (Skill 2 & 6 compliant)
// ============================================================
import { Ok, Err, andThen, map, pipe } from '../../domain/types/index.js';
import { readExcelWorkbook } from '../../infrastructure/excel/excelReader.js';
import { detectExcelFormat } from '../../domain/excel/formatDetector.js';
import { parseMultiSheetAreaMatrix } from '../../domain/excel/matrixParser.js';
import { parseSingleSheetBillingRekap } from '../../domain/excel/rekapParser.js';
import { validateAndAnalyzeParsedData } from '../../domain/excel/validator.js';

/**
 * Inspects an Excel file buffer or path, returning pre-flight preview & validation report
 * @param {Buffer | string} source
 * @param {object} [options]
 * @returns {import('../../domain/types/index.js').Result<object, string>}
 */
export function inspectExcelFile(source, options = {}) {
  try {
    // 1. Read workbook
    const { sheetNames, sheets, sampleRowsBySheet } = readExcelWorkbook(source);
    if (!sheetNames || sheetNames.length === 0) {
      return Err('Berkas Excel tidak memiliki sheet yang dapat dibaca.');
    }

    // 2. Detect format
    const formatInfo = detectExcelFormat({ sheetNames, sampleRowsBySheet });

    // 3. Parse based on detected format
    let parseResult = null;

    if (formatInfo.format === 'MULTI_SHEET_AREA_MATRIX' || formatInfo.detectedAreas.length >= 2) {
      parseResult = parseMultiSheetAreaMatrix(sheets, options);
    } else if (formatInfo.format === 'SINGLE_SHEET_BILLING_REKAP' || sheetNames.length === 1) {
      const primarySheet = sheetNames[0];
      parseResult = parseSingleSheetBillingRekap(sheets[primarySheet], options);
    } else if (formatInfo.format === 'CONSOLIDATED_DASHBOARD') {
      const tpSheet = sheetNames.find(s => s.toLowerCase().includes('tagihan')) || sheetNames[0];
      parseResult = parseSingleSheetBillingRekap(sheets[tpSheet], options);
    } else {
      // Fallback: try multi-sheet matrix first, then single sheet
      parseResult = parseMultiSheetAreaMatrix(sheets, options);
      if (!parseResult.ok) {
        parseResult = parseSingleSheetBillingRekap(sheets[sheetNames[0]], options);
      }
    }

    if (!parseResult.ok) {
      return Err(`Gagal menguraikan struktur berkas Excel: ${parseResult.error}`);
    }

    const parsedData = parseResult.value;

    // 4. Validate and analyze dry-run metrics
    const validationResult = validateAndAnalyzeParsedData(parsedData);
    if (!validationResult.ok) {
      return Err(`Validasi data gagal: ${validationResult.error}`);
    }

    const analysis = validationResult.value;

    return Ok({
      formatInfo,
      sheetNames,
      detectedAreas: formatInfo.detectedAreas,
      periods: parsedData.periods,
      summary: parsedData.summary,
      analysis,
      parsedData,
    });
  } catch (err) {
    return Err(`Terjadi kesalahan saat memeriksa berkas Excel: ${err.message}`);
  }
}

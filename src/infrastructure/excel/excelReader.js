// ============================================================
// Infrastructure: Excel Reader (Port & Adapter)
// Reads Excel Buffer / File into normalized 2D data arrays
// ============================================================
import XLSX from 'xlsx';

/**
 * Reads workbook buffer or file path into raw 2D sheet objects
 * @param {Buffer | string} source - Buffer or file path
 * @returns {{
 *   sheetNames: string[],
 *   sheets: Record<string, any[][]>,
 *   sampleRowsBySheet: Record<string, any[][]>
 * }}
 */
export function readExcelWorkbook(source) {
  const readOpts = {
    type: Buffer.isBuffer(source) ? 'buffer' : 'file',
    cellDates: false,
    raw: true,
  };

  const wb = Buffer.isBuffer(source)
    ? XLSX.read(source, readOpts)
    : XLSX.readFile(source, readOpts);

  const sheets = {};
  const sampleRowsBySheet = {};

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (ws) {
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
      sheets[name] = rows;
      sampleRowsBySheet[name] = rows.slice(0, 15);
    }
  }

  return {
    sheetNames: wb.SheetNames,
    sheets,
    sampleRowsBySheet,
  };
}

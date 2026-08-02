import XLSX from 'xlsx';

const wb = XLSX.readFile('data/raw/dashboard.xlsx');
const ws = wb.Sheets['Tagihan Pelanggan'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log('=== INSPECTING dashboard.xlsx (Tagihan Pelanggan) ===');
console.log('Headers:', rows[2]);

rows.forEach((r, idx) => {
  if (idx < 3) return;
  const custCode = r[2];
  if (['IDN-038', 'IDN-039', 'IDN-040', 'IDN-041', 'IDN-042'].includes(custCode)) {
    const period = r[1];
    const status = r[7];
    const notes = r[15];
    console.log(`Row ${idx} | ${custCode} (${r[3]}) | period=${period} | status=${status} | notes=${notes}`);
  }
});

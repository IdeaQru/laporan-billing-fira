// ============================================================
// Domain Services — Pure synchronous business logic
// ============================================================

/**
 * Formats Rupiah currency string.
 * @param {number} amount
 * @returns {string}
 */
export const formatRupiah = (amount) =>
  `Rp ${amount.toLocaleString('id-ID')}`;

/**
 * Calculates collection efficiency percentage.
 * Total Paid / (Total Paid + Total Outstanding) * 100
 * @param {number} totalPaid
 * @param {number} totalOutstanding
 * @returns {number} percentage 0-100
 */
export const calcCollectionEfficiency = (totalPaid, totalOutstanding) => {
  const total = totalPaid + totalOutstanding;
  if (total === 0) return 100;
  return Math.round((totalPaid / total) * 10000) / 100;
};

/**
 * Calculates net balance (income minus expenses).
 * @param {number} totalPaid
 * @param {number} totalExpenses
 * @returns {number}
 */
export const calcNetBalance = (totalPaid, totalExpenses) =>
  totalPaid - totalExpenses;

/**
 * Determines the area with highest unpaid amount from breakdowns.
 * @param {ReadonlyArray<{ areaName: string, totalUnpaid: number }>} areaBreakdown
 * @returns {string}
 */
export const findHighestUnpaidArea = (areaBreakdown) => {
  if (areaBreakdown.length === 0) return '-';
  const sorted = [...areaBreakdown].sort((a, b) => b.totalUnpaid - a.totalUnpaid);
  return sorted[0].areaName;
};

/**
 * Determines the area with lowest unpaid amount from breakdowns.
 * @param {ReadonlyArray<{ areaName: string, totalUnpaid: number }>} areaBreakdown
 * @returns {string}
 */
export const findLowestUnpaidArea = (areaBreakdown) => {
  if (areaBreakdown.length === 0) return '-';
  const sorted = [...areaBreakdown].sort((a, b) => a.totalUnpaid - b.totalUnpaid);
  return sorted[0].areaName;
};

/**
 * Generates an in-detail narrative for Executive Summary.
 * Pure function — derives text from computed metrics.
 * @param {object} params
 * @param {number} params.totalCustomers
 * @param {number} params.totalRevenuePaid
 * @param {number} params.totalOutstanding
 * @param {number} params.totalExpenses
 * @param {number} params.netBalance
 * @param {number} params.collectionEfficiency
 * @param {string} params.highestUnpaidArea
 * @param {string} params.lowestUnpaidArea
 * @param {ReadonlyArray<{ method: string, total: number, percentage: number }>} params.paymentBreakdown
 * @param {ReadonlyArray<{ areaName: string, totalCustomers: number, totalPaid: number, totalUnpaid: number, collectionRate: number }>} params.areaBreakdown
 * @returns {string}
 */
export const generateDetailNarrative = ({
  totalCustomers,
  totalRevenuePaid,
  totalOutstanding,
  totalExpenses,
  netBalance,
  collectionEfficiency,
  highestUnpaidArea,
  lowestUnpaidArea,
  paymentBreakdown,
  areaBreakdown,
}) => {
  const topPaymentMethod = [...paymentBreakdown].sort((a, b) => b.total - a.total)[0];
  const topMethodStr = topPaymentMethod
    ? `${topPaymentMethod.method} (${formatRupiah(topPaymentMethod.total)}, ${topPaymentMethod.percentage}%)`
    : '-';

  const areaDetails = areaBreakdown
    .map(a => `  • ${a.areaName}: ${a.totalCustomers} pelanggan, Terbayar ${formatRupiah(a.totalPaid)}, Tunggakan ${formatRupiah(a.totalUnpaid)} (Efisiensi ${a.collectionRate}%)`)
    .join('\n');

  return `RINGKASAN EKSEKUTIF LAPORAN BILLING WIFI

📊 OVERVIEW KEUANGAN
Dari total ${totalCustomers} pelanggan terdaftar, total pendapatan yang berhasil ditagih adalah ${formatRupiah(totalRevenuePaid)}, sementara total tunggakan yang belum terselesaikan sebesar ${formatRupiah(totalOutstanding)}. Total pengeluaran operasional tercatat sebesar ${formatRupiah(totalExpenses)}, sehingga saldo bersih (net balance) sebesar ${formatRupiah(netBalance)}.

📈 EFISIENSI PENAGIHAN
Tingkat efisiensi penagihan saat ini berada di ${collectionEfficiency}%. Angka ini menunjukkan ${collectionEfficiency >= 80 ? 'performa penagihan yang baik' : collectionEfficiency >= 60 ? 'performa penagihan yang masih perlu ditingkatkan' : 'performa penagihan yang memerlukan perhatian serius dan tindakan segera'}.

💳 METODE PEMBAYARAN
Metode pembayaran yang paling banyak digunakan adalah ${topMethodStr}. Berikut rincian lengkap per metode:
${paymentBreakdown.map(p => `  • ${p.method}: ${formatRupiah(p.total)} (${p.percentage}%)`).join('\n')}

🗺️ ANALISIS PER AREA
Area dengan tunggakan tertinggi: ${highestUnpaidArea}
Area dengan tunggakan terendah: ${lowestUnpaidArea}

Detail per area:
${areaDetails}

📋 REKOMENDASI OPERASIONAL
${collectionEfficiency < 80
    ? `1. Fokuskan upaya penagihan pada area ${highestUnpaidArea} yang memiliki tunggakan tertinggi.
2. Pertimbangkan strategi diskon pembayaran tepat waktu untuk meningkatkan efisiensi penagihan.
3. Evaluasi pelanggan dengan tunggakan lebih dari 2 bulan untuk tindakan isolir.`
    : `1. Pertahankan efisiensi penagihan yang baik saat ini.
2. Monitor area ${highestUnpaidArea} untuk pencegahan potensi tunggakan.
3. Evaluasi peluang penambahan pelanggan baru di area dengan performa terbaik.`
  }`;
};

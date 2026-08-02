import { useRef } from 'react';

const formatRupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const formatNum = (n) => Number(n || 0).toLocaleString('id-ID');

export default function PdfReportTemplate({ data, selectedMonth, selectedAreas, unpaidData, loadingUnpaid, onClose }) {
  const printRef = useRef(null);

  const {
    totalCustomers = 0,
    totalRevenuePaid = 0,
    totalOutstanding = 0,
    totalExpenses = 0,
    netBalance = 0,
    collectionEfficiency = 0,
    paymentBreakdown = [],
    areaBreakdown = [],
    lunasCount = 0,
    belumLunasCount = 0,
    arpu = 0,
    highestUnpaidArea = '-',
    lowestUnpaidArea = '-',
  } = data || {};

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const sortedPayment = [...paymentBreakdown].sort((a, b) => b.total - a.total);
  const topPaymentMethod = sortedPayment[0];

  // Calculate unpaid list pages (Page 3+)
  const unpaidCustomers = unpaidData?.unpaidCustomers || [];
  const ITEMS_PER_PAGE = 22;
  const unpaidPages = [];
  if (unpaidCustomers.length > 0) {
    for (let i = 0; i < unpaidCustomers.length; i += ITEMS_PER_PAGE) {
      unpaidPages.push(unpaidCustomers.slice(i, i + ITEMS_PER_PAGE));
    }
  } else {
    unpaidPages.push([]);
  }

  const totalPages = 2 + unpaidPages.length;

  return (
    <div className="pdf-modal-overlay" onClick={onClose}>
      {/* Top Floating Control Bar */}
      <div className="pdf-control-bar" onClick={(e) => e.stopPropagation()}>
        <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.95rem' }}>
          Preview Laporan PDF A4 ({totalPages} Halaman) — {selectedMonth}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" onClick={handlePrint} style={{ height: 38, display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Cetak / Simpan PDF (A4)
          </button>
          <button className="btn btn-secondary" onClick={onClose} style={{ height: 38 }}>
            Tutup
          </button>
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div className="pdf-sheet-container" onClick={(e) => e.stopPropagation()} ref={printRef}>
        
        {/* ================= PAGE 1 ================= */}
        <div className="a4-sheet page-1">
          <div>
            {/* Header Kop */}
            <div className="a4-header">
              <div className="a4-header-left">
                <div className="a4-logo-badge">WIFI</div>
                <div>
                  <h1 className="a4-title">LAPORAN EXECUTIVE SUMMARY BILLING WIFI</h1>
                  <p className="a4-subtitle">Sistem Manajemen & Analisis Pendapatan WiFi RT/RW Net</p>
                </div>
              </div>
              <div className="a4-header-right">
                <div className="a4-meta-tag">DOKUMEN RESMI</div>
                <div className="a4-meta-date">Tanggal: {currentDate}</div>
              </div>
            </div>

            <div className="a4-divider" />

            {/* Period & Filter Metadata */}
            <div className="a4-meta-grid">
              <div className="a4-meta-box">
                <span className="a4-meta-label">Periode Laporan:</span>
                <strong className="a4-meta-val">{selectedMonth === 'ALL' ? 'Semua Bulan (Akumulasi)' : `Bulan ${selectedMonth}`}</strong>
              </div>
              <div className="a4-meta-box">
                <span className="a4-meta-label">Cakupan Wilayah:</span>
                <strong className="a4-meta-val">
                  {selectedAreas && selectedAreas.length > 0 ? selectedAreas.join(', ') : 'Semua Area (17 Wilayah)'}
                </strong>
              </div>
              <div className="a4-meta-box">
                <span className="a4-meta-label">Status Penagihan:</span>
                <strong className="a4-meta-val">{lunasCount} Lunas / {belumLunasCount} Belum Lunas</strong>
              </div>
            </div>

            {/* KPI Summary Cards Grid */}
            <div className="a4-kpi-grid">
              <div className="a4-kpi-card green">
                <div className="a4-kpi-label">TOTAL PENERIMAAN LUNAS</div>
                <div className="a4-kpi-value">{formatRupiah(totalRevenuePaid)}</div>
                <div className="a4-kpi-sub">{lunasCount} Pelanggan Lunas</div>
              </div>

              <div className="a4-kpi-card red">
                <div className="a4-kpi-label">TOTAL TUNGGAKAN</div>
                <div className="a4-kpi-value">{formatRupiah(totalOutstanding)}</div>
                <div className="a4-kpi-sub">{belumLunasCount} Tagihan Tertunggak</div>
              </div>

              <div className="a4-kpi-card orange">
                <div className="a4-kpi-label">PENGELUARAN OPERASIONAL</div>
                <div className="a4-kpi-value">{formatRupiah(totalExpenses)}</div>
                <div className="a4-kpi-sub">Biaya Maintenance & Fee</div>
              </div>

              <div className="a4-kpi-card blue">
                <div className="a4-kpi-label">SALDO BERSIH (NET REVENUE)</div>
                <div className="a4-kpi-value">{formatRupiah(netBalance)}</div>
                <div className="a4-kpi-sub">Efisiensi: {collectionEfficiency}%</div>
              </div>
            </div>

            {/* Area Performance Table */}
            <div className="a4-section">
              <h2 className="a4-section-title">Rincian Kinerja Penagihan Per Wilayah</h2>
              <table className="a4-table">
                <thead>
                  <tr>
                    <th style={{ width: 30 }}>No</th>
                    <th>Wilayah / Area</th>
                    <th style={{ textAlign: 'center' }}>Total Pelanggan</th>
                    <th style={{ textAlign: 'right' }}>Pembayaran Lunas</th>
                    <th style={{ textAlign: 'right' }}>Tunggakan</th>
                    <th style={{ textAlign: 'center' }}>Rate Penagihan</th>
                  </tr>
                </thead>
                <tbody>
                  {areaBreakdown.slice(0, 10).map((area, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td><strong>{area.areaName}</strong></td>
                      <td style={{ textAlign: 'center' }}>{area.totalCustomers} plg</td>
                      <td style={{ textAlign: 'right', color: '#059669', fontWeight: 600 }}>{formatRupiah(area.totalPaid)}</td>
                      <td style={{ textAlign: 'right', color: area.totalUnpaid > 0 ? '#dc2626' : '#64748b' }}>
                        {area.totalUnpaid > 0 ? formatRupiah(area.totalUnpaid) : '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`a4-badge ${area.collectionRate >= 90 ? 'high' : area.collectionRate >= 75 ? 'medium' : 'low'}`}>
                          {area.collectionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Payment Method Breakdown & ARPU Summary */}
            <div className="a4-grid-2" style={{ marginTop: 12 }}>
              <div className="a4-section">
                <h2 className="a4-section-title">Kanal Pembayaran</h2>
                <table className="a4-table mini">
                  <thead>
                    <tr>
                      <th>Metode</th>
                      <th style={{ textAlign: 'right' }}>Total Masuk</th>
                      <th style={{ textAlign: 'right' }}>Porsi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentBreakdown.map((pm, idx) => (
                      <tr key={idx}>
                        <td><strong>{pm.method}</strong></td>
                        <td style={{ textAlign: 'right' }}>{formatRupiah(pm.total)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{pm.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="a4-section">
                <h2 className="a4-section-title">Indikator ARPU & Efisiensi</h2>
                <div className="a4-info-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span>Rata-Rata Pendapatan / User (ARPU):</span>
                    <strong>{formatRupiah(arpu)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span>Total Pelanggan Aktif:</span>
                    <strong>{formatNum(totalCustomers)} Pelanggan</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tingkat Efisiensi Penagihan:</span>
                    <strong style={{ color: collectionEfficiency >= 90 ? '#059669' : '#d97706' }}>{collectionEfficiency}%</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Page 1 */}
          <div className="a4-footer">
            <span>Halaman 1 dari {totalPages} • Laporan WiFi Billing System</span>
            <span>Dicetak secara otomatis pada {currentDate}</span>
          </div>
        </div>


        {/* ================= PAGE 2 ================= */}
        <div className="a4-sheet page-2">
          <div>
            {/* Header Kop Page 2 */}
            <div className="a4-header">
              <div className="a4-header-left">
                <div className="a4-logo-badge">WIFI</div>
                <div>
                  <h1 className="a4-title">RINGKASAN EKSEKUTIF & ANALISIS MANAJERIAL</h1>
                  <p className="a4-subtitle">Laporan Evaluasi Financial Overview, Performance Area & Rekomendasi</p>
                </div>
              </div>
              <div className="a4-header-right">
                <div className="a4-meta-tag">HALAMAN 2 DARI {totalPages}</div>
                <div className="a4-meta-date">Bulan: {selectedMonth}</div>
              </div>
            </div>

            <div className="a4-divider" />

            {/* Block 1: Overview Keuangan & Efisiensi Penagihan */}
            <div className="a4-grid-2">
              <div className="a4-card-box navy">
                <h3 className="a4-card-heading">OVERVIEW KEUANGAN</h3>
                <p className="a4-card-text">
                  Dari total <strong>{formatNum(totalCustomers)} pelanggan terdaftar</strong>, total pendapatan yang berhasil ditagih adalah <strong>{formatRupiah(totalRevenuePaid)}</strong>, sementara total tunggakan yang belum terselesaikan sebesar <strong>{formatRupiah(totalOutstanding)}</strong>. Total pengeluaran operasional tercatat sebesar <strong>{formatRupiah(totalExpenses)}</strong>, sehingga saldo bersih (net balance) sebesar <strong>{formatRupiah(netBalance)}</strong>.
                </p>
              </div>

              <div className="a4-card-box green">
                <h3 className="a4-card-heading">EFISIENSI PENAGIHAN</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                  <span className="a4-stat-huge">{collectionEfficiency}%</span>
                  <span className={`a4-status-pill ${collectionEfficiency >= 80 ? 'good' : 'warning'}`}>
                    {collectionEfficiency >= 80 ? 'Performa Baik' : 'Perlu Tingkatkan'}
                  </span>
                </div>
                <div className="a4-progress-bar-container">
                  <div className="a4-progress-bar-fill" style={{ width: `${Math.min(collectionEfficiency, 100)}%` }} />
                </div>
                <p className="a4-card-subtext" style={{ marginTop: 8 }}>
                  {collectionEfficiency >= 80
                    ? 'Tingkat penagihan memenuhi target efisiensi operasional harian.'
                    : 'Terdapat potensi tunggakan yang memerlukan tindak lanjut khusus.'}
                </p>
              </div>
            </div>

            {/* Block 2: Metode Pembayaran */}
            <div className="a4-section" style={{ marginTop: 14 }}>
              <h2 className="a4-section-title">METODE PEMBAYARAN</h2>
              <p className="a4-card-subtext" style={{ marginBottom: 8 }}>
                Metode pembayaran terbanyak digunakan adalah <strong>{topPaymentMethod ? `${topPaymentMethod.method} (${formatRupiah(topPaymentMethod.total)}, ${topPaymentMethod.percentage}%)` : '-'}</strong>.
              </p>
              <div className="a4-payment-grid">
                {paymentBreakdown.map((p) => (
                  <div key={p.method} className="a4-payment-pill">
                    <span className="a4-payment-name">{p.method}</span>
                    <span className="a4-payment-val">{formatRupiah(p.total)}</span>
                    <span className="a4-payment-pct">{p.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Block 3: Analisis Per Area */}
            <div className="a4-section" style={{ marginTop: 14 }}>
              <h2 className="a4-section-title">ANALISIS PER AREA</h2>
              <div className="a4-grid-2" style={{ marginBottom: 10 }}>
                <div className="a4-highlight-box red">
                  <span className="a4-hl-label">TUNGGAKAN TERTINGGI</span>
                  <strong className="a4-hl-val">{highestUnpaidArea}</strong>
                </div>
                <div className="a4-highlight-box green">
                  <span className="a4-hl-label">TUNGGAKAN TERENDAH / PERFORMA TERBAIK</span>
                  <strong className="a4-hl-val">{lowestUnpaidArea}</strong>
                </div>
              </div>

              {/* Detailed Area Listing (2 columns) */}
              <div className="a4-area-2col-list">
                {areaBreakdown.map((area, idx) => (
                  <div key={idx} className="a4-area-row">
                    <span className="a4-ar-name">{area.areaName}</span>
                    <span className="a4-ar-cust">{area.totalCustomers} plg</span>
                    <span className="a4-ar-paid">{formatRupiah(area.totalPaid)}</span>
                    <span className="a4-ar-unpaid" style={{ color: area.totalUnpaid > 0 ? '#dc2626' : '#059669' }}>
                      {area.totalUnpaid > 0 ? `Tunggakan ${formatRupiah(area.totalUnpaid)}` : '100% Lunas'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Block 4: Rekomendasi Operasional */}
            <div className="a4-section" style={{ marginTop: 14 }}>
              <h2 className="a4-section-title">REKOMENDASI OPERASIONAL</h2>
              <div className="a4-recom-list">
                {collectionEfficiency >= 80 ? (
                  <>
                    <div className="a4-recom-item">
                      <span className="a4-recom-num">1</span>
                      <div>
                        <strong>Pertahankan Efisiensi Penagihan</strong>
                        <p>Jaga standar efisiensi penagihan di atas 80% melalui pengiriman reminder invoice tepat waktu.</p>
                      </div>
                    </div>
                    <div className="a4-recom-item">
                      <span className="a4-recom-num">2</span>
                      <div>
                        <strong>Monitor Area Potential Unpaid ({highestUnpaidArea})</strong>
                        <p>Lakukan koordinasi lapangan di area {highestUnpaidArea} untuk mencegah eskalasi tunggakan lebih lanjut.</p>
                      </div>
                    </div>
                    <div className="a4-recom-item">
                      <span className="a4-recom-num">3</span>
                      <div>
                        <strong>Evaluasi Ekspansi Pelanggan Baru</strong>
                        <p>Fokuskan pengembangan jaringan baru pada area dengan performa penagihan 100% lunas.</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="a4-recom-item">
                      <span className="a4-recom-num">1</span>
                      <div>
                        <strong>Prioritas Penagihan Area ({highestUnpaidArea})</strong>
                        <p>Fokuskan tim lapangan untuk melakukan kunjungan dan konfirmasi penagihan pada area {highestUnpaidArea}.</p>
                      </div>
                    </div>
                    <div className="a4-recom-item">
                      <span className="a4-recom-num">2</span>
                      <div>
                        <strong>Strategi Diskon / Insentif Tepat Waktu</strong>
                        <p>Terapkan program insentif pembayaran lebih awal untuk mempercepat arus kas masuk.</p>
                      </div>
                    </div>
                    <div className="a4-recom-item">
                      <span className="a4-recom-num">3</span>
                      <div>
                        <strong>Evaluasi Kebijakan Isolir</strong>
                        <p>Lakukan prosedur penonaktifan sementara (isolir) bagi pelanggan yang memiliki keterlambatan lebih dari 2 bulan.</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Signature Block */}
            <div className="a4-signature-section">
              <div className="a4-signature-box">
                <p>Dibuat Oleh,</p>
                <div className="a4-signature-line" />
                <p><strong>Admin Keuangan / Billing</strong></p>
              </div>
              <div className="a4-signature-box">
                <p>Disetujui Oleh,</p>
                <div className="a4-signature-line" />
                <p><strong>Manajer Operasional WiFi</strong></p>
              </div>
            </div>
          </div>

          {/* Footer Page 2 */}
          <div className="a4-footer">
            <span>Halaman 2 dari {totalPages} • Laporan WiFi Billing System</span>
            <span>Dicetak secara otomatis pada {currentDate}</span>
          </div>
        </div>

        {/* ================= PAGE 3+ (DAFTAR UNPAID & FREE) ================= */}
        {unpaidPages.map((pageCustomers, pIdx) => {
          const pageNum = 3 + pIdx;
          const isLastUnpaidPage = pIdx === unpaidPages.length - 1;
          const startRowNo = pIdx * ITEMS_PER_PAGE + 1;

          return (
            <div className={`a4-sheet page-${pageNum}`} key={pIdx}>
              <div>
                {/* Header Kop Page 3+ */}
                <div className="a4-header">
                  <div className="a4-header-left">
                    <div className="a4-logo-badge">WIFI</div>
                    <div>
                      <h1 className="a4-title">DAFTAR DETAIL PELANGGAN MENUNGGAK & STATUS KHUSUS</h1>
                      <p className="a4-subtitle">
                        Periode: {selectedMonth === 'ALL' ? 'Semua Bulan' : `Bulan ${selectedMonth}`}
                        {selectedAreas && selectedAreas.length > 0 ? ` • Area: ${selectedAreas.join(', ')}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="a4-header-right">
                    <div className="a4-meta-tag">HALAMAN {pageNum} DARI {totalPages}</div>
                    <div className="a4-meta-date">Total Penunggak: {formatNum(unpaidData?.totalUnpaidCount || 0)} Plg</div>
                  </div>
                </div>

                <div className="a4-divider" />

                {loadingUnpaid ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                    Memuat data pelanggan menunggak...
                  </div>
                ) : pageCustomers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '50px 0', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1', marginTop: 20 }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#059669', marginBottom: 6 }}>
                      🎉 Tidak Ada Pelanggan Menunggak
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                      Seluruh pelanggan pada periode <strong>{selectedMonth}</strong> telah melunasi tagihan (100% Lunas).
                    </p>
                  </div>
                ) : (
                  <div className="a4-section" style={{ marginTop: 8 }}>
                    <table className="a4-table mini-unpaid">
                      <thead>
                        <tr>
                          <th style={{ width: 26, textAlign: 'center' }}>No</th>
                          <th style={{ width: 70 }}>Kode Plg</th>
                          <th>Nama Pelanggan</th>
                          <th style={{ width: 95 }}>Wilayah / Area</th>
                          <th style={{ width: 75 }}>Tarif</th>
                          <th style={{ width: 95, textAlign: 'right' }}>Tunggakan (Rp)</th>
                          <th style={{ width: 160 }}>Rincian Bulan Belum Lunas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageCustomers.map((cust, itemIdx) => {
                          const rowNo = startRowNo + itemIdx;
                          const detailText = cust.unpaid_detail || cust.keterangan || '';
                          const monthParts = detailText.includes('(') ? detailText.substring(detailText.indexOf('(')) : detailText;

                          return (
                            <tr key={itemIdx} className={cust.is_free ? 'row-free' : ''}>
                              <td style={{ textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>{rowNo}</td>
                              <td><code style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155' }}>{cust.customer_code}</code></td>
                              <td><strong style={{ fontSize: '0.75rem', color: '#0f172a' }}>{cust.customer_name}</strong></td>
                              <td><span style={{ fontSize: '0.72rem', color: '#475569' }}>{cust.area_name}</span></td>
                              <td style={{ fontSize: '0.7rem', color: '#64748b' }}>{formatRupiah(cust.package_price)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.75rem', color: cust.is_free ? '#0284c7' : '#dc2626' }}>
                                {cust.is_free ? 'Rp 0' : formatRupiah(cust.unpaid_amount)}
                              </td>
                              <td style={{ fontSize: '0.7rem' }}>
                                {cust.is_free ? (
                                  <span className="a4-badge free">FREE</span>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                    <span className="a4-badge low" style={{ flexShrink: 0 }}>
                                      {cust.unpaid_months > 0 ? `${cust.unpaid_months} BULAN` : 'TUNGGAKAN'}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: '#334155', fontWeight: 600 }}>
                                      {monthParts}
                                    </span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                )}

                {/* Summary Footer Box on the last page of unpaid list */}
                {isLastUnpaidPage && !loadingUnpaid && unpaidCustomers.length > 0 && (
                  <div className="a4-unpaid-summary-box">
                    <div className="a4-unpaid-sum-item">
                      <span className="a4-sum-label">TOTAL PELANGGAN MENUNGGAK:</span>
                      <strong className="a4-sum-val red">{formatNum(unpaidData?.totalUnpaidCount || 0)} Pelanggan</strong>
                    </div>
                    <div className="a4-unpaid-sum-item">
                      <span className="a4-sum-label">TOTAL NOMINAL TUNGGAKAN:</span>
                      <strong className="a4-sum-val red">{formatRupiah(unpaidData?.totalUnpaidAmount || 0)}</strong>
                    </div>
                    <div className="a4-unpaid-sum-item">
                      <span className="a4-sum-label">PELANGGAN STATUS FREE:</span>
                      <strong className="a4-sum-val blue">{formatNum(unpaidData?.totalFreeCount || 0)} Pelanggan (Tidak Dihitung Utang)</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Page 3+ */}
              <div className="a4-footer">
                <span>Halaman {pageNum} dari {totalPages} • Laporan WiFi Billing System</span>
                <span>Dicetak secara otomatis pada {currentDate}</span>
              </div>
            </div>
          );
        })}

      </div>

      <style>{`
        .pdf-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          z-index: 2000;
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow-y: auto;
          padding: 20px;
        }

        .pdf-control-bar {
          width: 100%;
          max-width: 210mm;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 12px 20px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }

        .pdf-sheet-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 30px;
          margin-bottom: 40px;
        }

        /* A4 Sheet Styles (210mm x 297mm) */
        .a4-sheet {
          width: 210mm;
          height: 297mm;
          background: #ffffff;
          color: #0f172a;
          padding: 16mm 16mm 14mm;
          box-shadow: 0 20px 50px rgba(0,0,0,0.4);
          box-sizing: border-box;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          page-break-after: always;
        }

        .a4-sheet:last-child {
          page-break-after: auto;
        }

        .a4-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .a4-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .a4-logo-badge {
          width: 44px;
          height: 44px;
          background: #4f46e5;
          color: #ffffff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .a4-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: #1e1b4b;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .a4-subtitle {
          font-size: 0.72rem;
          color: #64748b;
          margin: 2px 0 0;
        }

        .a4-header-right {
          text-align: right;
        }

        .a4-meta-tag {
          font-size: 0.65rem;
          font-weight: 700;
          background: #e0e7ff;
          color: #3730a3;
          padding: 3px 8px;
          border-radius: 4px;
          display: inline-block;
          letter-spacing: 0.05em;
        }

        .a4-meta-date {
          font-size: 0.72rem;
          color: #64748b;
          margin-top: 4px;
        }

        .a4-divider {
          height: 2px;
          background: linear-gradient(90deg, #4f46e5, #818cf8, transparent);
          margin: 10px 0;
        }

        .a4-meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
          margin-bottom: 12px;
        }

        .a4-meta-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 0.73rem;
        }

        .a4-meta-label {
          display: block;
          color: #64748b;
          font-size: 0.65rem;
          margin-bottom: 2px;
        }

        .a4-meta-val {
          color: #0f172a;
        }

        .a4-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 12px;
        }

        .a4-kpi-card {
          border-radius: 8px;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          background: #fafafa;
        }

        .a4-kpi-card.green { background: #f0fdf4; border-color: #bbf7d0; }
        .a4-kpi-card.red { background: #fef2f2; border-color: #fecaca; }
        .a4-kpi-card.orange { background: #fff7ed; border-color: #fed7aa; }
        .a4-kpi-card.blue { background: #eff6ff; border-color: #bfdbfe; }

        .a4-kpi-label {
          font-size: 0.62rem;
          font-weight: 700;
          color: #475569;
          letter-spacing: 0.04em;
          margin-bottom: 4px;
        }

        .a4-kpi-value {
          font-size: 0.92rem;
          font-weight: 800;
          color: #0f172a;
          font-family: monospace;
        }

        .a4-kpi-sub {
          font-size: 0.65rem;
          color: #64748b;
          margin-top: 2px;
        }

        .a4-section-title {
          font-size: 0.8rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 8px;
          padding-bottom: 4px;
          border-bottom: 1px solid #cbd5e1;
          letter-spacing: 0.03em;
        }

        .a4-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.7rem;
        }

        .a4-table th {
          background: #f1f5f9;
          color: #334155;
          font-weight: 700;
          padding: 5px 8px;
          border: 1px solid #cbd5e1;
          text-transform: uppercase;
          font-size: 0.63rem;
        }

        .a4-table td {
          padding: 4px 8px;
          border: 1px solid #e2e8f0;
          color: #1e293b;
        }

        .a4-table tbody tr:nth-child(even) {
          background: #f8fafc;
        }

        .a4-badge {
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
          font-size: 0.63rem;
        }

        .a4-badge.high { background: #dcfce7; color: #15803d; }
        .a4-badge.medium { background: #fef3c7; color: #b45309; }
        .a4-badge.low { background: #fee2e2; color: #b91c1c; }

        .a4-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .a4-card-box {
          border-radius: 8px;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
        }

        .a4-card-box.navy {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .a4-card-box.green {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        .a4-card-heading {
          font-size: 0.72rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 6px;
          letter-spacing: 0.03em;
        }

        .a4-card-text {
          font-size: 0.7rem;
          color: #334155;
          line-height: 1.45;
          margin: 0;
        }

        .a4-stat-huge {
          font-size: 1.3rem;
          font-weight: 900;
          color: #0f172a;
          font-family: monospace;
        }

        .a4-status-pill {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.62rem;
          font-weight: 700;
        }

        .a4-status-pill.good {
          background: #dcfce7;
          color: #15803d;
        }

        .a4-status-pill.warning {
          background: #fef3c7;
          color: #b45309;
        }

        .a4-progress-bar-container {
          width: 100%;
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          overflow: hidden;
        }

        .a4-progress-bar-fill {
          height: 100%;
          background: #10b981;
          border-radius: 3px;
        }

        .a4-card-subtext {
          font-size: 0.66rem;
          color: #64748b;
          margin: 0;
        }

        .a4-payment-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .a4-payment-pill {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 0.68rem;
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1 1 120px;
        }

        .a4-payment-name {
          font-weight: 700;
          color: #1e293b;
        }

        .a4-payment-val {
          color: #059669;
          font-weight: 600;
          font-family: monospace;
        }

        .a4-payment-pct {
          color: #64748b;
          margin-left: auto;
        }

        .a4-highlight-box {
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          font-size: 0.7rem;
        }

        .a4-highlight-box.red {
          background: #fef2f2;
          border-color: #fecaca;
          color: #991b1b;
        }

        .a4-highlight-box.green {
          background: #f0fdf4;
          border-color: #bbf7d0;
          color: #166534;
        }

        .a4-hl-label {
          display: block;
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          margin-bottom: 2px;
        }

        .a4-hl-val {
          font-size: 0.82rem;
          font-weight: 800;
        }

        .a4-area-2col-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 12px;
          font-size: 0.65rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 10px;
        }

        .a4-area-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 2px 0;
          border-bottom: 1px dashed #e2e8f0;
        }

        .a4-ar-name {
          font-weight: 700;
          color: #1e293b;
          width: 90px;
        }

        .a4-ar-cust {
          color: #64748b;
          width: 45px;
        }

        .a4-ar-paid {
          color: #059669;
          font-weight: 600;
          font-family: monospace;
        }

        .a4-ar-unpaid {
          font-weight: 600;
          font-size: 0.62rem;
        }

        .a4-recom-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .a4-recom-item {
          display: flex;
          gap: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 6px 10px;
          align-items: flex-start;
        }

        .a4-recom-num {
          width: 18px;
          height: 18px;
          background: #4f46e5;
          color: #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          font-weight: 800;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .a4-recom-item strong {
          font-size: 0.7rem;
          color: #1e293b;
          display: block;
        }

        .a4-recom-item p {
          font-size: 0.65rem;
          color: #475569;
          margin: 1px 0 0;
        }

        .a4-info-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 0.7rem;
          color: #334155;
        }

        .a4-signature-section {
          display: flex;
          justify-content: space-between;
          margin-top: 12px;
          padding: 0 30px;
        }

        .a4-signature-box {
          text-align: center;
          font-size: 0.7rem;
          color: #334155;
        }

        .a4-signature-line {
          height: 40px;
          border-bottom: 1px solid #94a3b8;
          width: 140px;
          margin: 0 auto 6px;
        }

        .a4-footer {
          display: flex;
          justify-content: space-between;
          font-size: 0.63rem;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
          padding-top: 6px;
          margin-top: 10px;
        }

        .a4-sheet:last-child {
          page-break-after: auto;
        }

        .a4-badge.free {
          background: #e0f2fe;
          color: #0369a1;
        }

        .a4-unpaid-summary-box {
          margin-top: 14px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .a4-unpaid-sum-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .a4-sum-label {
          font-size: 0.62rem;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.04em;
        }

        .a4-sum-val.red {
          font-size: 0.88rem;
          font-weight: 800;
          color: #dc2626;
        }

        .a4-sum-val.blue {
          font-size: 0.88rem;
          font-weight: 800;
          color: #0284c7;
        }

        .a4-table.mini-unpaid th {
          padding: 5px 6px;
          font-size: 0.65rem;
        }

        .a4-table.mini-unpaid td {
          padding: 4px 6px;
        }

        .row-free {
          background-color: #f0f9ff;
        }

        /* PRINT MEDIA QUERY FOR DYNAMIC A4 PRINTING */
        @media print {
          body * {
            visibility: hidden;
          }
          .pdf-modal-overlay {
            position: absolute;
            inset: 0;
            background: #fff;
            padding: 0;
            overflow: visible;
          }
          .pdf-control-bar {
            display: none !important;
          }
          .pdf-sheet-container {
            gap: 0;
            margin-bottom: 0;
          }
          .a4-sheet, .a4-sheet * {
            visibility: visible;
          }
          .a4-sheet {
            position: relative;
            width: 210mm;
            height: 297mm;
            box-shadow: none;
            padding: 12mm 14mm 10mm;
            page-break-after: always;
          }
          .a4-sheet:last-child {
            page-break-after: auto;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}

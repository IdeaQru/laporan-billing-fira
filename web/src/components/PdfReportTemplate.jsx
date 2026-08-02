import { useRef } from 'react';

const formatRupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const formatNum = (n) => Number(n || 0).toLocaleString('id-ID');

export default function PdfReportTemplate({ data, selectedMonth, selectedAreas, onClose }) {
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
    detailNarrative = '',
  } = data || {};

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="pdf-modal-overlay" onClick={onClose}>
      {/* Top Floating Control Bar */}
      <div className="pdf-control-bar" onClick={(e) => e.stopPropagation()}>
        <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.95rem' }}>
          📄 Preview Laporan PDF A4 — {selectedMonth}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" onClick={handlePrint} style={{ height: 38 }}>
            🖨️ Cetak / Simpan PDF (A4)
          </button>
          <button className="btn btn-secondary" onClick={onClose} style={{ height: 38 }}>
            ✕ Tutup
          </button>
        </div>
      </div>

      {/* Printable Sheet (A4 Portrait Container) */}
      <div className="pdf-sheet-container" onClick={(e) => e.stopPropagation()}>
        <div className="a4-sheet" ref={printRef}>
          {/* Header Kop */}
          <div className="a4-header">
            <div className="a4-header-left">
              <div className="a4-logo-icon">📡</div>
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
                {selectedAreas && selectedAreas.length > 0 ? selectedAreas.join(', ') : 'Semua Area (19 Wilayah)'}
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
            <h2 className="a4-section-title">📊 Rincian Kinerja Penagihan Per Wilayah</h2>
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
                {areaBreakdown.slice(0, 15).map((area, idx) => (
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
          <div className="a4-grid-2">
            <div className="a4-section">
              <h2 className="a4-section-title">💳 Kanal Pembayaran</h2>
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
              <h2 className="a4-section-title">💡 Indikator ARPU & Efisiensi</h2>
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

          {/* Executive Narrative Notes */}
          <div className="a4-section" style={{ marginTop: 12 }}>
            <h2 className="a4-section-title">📝 Catatan Analisis & Rekomendasi Manajerial</h2>
            <div className="a4-narrative-content">
              {detailNarrative || 'Seluruh data penerimaan dan pengeluaran pada periode ini telah terekonsiliasi secara presisi dari catatan sistem billing WiFi.'}
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

          {/* Footer */}
          <div className="a4-footer">
            <span>Halaman 1 dari 1 • Laporan WiFi Billing System</span>
            <span>Dicetak secara otomatis pada {currentDate}</span>
          </div>
        </div>
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
          max-width: 820px;
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
          justify-content: center;
          margin-bottom: 40px;
        }

        /* A4 Sheet Styles (210mm x 297mm) */
        .a4-sheet {
          width: 210mm;
          min-height: 297mm;
          background: #ffffff;
          color: #0f172a;
          padding: 18mm 16mm 16mm;
          box-shadow: 0 20px 50px rgba(0,0,0,0.4);
          box-sizing: border-box;
          font-family: 'Inter', system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
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

        .a4-logo-icon {
          width: 44px;
          height: 44px;
          background: #4f46e5;
          color: #ffffff;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .a4-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: #1e1b4b;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .a4-subtitle {
          font-size: 0.75rem;
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
          margin: 12px 0;
        }

        .a4-meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
          margin-bottom: 14px;
        }

        .a4-meta-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 0.75rem;
        }

        .a4-meta-label {
          display: block;
          color: #64748b;
          font-size: 0.68rem;
          margin-bottom: 2px;
        }

        .a4-meta-val {
          color: #0f172a;
        }

        .a4-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 14px;
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
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
          font-family: 'JetBrains Mono', monospace;
        }

        .a4-kpi-sub {
          font-size: 0.65rem;
          color: #64748b;
          margin-top: 2px;
        }

        .a4-section-title {
          font-size: 0.82rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 8px;
          padding-bottom: 4px;
          border-bottom: 1px solid #e2e8f0;
        }

        .a4-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.72rem;
        }

        .a4-table th {
          background: #f1f5f9;
          color: #334155;
          font-weight: 700;
          padding: 6px 8px;
          border: 1px solid #cbd5e1;
          text-transform: uppercase;
          font-size: 0.65rem;
        }

        .a4-table td {
          padding: 5px 8px;
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
          font-size: 0.65rem;
        }

        .a4-badge.high { background: #dcfce7; color: #15803d; }
        .a4-badge.medium { background: #fef3c7; color: #b45309; }
        .a4-badge.low { background: #fee2e2; color: #b91c1c; }

        .a4-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 10px;
        }

        .a4-info-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px;
          font-size: 0.72rem;
          color: #334155;
        }

        .a4-narrative-content {
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 6px;
          padding: 10px;
          font-size: 0.72rem;
          color: #334155;
          line-height: 1.5;
        }

        .a4-signature-section {
          display: flex;
          justify-content: space-between;
          margin-top: 24px;
          padding: 0 30px;
        }

        .a4-signature-box {
          text-align: center;
          font-size: 0.75rem;
          color: #334155;
        }

        .a4-signature-line {
          height: 50px;
          border-bottom: 1px solid #94a3b8;
          width: 140px;
          margin: 0 auto 8px;
        }

        .a4-footer {
          display: flex;
          justify-content: space-between;
          font-size: 0.65rem;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
          margin-top: 16px;
        }

        /* PRINT MEDIA QUERY FOR DIRECT A4 PRINT */
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
          .a4-sheet, .a4-sheet * {
            visibility: visible;
          }
          .a4-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
            box-shadow: none;
            padding: 12mm 12mm 12mm;
            page-break-after: always;
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

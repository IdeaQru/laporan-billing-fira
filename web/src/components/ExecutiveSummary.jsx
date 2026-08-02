import { useState, useEffect } from 'react';
import { api } from '../services/api';
import PdfReportTemplate from './PdfReportTemplate';

const formatRupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const formatNum = (n) => Number(n || 0).toLocaleString('id-ID');

const PAYMENT_COLORS = {
  BRI: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
  BCA: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
  MANDIRI: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
  BNI: 'linear-gradient(135deg, #f97316, #fb923c)',
  CASH: 'linear-gradient(135deg, #10b981, #34d399)',
};

export default function ExecutiveSummary({ data, selectedMonth, selectedAreas }) {
  const [showNarrative, setShowNarrative] = useState(true);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [trends, setTrends] = useState([]);

  useEffect(() => {
    api.getHistoricalTrends()
      .then(setTrends)
      .catch(console.error);
  }, []);

  const {
    totalCustomers = 0,
    totalRevenuePaid = 0,
    totalOutstanding = 0,
    totalExpenses = 0,
    netBalance = 0,
    collectionEfficiency = 0,
    paymentBreakdown = [],
    areaBreakdown = [],
    statusDistribution = [],
    lunasCount = 0,
    belumLunasCount = 0,
    isolirCount = 0,
    arpu = 0,
    highestUnpaidArea = '-',
    lowestUnpaidArea = '-',
  } = data;

  const maxPayment = Math.max(...paymentBreakdown.map(p => p.total), 1);
  const maxTrendRevenue = Math.max(...trends.map(t => t.paidAmount), 1);

  return (
    <div>
      {/* Active Filter Indicators & Export PDF Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span>Filter Aktif:</span>
          <span className="status-badge lunas">
            Bulan: {selectedMonth === 'ALL' ? 'Semua Bulan' : selectedMonth}
          </span>
          <span className="status-badge proses">
            Lokasi: {selectedAreas.length === 0 ? 'Semua Area' : `${selectedAreas.length} Area (${selectedAreas.join(', ')})`}
          </span>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowPdfModal(true)}
          style={{
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            boxShadow: '0 4px 15px rgba(79,70,229,0.3)',
            height: 38,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Export PDF Summary (A4)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card indigo animate-in stagger-1">
          <div className="kpi-label">Total Pelanggan</div>
          <div className="kpi-value">{formatNum(totalCustomers)}</div>
          <div className="kpi-sub">ARPU: {formatRupiah(arpu)}/plg</div>
        </div>

        <div className="kpi-card emerald animate-in stagger-2">
          <div className="kpi-label">Total Pembayaran Lunas</div>
          <div className="kpi-value">{formatRupiah(totalRevenuePaid)}</div>
          <div className="kpi-sub">{lunasCount} tagihan lunas</div>
        </div>

        <div className="kpi-card amber animate-in stagger-3">
          <div className="kpi-label">Total Tunggakan</div>
          <div className="kpi-value">{formatRupiah(totalOutstanding)}</div>
          <div className="kpi-sub">{belumLunasCount + isolirCount} tagihan tertunggak</div>
        </div>

        <div className="kpi-card rose animate-in stagger-4">
          <div className="kpi-label">Total Pengeluaran</div>
          <div className="kpi-value">{formatRupiah(totalExpenses)}</div>
          <div className="kpi-sub">biaya operasional</div>
        </div>

        <div className="kpi-card sky animate-in stagger-5">
          <div className="kpi-label">Saldo Bersih</div>
          <div className="kpi-value" style={{ color: netBalance >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
            {formatRupiah(netBalance)}
          </div>
          <div className="kpi-sub">Efisiensi penagihan: {collectionEfficiency}%</div>
        </div>
      </div>

      {/* Historical Trend Chart (Antar-Bulan) */}
      {trends.length > 0 && (
        <div className="glass-card animate-in" style={{ marginBottom: 28 }}>
          <div className="glass-card-header">
            <div className="icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-sky)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            </div>
            <div>
              <h3>Tren Performa Pendapatan Per Bulan</h3>
              <p>Perbandingan omzet terbayar & efisiensi dari bulan ke bulan</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {trends.slice(-6).map((t) => (
              <div
                key={t.period}
                style={{
                  background: 'var(--bg-table-row)',
                  border: t.period === selectedMonth ? '1px solid var(--accent-indigo)' : '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>
                  {t.periodLabel}
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)' }}>
                  {formatRupiah(t.paidAmount)}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 6 }}>
                  Efisiensi: <strong style={{ color: 'var(--text-primary)' }}>{t.collectionRate}%</strong>
                </div>

                <div style={{ height: 6, background: 'rgba(99, 102, 241, 0.15)', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.max((t.paidAmount / maxTrendRevenue) * 100, 5)}%`,
                      background: 'linear-gradient(90deg, var(--accent-emerald), var(--accent-teal))',
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="charts-grid">
        {/* Payment Breakdown Chart */}
        <div className="glass-card animate-in">
          <div className="glass-card-header">
            <div className="icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </div>
            <div>
              <h3>Metode Pembayaran</h3>
              <p>Distribusi pembayaran berdasarkan channel</p>
            </div>
          </div>
          <div className="bar-chart-container">
            {paymentBreakdown.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                Tidak ada pembayaran pada filter aktif
              </div>
            ) : (
              paymentBreakdown.map((item, idx) => (
                <div className="bar-item" key={item.method}>
                  <span className="bar-label">{item.method}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${Math.max((item.total / maxPayment) * 100, 8)}%`,
                        background: PAYMENT_COLORS[item.method] || 'var(--accent-indigo)',
                        animationDelay: `${idx * 100}ms`,
                      }}
                    >
                      <span>{formatRupiah(item.total)} ({item.percentage}%)</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Area Breakdown */}
        <div className="glass-card animate-in">
          <div className="glass-card-header">
            <div className="icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
            </div>
            <div>
              <h3>Distribusi Per Area</h3>
              <p>Pelanggan dan pendapatan per wilayah</p>
            </div>
          </div>
          <div className="area-list">
            {areaBreakdown.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                Tidak ada data area pada filter aktif
              </div>
            ) : (
              areaBreakdown.map((area) => (
                <div className="area-item" key={area.areaName}>
                  <span className="area-name">{area.areaName}</span>
                  <span className="area-count">{area.totalCustomers} plg</span>
                  <span className="area-amount">{formatRupiah(area.totalPaid)}</span>
                  <span className={`area-rate ${area.collectionRate >= 90 ? 'high' : area.collectionRate >= 70 ? 'medium' : 'low'}`}>
                    {area.collectionRate}%
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="glass-card animate-in" style={{ marginBottom: 28 }}>
        <div className="glass-card-header">
          <div className="icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div>
            <h3>Distribusi Status Tagihan</h3>
            <p>Proporsi status tagihan pelanggan</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {statusDistribution.map((s) => {
            const pct = totalCustomers > 0 ? Math.round((s.count / totalCustomers) * 10000) / 100 : 0;
            const colorMap = {
              'LUNAS': { bg: 'var(--accent-emerald-glow)', text: 'var(--accent-emerald)' },
              'BELUM LUNAS': { bg: 'var(--accent-amber-glow)', text: 'var(--accent-amber)' },
              'ISOLIR': { bg: 'var(--accent-rose-glow)', text: 'var(--accent-rose)' },
              'PROSES': { bg: 'rgba(56, 189, 248, 0.2)', text: 'var(--accent-sky)' },
            };
            const colors = colorMap[s.status] || colorMap['BELUM LUNAS'];
            return (
              <div
                key={s.status}
                style={{
                  flex: '1 1 160px',
                  background: colors.bg,
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 20px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: colors.text }}>
                  {s.count}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: colors.text, marginTop: 4, textTransform: 'uppercase' }}>
                  {s.status}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {pct}% dari total
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Narrative */}
      <div className="glass-card narrative-section animate-in">
        <div className="glass-card-header" style={{ cursor: 'pointer' }} onClick={() => setShowNarrative(!showNarrative)}>
          <div className="icon" style={{ background: 'rgba(167, 139, 250, 0.15)', color: 'var(--accent-purple)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <h3>Analisis Detail & Rekomendasi Manajerial</h3>
            <p>Penjelasan mendalam tentang performa keuangan & operasional</p>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>
            {showNarrative ? '▲' : '▼'}
          </span>
        </div>
        {showNarrative && (
          <div style={{ padding: '8px 0 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                <h4 style={{ color: 'var(--accent-indigo)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 }}>
                  Overview Keuangan
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
                  Dari total <strong>{formatNum(totalCustomers)} pelanggan terdaftar</strong>, total pendapatan yang berhasil ditagih adalah <strong>{formatRupiah(totalRevenuePaid)}</strong>, sementara total tunggakan sebesar <strong>{formatRupiah(totalOutstanding)}</strong>. Total pengeluaran operasional sebesar <strong>{formatRupiah(totalExpenses)}</strong>, sehingga saldo bersih (net balance) sebesar <strong>{formatRupiah(netBalance)}</strong>.
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                <h4 style={{ color: 'var(--accent-emerald)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 }}>
                  Efisiensi Penagihan & Performa Area
                </h4>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>{collectionEfficiency}%</span>
                  <span className="status-badge lunas">{collectionEfficiency >= 80 ? 'Performa Baik' : 'Perlu Tingkatkan'}</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                  Area dengan tunggakan tertinggi adalah <strong>{highestUnpaidArea}</strong>. Area dengan penagihan 100% lunas: <strong>{lowestUnpaidArea}</strong>.
                </p>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', padding: 16 }}>
              <h4 style={{ color: 'var(--accent-amber)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, fontWeight: 700 }}>
                Rekomendasi Operasional
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ background: 'var(--accent-indigo)', color: '#fff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>1</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <strong>Pertahankan Efisiensi Penagihan:</strong> Jaga efisiensi penagihan tetap di atas 80% melalui reminder rutin.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ background: 'var(--accent-indigo)', color: '#fff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>2</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <strong>Monitor Area ({highestUnpaidArea}):</strong> Lakukan koordinasi lapangan di area {highestUnpaidArea} untuk penagihan aktif.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ background: 'var(--accent-indigo)', color: '#fff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>3</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <strong>Evaluasi Peluang Ekspansi:</strong> Tambahkan kapasitas jaringan di area dengan tingkat pembayaran 100% lunas.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* A4 PDF Report Template Modal */}
      {showPdfModal && (
        <PdfReportTemplate
          data={data}
          selectedMonth={selectedMonth}
          selectedAreas={selectedAreas}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </div>
  );
}

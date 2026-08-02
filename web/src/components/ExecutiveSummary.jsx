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
    detailNarrative = '',
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
            🗓️ Bulan: {selectedMonth === 'ALL' ? 'Semua Bulan' : selectedMonth}
          </span>
          <span className="status-badge proses">
            📍 Lokasi: {selectedAreas.length === 0 ? 'Semua Area' : `${selectedAreas.length} Area (${selectedAreas.join(', ')})`}
          </span>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowPdfModal(true)}
          style={{
            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
            boxShadow: '0 4px 15px rgba(236,72,153,0.3)',
            height: 38,
            fontSize: '0.85rem'
          }}
        >
          📄 Export PDF Summary (A4)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card indigo animate-in stagger-1">
          <span className="kpi-icon">👥</span>
          <div className="kpi-label">Total Pelanggan</div>
          <div className="kpi-value">{formatNum(totalCustomers)}</div>
          <div className="kpi-sub">ARPU: {formatRupiah(arpu)}/plg</div>
        </div>

        <div className="kpi-card emerald animate-in stagger-2">
          <span className="kpi-icon">💰</span>
          <div className="kpi-label">Total Pembayaran Lunas</div>
          <div className="kpi-value">{formatRupiah(totalRevenuePaid)}</div>
          <div className="kpi-sub">{lunasCount} tagihan lunas</div>
        </div>

        <div className="kpi-card amber animate-in stagger-3">
          <span className="kpi-icon">⏳</span>
          <div className="kpi-label">Total Tunggakan</div>
          <div className="kpi-value">{formatRupiah(totalOutstanding)}</div>
          <div className="kpi-sub">{belumLunasCount + isolirCount} tagihan tertunggak</div>
        </div>

        <div className="kpi-card rose animate-in stagger-4">
          <span className="kpi-icon">📤</span>
          <div className="kpi-label">Total Pengeluaran</div>
          <div className="kpi-value">{formatRupiah(totalExpenses)}</div>
          <div className="kpi-sub">biaya operasional</div>
        </div>

        <div className="kpi-card sky animate-in stagger-5">
          <span className="kpi-icon">📈</span>
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
            <div className="icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-sky)' }}>📉</div>
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
            <div className="icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)' }}>💳</div>
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
            <div className="icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>🗺️</div>
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
          <div className="icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>📊</div>
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
          <div className="icon" style={{ background: 'rgba(167, 139, 250, 0.15)', color: 'var(--accent-purple)' }}>📝</div>
          <div style={{ flex: 1 }}>
            <h3>Analisis Detail & Rekomendasi</h3>
            <p>Penjelasan mendalam tentang performa keuangan</p>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>
            {showNarrative ? '▲' : '▼'}
          </span>
        </div>
        {showNarrative && (
          <div className="narrative-content" style={{ whiteSpace: 'pre-wrap' }}>
            {detailNarrative}
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

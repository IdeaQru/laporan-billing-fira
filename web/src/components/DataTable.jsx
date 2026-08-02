import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const formatRupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

const STATUS_CLASSES = {
  'LUNAS': 'lunas',
  'BELUM LUNAS': 'belum-lunas',
  'ISOLIR': 'isolir',
  'PROSES': 'proses',
};

export default function DataTable({
  areas,
  selectedMonth,
  selectedAreas,
  selectedStatus,
  searchQuery,
  onOpenInputModal,
  onSelectInvoiceForPayment,
  onEditCustomer,
}) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, totalRows: 0, totalPages: 0 });
  const [sortBy, setSortBy] = useState('customer_code');
  const [sortDir, setSortDir] = useState('ASC');
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const result = await api.getReportTable({
        search: searchQuery,
        status: selectedStatus,
        areas: selectedAreas,
        month: selectedMonth,
        sortBy,
        sortDir,
        page,
        limit: 50,
      });
      setData(result.data);
      setPagination(result.pagination);
    } catch (err) {
      console.error('Failed to fetch report:', err);
    }
    setLoading(false);
  }, [searchQuery, selectedStatus, selectedAreas, selectedMonth, sortBy, sortDir]);

  useEffect(() => {
    const debounce = setTimeout(() => fetchData(1), 300);
    return () => clearTimeout(debounce);
  }, [fetchData]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortDir('ASC');
    }
  };

  const handleRowClick = (customer) => {
    setSelectedCustomer(customer);
    setHistoryLoading(true);
    api.getCustomerHistory(customer.customer_code)
      .then((data) => {
        setHistory(data);
        setHistoryLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setHistoryLoading(false);
      });
  };

  const exportUrl = api.getExportUrl({
    search: searchQuery,
    status: selectedStatus,
    areas: selectedAreas,
    month: selectedMonth,
  });

  const dashboardExportUrl = api.getDashboardTemplateExportUrl({
    search: searchQuery,
    status: selectedStatus,
    areas: selectedAreas,
    month: selectedMonth,
  });

  return (
    <div className="tab-pane active" style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Menampilkan data periode: <strong style={{ color: 'var(--accent-cyan)' }}>{selectedMonth}</strong> ({pagination.totalRows} tagihan)
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => onOpenInputModal('customer')}>
            + Tambah Pelanggan
          </button>
          <a
            href={dashboardExportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: '0.85rem' }}
            title="Export Excel sesuai format template dashboard source"
          >
            📊 Export Dashboard (.xlsx)
          </a>
          <a
            href={exportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: '0.85rem' }}
            title="Export Excel format standar"
          >
             Export Standard (.xlsx)
          </a>
        </div>
      </div>


      {/* Streamlined Desktop Table */}
      <div className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th onClick={() => handleSort('customer_code')} style={{ cursor: 'pointer' }}>
                  ID {sortBy === 'customer_code' ? (sortDir === 'ASC' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                  Nama Pelanggan {sortBy === 'name' ? (sortDir === 'ASC' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('area_name')} style={{ cursor: 'pointer' }}>
                  Area {sortBy === 'area_name' ? (sortDir === 'ASC' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('amount')} style={{ cursor: 'pointer' }}>
                  Tagihan {sortBy === 'amount' ? (sortDir === 'ASC' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                  Status {sortBy === 'status' ? (sortDir === 'ASC' ? '↑' : '↓') : ''}
                </th>
                <th>Channel / Pembayaran</th>
                <th>Keterangan</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 30 }}>
                    <div className="loading-spinner" style={{ margin: '0 auto' }} />
                    <p className="loading-text" style={{ marginTop: 12 }}>Memuat data tagihan...</p>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      <div className="empty-icon">📭</div>
                      <p>Tidak ada data tagihan yang cocok dengan filter</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => {
                  const paidChannels = [];
                  if (row.cash_paid > 0) paidChannels.push(`CASH (${formatRupiah(row.cash_paid)})`);
                  if (row.bca_paid > 0) paidChannels.push(`BCA (${formatRupiah(row.bca_paid)})`);
                  if (row.bri_paid > 0) paidChannels.push(`BRI (${formatRupiah(row.bri_paid)})`);
                  if (row.mandiri_paid > 0) paidChannels.push(`MANDIRI (${formatRupiah(row.mandiri_paid)})`);
                  if (row.bni_paid > 0) paidChannels.push(`BNI (${formatRupiah(row.bni_paid)})`);

                  return (
                    <tr key={`${row.customer_code}-${row.billing_period}`}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {(pagination.page - 1) * pagination.limit + idx + 1}
                      </td>
                      <td>
                        <strong style={{ color: 'var(--accent-cyan)', cursor: 'pointer' }} onClick={() => handleRowClick(row)}>
                          {row.customer_code}
                        </strong>
                      </td>
                      <td style={{ fontWeight: 500, cursor: 'pointer' }} onClick={() => handleRowClick(row)}>
                        {row.name}
                      </td>
                      <td><span className="badge badge-area">{row.area_name}</span></td>
                      <td><strong>{formatRupiah(row.amount)}</strong></td>
                      <td>
                        <span className={`status-pill ${STATUS_CLASSES[row.status] || ''}`}>
                          {row.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {paidChannels.length > 0 ? (
                          <span style={{ color: 'var(--accent-emerald)', fontWeight: 500 }}>
                            ✓ {paidChannels.join(', ')}
                          </span>
                        ) : row.unpaid_amount > 0 ? (
                          <span style={{ color: 'var(--accent-rose)' }}>
                            Tunggakan: {formatRupiah(row.unpaid_amount)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {row.keterangan || '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          {row.status !== 'LUNAS' && (
                            <button
                              className="btn btn-primary"
                              style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                              onClick={() => onSelectInvoiceForPayment && onSelectInvoiceForPayment(row)}
                            >
                              💳 Bayar
                            </button>
                          )}
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                            onClick={() => handleRowClick(row)}
                          >
                            👁️ Detail
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination-container" style={{ marginTop: 20 }}>
          <button
            className="btn btn-secondary"
            disabled={pagination.page <= 1}
            onClick={() => fetchData(pagination.page - 1)}
          >
            ← Sebelumnya
          </button>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Halaman {pagination.page} dari {pagination.totalPages}
          </span>
          <button
            className="btn btn-secondary"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchData(pagination.page + 1)}
          >
            Selanjutnya →
          </button>
        </div>
      )}

      {/* Detail History Modal */}
      {selectedCustomer && (
        <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h2>📋 Detail & Riwayat Tagihan Pelanggan</h2>
              <button className="modal-close-btn" onClick={() => setSelectedCustomer(null)}>✕</button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Kode ID:</span> <strong>{selectedCustomer.customer_code}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Nama:</span> <strong>{selectedCustomer.name}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Area:</span> {selectedCustomer.area_name}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Paket:</span> {selectedCustomer.package_name || '-'} ({formatRupiah(selectedCustomer.package_price)})</div>
              </div>
            </div>

            <h3>📅 Riwayat Status Per Bulan</h3>
            {historyLoading ? (
              <div className="loading-container">
                <div className="loading-spinner" />
              </div>
            ) : history.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Belum ada catatan riwayat bulanan.</p>
            ) : (
              <div className="table-responsive" style={{ maxHeight: 280 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Bulan / Periode</th>
                      <th>Status / Keterangan</th>
                      <th>Sumber Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i}>
                        <td><strong>{h.month_year}</strong></td>
                        <td>{h.status_text}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{h.source_sheet}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              {selectedCustomer.status !== 'LUNAS' && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const inv = selectedCustomer;
                    setSelectedCustomer(null);
                    if (onSelectInvoiceForPayment) onSelectInvoiceForPayment(inv);
                  }}
                >
                  💳 Catat Pembayaran Sekarang
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setSelectedCustomer(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

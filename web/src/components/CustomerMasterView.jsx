import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import EditCustomerModal from './EditCustomerModal';

const formatRupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

export default function CustomerMasterView({ areas, packages, onOpenInputModal, onDataChange }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalRows: 0 });
  const [editingCustomer, setEditingCustomer] = useState(null);

  const fetchCustomers = useCallback(() => {
    setLoading(true);
    api.getCustomers({ search, areaId: selectedAreaId, page, limit: 50 })
      .then((res) => {
        setCustomers(res.data);
        setPagination(res.pagination);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [search, selectedAreaId, page]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleEditSuccess = (msg) => {
    fetchCustomers();
    if (onDataChange) onDataChange(msg);
  };

  return (
    <div className="tab-pane active" style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Top Action & Search Bar */}
      <div className="glass-panel" style={{ padding: 20, marginBottom: 24, display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1, flexWrap: 'wrap', minWidth: 280 }}>
          <div className="filter-group" style={{ flex: '1 1 260px', margin: 0 }}>
            <label className="filter-label">🔍 Cari Pelanggan</label>
            <div className="search-wrapper">
              <input
                type="text"
                className="search-input"
                placeholder="Cari Kode ID atau Nama..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>

          <div className="filter-group" style={{ flex: '1 1 200px', margin: 0 }}>
            <label className="filter-label">🗺️ Wilayah / Area</label>
            <select
              className="form-select"
              value={selectedAreaId}
              onChange={(e) => { setSelectedAreaId(e.target.value); setPage(1); }}
            >
              <option value="">Semua Wilayah ({areas.length} Area)</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {(search || selectedAreaId) && (
            <button
              className="btn btn-secondary text-btn danger"
              onClick={() => { setSearch(''); setSelectedAreaId(''); setPage(1); }}
              style={{ height: 42, alignSelf: 'flex-end' }}
            >
              Reset Filter
            </button>
          )}
        </div>

        <button className="btn btn-primary" onClick={() => onOpenInputModal('customer')} style={{ height: 42 }}>
          ➕ Tambah Pelanggan Baru
        </button>
      </div>

      {/* Customer Count Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Menampilkan {pagination.totalRows} pelanggan terdaftar
        </span>
      </div>

      {/* Table / Card List */}
      <div className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <p className="loading-text">Memuat master pelanggan...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="loading-container">
            <div className="empty-icon">👥</div>
            <p>Tidak ada pelanggan yang cocok dengan pencarian.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>ID Pelanggan</th>
                  <th>Nama Pelanggan</th>
                  <th>Wilayah / Area</th>
                  <th>Paket Internet</th>
                  <th>Harga Tarif</th>
                  <th>Status Terkini</th>
                  <th style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, idx) => (
                  <tr key={c.id}>
                    <td>{(page - 1) * 50 + idx + 1}</td>
                    <td><strong style={{ color: 'var(--accent-cyan)' }}>{c.customer_code}</strong></td>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td><span className="badge badge-area">{c.area_name}</span></td>
                    <td>{c.package_name || '-'}</td>
                    <td><strong>{formatRupiah(c.package_price)}</strong></td>
                    <td>
                      <span className={`status-pill ${c.latest_status === 'LUNAS' ? 'lunas' : 'belum-lunas'}`}>
                        {c.latest_status || 'BELUM LUNAS'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setEditingCustomer(c)}
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination-container" style={{ marginTop: 20 }}>
          <button
            className="btn btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            ← Sebelumnya
          </button>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Halaman {page} dari {pagination.totalPages}
          </span>
          <button
            className="btn btn-secondary"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Selanjutnya →
          </button>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <EditCustomerModal
          customer={editingCustomer}
          areas={areas}
          packages={packages}
          onClose={() => setEditingCustomer(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}

import { useState } from 'react';
import { api } from '../services/api';

export default function EditCustomerModal({ customer, areas, packages, onClose, onSuccess }) {
  const [customerCode, setCustomerCode] = useState(customer.customer_code || '');
  const [name, setName] = useState(customer.name || '');
  const [areaId, setAreaId] = useState(customer.area_id || (areas[0]?.id || ''));
  const [packageId, setPackageId] = useState(customer.package_id || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!customerCode.trim() || !name.trim() || !areaId) {
      setError('Kode pelanggan, nama, dan area wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      await api.updateCustomer(customer.id, {
        customerCode: customerCode.trim(),
        name: name.trim(),
        areaId: parseInt(areaId),
        packageId: packageId ? parseInt(packageId) : null,
      });
      onSuccess(`Data pelanggan ${customerCode} berhasil diperbarui!`);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2>✏️ Edit Data Pelanggan</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.3)', marginBottom: 16, fontSize: '0.9rem' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">ID / Kode Pelanggan *</label>
            <input
              type="text"
              className="form-input"
              value={customerCode}
              onChange={(e) => setCustomerCode(e.target.value)}
              placeholder="Misal: BLI-099"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nama Pelanggan *</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama lengkap"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Wilayah / Area *</label>
            <select
              className="form-select"
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              required
            >
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Paket Internet</label>
            <select
              className="form-select"
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
            >
              <option value="">-- Pilih Paket (Opsional) --</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.speed_name} - Rp {Number(p.price).toLocaleString('id-ID')}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

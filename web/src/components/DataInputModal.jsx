import { useState } from 'react';
import { api } from '../services/api';

export default function DataInputModal({ onClose, onSuccess, areas, packages, initialTab = 'customer', preselectedInvoice = null }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form states — Customer
  const [custCode, setCustCode] = useState('');
  const [custName, setCustName] = useState('');
  const [areaId, setAreaId] = useState(areas[0]?.id || '');
  const [pkgId, setPkgId] = useState(packages[0]?.id || '');

  // Form states — Payment
  const [payMethod, setPayMethod] = useState('BRI');
  const [payAmount, setPayAmount] = useState(preselectedInvoice?.amount || 100000);
  const [payNotes, setPayNotes] = useState('');

  // Form states — Expense
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('OPERASIONAL');

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.createCustomer({
        customerCode: custCode,
        name: custName,
        areaId,
        packageId: pkgId,
      });
      onSuccess('Pelanggan berhasil ditambahkan!');
      onClose();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!preselectedInvoice) {
      setError('Pilih pelanggan dari tabel untuk mencatat pembayaran.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.recordPayment(preselectedInvoice.invoice_id, {
        paymentMethod: payMethod,
        amountPaid: Number(payAmount),
        notes: payNotes,
      });
      onSuccess(`Pembayaran untuk ${preselectedInvoice.name} berhasil dicatat!`);
      onClose();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.createExpense({
        expenseDate: expDate,
        description: expDesc,
        amount: Number(expAmount),
        category: expCategory,
      });
      onSuccess('Pengeluaran berhasil dicatat!');
      onClose();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        {/* Header */}
        <div className="modal-header">
          <h2>✏️ Entri Data Baru</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Sub Navigation */}
        <div className="tab-nav" style={{ marginBottom: 24, width: '100%' }}>
          <button
            className={`tab-btn ${activeTab === 'customer' ? 'active' : ''}`}
            onClick={() => setActiveTab('customer')}
          >
            👤 Tambah Pelanggan
          </button>
          <button
            className={`tab-btn ${activeTab === 'payment' ? 'active' : ''}`}
            onClick={() => setActiveTab('payment')}
          >
            💳 Catat Bayar
          </button>
          <button
            className={`tab-btn ${activeTab === 'expense' ? 'active' : ''}`}
            onClick={() => setActiveTab('expense')}
          >
            📤 Pengeluaran
          </button>
        </div>

        {error && (
          <div style={{
            background: 'var(--accent-rose-glow)',
            color: 'var(--accent-rose)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: 16,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Tab 1: Tambah Pelanggan */}
        {activeTab === 'customer' && (
          <form onSubmit={handleCustomerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                ID Pelanggan (misal: JMB-120) *
              </label>
              <input
                type="text"
                className="search-input"
                style={{ paddingLeft: 14, width: '100%' }}
                placeholder="misal: JMB-120"
                value={custCode}
                onChange={(e) => setCustCode(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Nama Pelanggan *
              </label>
              <input
                type="text"
                className="search-input"
                style={{ paddingLeft: 14, width: '100%' }}
                placeholder="Nama lengkap atau kontak"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Area / Wilayah *
                </label>
                <select
                  className="filter-select"
                  style={{ width: '100%' }}
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  required
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Paket Speed
                </label>
                <select
                  className="filter-select"
                  style={{ width: '100%' }}
                  value={pkgId}
                  onChange={(e) => setPkgId(e.target.value)}
                >
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>{p.speed_name} (Rp {p.price.toLocaleString()})</option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Menyimpan...' : '💾 Simpan Pelanggan'}
            </button>
          </form>
        )}

        {/* Tab 2: Catat Pembayaran */}
        {activeTab === 'payment' && (
          <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {preselectedInvoice ? (
              <div style={{
                background: 'rgba(99, 102, 241, 0.1)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
              }}>
                <div style={{ color: 'var(--accent-indigo)', fontWeight: 700 }}>
                  {preselectedInvoice.customer_code} — {preselectedInvoice.name}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
                  Area: {preselectedInvoice.area_name} • Tagihan: Rp {Number(preselectedInvoice.amount).toLocaleString('id-ID')}
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--accent-amber)', fontSize: '0.85rem' }}>
                💡 Petunjuk: Klik baris pelanggan pada tabel untuk mencatat pembayaran secara spesifik.
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Metode Pembayaran *
              </label>
              <select
                className="filter-select"
                style={{ width: '100%' }}
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
              >
                <option value="BRI">BRI</option>
                <option value="BCA">BCA</option>
                <option value="MANDIRI">MANDIRI</option>
                <option value="BNI">BNI</option>
                <option value="CASH">CASH (Tunai)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Jumlah Terbayar (Rp) *
              </label>
              <input
                type="number"
                className="search-input"
                style={{ paddingLeft: 14, width: '100%', fontFamily: 'var(--font-mono)' }}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Catatan / Bukti TF
              </label>
              <input
                type="text"
                className="search-input"
                style={{ paddingLeft: 14, width: '100%' }}
                placeholder="misal: Lunas via TF Hadi"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-export"
              disabled={loading || !preselectedInvoice}
              style={{ marginTop: 8 }}
            >
              {loading ? 'Menyimpan...' : '✅ Catat Pembayaran Lunas'}
            </button>
          </form>
        )}

        {/* Tab 3: Tambah Pengeluaran */}
        {activeTab === 'expense' && (
          <form onSubmit={handleExpenseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Tanggal Transaksi *
              </label>
              <input
                type="date"
                className="search-input"
                style={{ paddingLeft: 14, width: '100%' }}
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Uraian Pengeluaran *
              </label>
              <input
                type="text"
                className="search-input"
                style={{ paddingLeft: 14, width: '100%' }}
                placeholder="misal: Mas Fany fee kolektor"
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Nominal (Rp) *
                </label>
                <input
                  type="number"
                  className="search-input"
                  style={{ paddingLeft: 14, width: '100%', fontFamily: 'var(--font-mono)' }}
                  placeholder="250000"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Kategori
                </label>
                <select
                  className="filter-select"
                  style={{ width: '100%' }}
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                >
                  <option value="FEE">FEE (Fee Kolektor/Teknisi)</option>
                  <option value="OPERASIONAL">OPERASIONAL (BBM/Bahan)</option>
                  <option value="PERALATAN">PERALATAN (Router/Kabel)</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Menyimpan...' : '💸 Simpan Pengeluaran'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

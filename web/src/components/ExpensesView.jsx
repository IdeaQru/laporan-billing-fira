import { useState, useEffect } from 'react';
import { api } from '../services/api';

const formatRupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

export default function ExpensesView({ onOpenInputModal }) {
  const [expenses, setExpenses] = useState({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);

  const fetchExpenses = () => {
    setLoading(true);
    api.getExpenses()
      .then(setExpenses)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p className="loading-text">Memuat data pengeluaran...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Top action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Catatan Pengeluaran Operasional</h3>
        <button className="btn btn-primary" onClick={() => onOpenInputModal('expense')}>
          ➕ Catat Pengeluaran
        </button>
      </div>

      {/* Summary Cards */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card rose animate-in">
          <span className="kpi-icon">📤</span>
          <div className="kpi-label">Total Pengeluaran</div>
          <div className="kpi-value">{formatRupiah(expenses.total)}</div>
          <div className="kpi-sub">{expenses.data.length} transaksi</div>
        </div>
        <div className="kpi-card amber animate-in stagger-1">
          <span className="kpi-icon">🏷️</span>
          <div className="kpi-label">Kategori</div>
          <div className="kpi-value" style={{ fontSize: '1.2rem' }}>
            {[...new Set(expenses.data.map(e => e.category))].join(', ') || '-'}
          </div>
          <div className="kpi-sub">kategori pengeluaran</div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="data-table-wrapper">
          <table className="expenses-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Uraian</th>
                <th>Kategori</th>
                <th style={{ textAlign: 'right' }}>Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {expenses.data.map((exp, idx) => (
                <tr key={exp.id}>
                  <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{exp.expense_date}</td>
                  <td>{exp.description}</td>
                  <td>
                    <span className={`status-badge ${exp.category === 'FEE' ? 'proses' : 'belum-lunas'}`}>
                      {exp.category}
                    </span>
                  </td>
                  <td className="col-money" style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {formatRupiah(exp.amount)}
                  </td>
                </tr>
              ))}
              <tr className="total-row">
                <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>TOTAL</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent-rose)' }}>
                  {formatRupiah(expenses.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

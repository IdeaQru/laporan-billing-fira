import { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import LoginPage from './components/LoginPage';
import GlobalFilterBar from './components/GlobalFilterBar';
import ExecutiveSummary from './components/ExecutiveSummary';
import DataTable from './components/DataTable';
import CustomerMasterView from './components/CustomerMasterView';
import ExpensesView from './components/ExpensesView';
import DataInputModal from './components/DataInputModal';
import MobileNavigation from './components/MobileNavigation';

// ── Auth helpers ──────────────────────────────────────────────
function getStoredSession() {
  const token = localStorage.getItem('wifi_token');
  const username = localStorage.getItem('wifi_user');
  return token && username ? { token, username } : null;
}

export default function App() {
  const [session, setSession] = useState(getStoredSession());
  const [verifying, setVerifying] = useState(!!getStoredSession());

  // Verify stored token on mount
  useEffect(() => {
    if (!session) return;
    api.verifyToken()
      .then(() => setVerifying(false))
      .catch(() => {
        localStorage.removeItem('wifi_token');
        localStorage.removeItem('wifi_user');
        setSession(null);
        setVerifying(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoginSuccess = (result) => {
    setSession({ token: result.token, username: result.username });
  };

  const handleLogout = () => {
    localStorage.removeItem('wifi_token');
    localStorage.removeItem('wifi_user');
    setSession(null);
  };

  // Show spinner while verifying token
  if (verifying) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0b14', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#64748b', fontSize: '0.875rem', fontFamily: 'Inter, sans-serif' }}>Memuat sesi...</p>
      </div>
    );
  }

  // Show login if not authenticated
  if (!session) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // ── Main Dashboard ──────────────────────────────────────────
  return <Dashboard session={session} onLogout={handleLogout} />;
}

function Dashboard({ session, onLogout }) {
  const [activeTab, setActiveTab] = useState('summary');
  const [summary, setSummary] = useState(null);
  const [areas, setAreas] = useState([]);
  const [packages, setPackages] = useState([]);
  const [months, setMonths] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState('2026-07');
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [showInputModal, setShowInputModal] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState('customer');
  const [preselectedInvoice, setPreselectedInvoice] = useState(null);

  useEffect(() => {
    Promise.all([api.getMonths(), api.getAreas(), api.getPackages()])
      .then(([monthsData, areasData, pkgsData]) => {
        setMonths(monthsData);
        setAreas(areasData);
        setPackages(pkgsData);
      })
      .catch(console.error);
  }, []);

  const fetchSummary = useCallback(() => {
    setLoading(true);
    api.getDashboardSummary({ month: selectedMonth, areas: selectedAreas, status: selectedStatus })
      .then((data) => { setSummary(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [selectedMonth, selectedAreas, selectedStatus]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const handleResetFilters = () => {
    setSelectedMonth('2026-07');
    setSelectedAreas([]);
    setSelectedStatus('');
    setSearchQuery('');
  };

  const handleOpenInputModal = (tab = 'customer', inv = null) => {
    setModalInitialTab(tab);
    setPreselectedInvoice(inv);
    setShowInputModal(true);
  };

  const handleDataSuccess = (message) => {
    setToast(message);
    fetchSummary();
    setTimeout(() => setToast(null), 4000);
  };

  if (error) {
    return (
      <div className="app-container">
        <div className="loading-container">
          <div className="empty-icon">⚠️</div>
          <p style={{ color: 'var(--accent-rose)', fontSize: '1rem' }}>Gagal memuat data: {error}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Pastikan server API sudah berjalan di localhost:3001</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ paddingBottom: 80 }}>
      {/* Toast */}
      {toast && <div className="toast-notification">✅ {toast}</div>}

      {/* Header */}
      <header className="app-header">
        <h1>📡 Dashboard Laporan WiFi Billing</h1>
        <p>Analisis Per Bulan • Master Pelanggan • Filter Multi-Lokasi • Entri Data Web</p>
        {/* User badge + logout */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 12 }}>
          <span style={{ fontSize: '0.8rem', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 99, padding: '4px 14px', color: '#a5b4fc' }}>
            👤 {session.username}
          </span>
          <button
            onClick={onLogout}
            style={{ fontSize: '0.75rem', background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 99, padding: '4px 14px', color: '#fb7185', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            🚪 Keluar
          </button>
        </div>
      </header>

      {/* Global Filter Bar */}
      <GlobalFilterBar
        months={months}
        areas={areas}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedAreas={selectedAreas}
        setSelectedAreas={setSelectedAreas}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onResetFilters={handleResetFilters}
      />

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <nav className="tab-nav" style={{ margin: 0 }} role="tablist">
          {[
            { id: 'summary', label: '📊 Executive Summary' },
            { id: 'table', label: '📋 Laporan Tagihan' },
            { id: 'customers', label: '👥 Master Pelanggan' },
            { id: 'expenses', label: '📤 Pengeluaran' },
          ].map((t) => (
            <button
              key={t.id}
              className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
              role="tab"
            >
              {t.label}
            </button>
          ))}
        </nav>
        <button className="btn btn-primary" onClick={() => handleOpenInputModal('customer')} style={{ height: 42 }}>
          ✏️ Entri Data Baru
        </button>
      </div>

      {/* Content */}
      {loading && !summary ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p className="loading-text">Memuat data dari database...</p>
        </div>
      ) : (
        <>
          {activeTab === 'summary' && summary && (
            <ExecutiveSummary data={summary} selectedMonth={selectedMonth} selectedAreas={selectedAreas} />
          )}
          {activeTab === 'table' && (
            <DataTable
              areas={areas}
              selectedMonth={selectedMonth}
              selectedAreas={selectedAreas}
              selectedStatus={selectedStatus}
              searchQuery={searchQuery}
              onOpenInputModal={handleOpenInputModal}
              onSelectInvoiceForPayment={(inv) => handleOpenInputModal('payment', inv)}
            />
          )}
          {activeTab === 'customers' && (
            <CustomerMasterView areas={areas} packages={packages} onOpenInputModal={handleOpenInputModal} onDataChange={handleDataSuccess} />
          )}
          {activeTab === 'expenses' && (
            <ExpensesView onOpenInputModal={handleOpenInputModal} />
          )}
        </>
      )}

      {/* Input Modal */}
      {showInputModal && (
        <DataInputModal
          onClose={() => setShowInputModal(false)}
          onSuccess={handleDataSuccess}
          areas={areas}
          packages={packages}
          initialTab={modalInitialTab}
          preselectedInvoice={preselectedInvoice}
        />
      )}

      {/* Mobile Nav */}
      <MobileNavigation activeTab={activeTab} setActiveTab={setActiveTab} onOpenInputModal={() => handleOpenInputModal('customer')} />
    </div>
  );
}

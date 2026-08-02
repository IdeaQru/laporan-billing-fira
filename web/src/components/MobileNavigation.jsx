export default function MobileNavigation({ activeTab, setActiveTab, onOpenInputModal }) {
  return (
    <nav className="mobile-nav" aria-label="Navigasi Mobile">
      <button
        className={`mobile-nav-btn ${activeTab === 'summary' ? 'active' : ''}`}
        onClick={() => setActiveTab('summary')}
      >
        <span className="icon">📊</span>
        <span className="label">Summary</span>
      </button>

      <button
        className={`mobile-nav-btn ${activeTab === 'table' ? 'active' : ''}`}
        onClick={() => setActiveTab('table')}
      >
        <span className="icon">📋</span>
        <span className="label">Tagihan</span>
      </button>

      <button
        className="mobile-nav-btn fab"
        onClick={onOpenInputModal}
        aria-label="Tambah Data"
      >
        <span className="icon">➕</span>
      </button>

      <button
        className={`mobile-nav-btn ${activeTab === 'customers' ? 'active' : ''}`}
        onClick={() => setActiveTab('customers')}
      >
        <span className="icon">👥</span>
        <span className="label">Pelanggan</span>
      </button>

      <button
        className={`mobile-nav-btn ${activeTab === 'expenses' ? 'active' : ''}`}
        onClick={() => setActiveTab('expenses')}
      >
        <span className="icon">📤</span>
        <span className="label">Pengeluaran</span>
      </button>
    </nav>
  );
}

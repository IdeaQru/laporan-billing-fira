import { useState, useRef } from 'react';
import { api } from '../services/api';

export default function ExcelEngineView({ onDataUpdated }) {
  const [file, setFile] = useState(null);
  const [inspecting, setInspecting] = useState(false);
  const [inspectionResult, setInspectionResult] = useState(null);
  const [error, setError] = useState(null);

  const [strategy, setStrategy] = useState('FULL_REBUILD');
  const [targetPeriod, setTargetPeriod] = useState('');

  const [executing, setExecuting] = useState(false);
  const [executionStep, setExecutionStep] = useState(0); // 0: Idle, 1: Uploading, 2: Parsing & Validating, 3: SQLite Transaction, 4: Regenerating Dashboard, 5: Done
  const [executionResult, setExecutionResult] = useState(null);

  const [previewSearch, setPreviewSearch] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  // ── Handle File Selection & Auto-Inspect ──
  const handleFile = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setError(null);
    setExecutionResult(null);
    setInspecting(true);

    try {
      const inspectData = await api.inspectExcel(selectedFile);
      setInspectionResult(inspectData);
      if (inspectData.periods && inspectData.periods.length > 0) {
        setTargetPeriod(inspectData.periods[inspectData.periods.length - 1]);
      }
    } catch (err) {
      setError(`Gagal menganalisis file: ${err.message}`);
      setInspectionResult(null);
    } finally {
      setInspecting(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFile(droppedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  // ── Execute Database Update ──
  const handleExecuteUpdate = async () => {
    if (!file || executing) return;
    setExecuting(true);
    setError(null);
    setExecutionStep(1);

    try {
      // Step 1 -> 2: Uploading & Parsing
      setTimeout(() => setExecutionStep(2), 300);
      setTimeout(() => setExecutionStep(3), 700);

      const result = await api.executeExcelUpdate(file, {
        strategy,
        targetPeriod: strategy === 'PERIOD_UPDATE' ? targetPeriod : '',
      });

      setExecutionStep(4);
      setTimeout(() => {
        setExecutionStep(5);
        setExecutionResult(result);
        setExecuting(false);
        if (onDataUpdated) {
          onDataUpdated(`✅ Database berhasil diperbarui via ${strategy === 'FULL_REBUILD' ? 'Full Rebuild' : 'Incremental Merge'}!`);
        }
      }, 500);
    } catch (err) {
      setError(`Gagal mengeksekusi pembaruan database: ${err.message}`);
      setExecuting(false);
      setExecutionStep(0);
    }
  };

  // ── Reset Current File ──
  const handleReset = () => {
    setFile(null);
    setInspectionResult(null);
    setExecutionResult(null);
    setError(null);
    setExecutionStep(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatCurrency = (val) => `Rp ${(val || 0).toLocaleString('id-ID')}`;

  const filteredPreviewRows = (inspectionResult?.analysis?.samplePreviewRows || []).filter((r) => {
    if (!previewSearch) return true;
    const q = previewSearch.toLowerCase();
    return (
      (r.customerCode || '').toLowerCase().includes(q) ||
      (r.customerName || '').toLowerCase().includes(q) ||
      (r.areaName || '').toLowerCase().includes(q) ||
      (r.status || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner & Quick Actions */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: '1.4rem' }}>⚡</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Excel Processing Engine & Database Sync Studio
              </h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
              Parsing cerdas multi-format Excel, inspeksi pre-flight dry-run, dan pembaruan database atomik dengan transaksi SQLite.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <a
              href={api.getTemplateDownloadUrl('multi-sheet')}
              target="_blank"
              rel="noopener noreferrer"
              className="engine-action-btn"
              title="Unduh template Excel multi-sheet per wilayah"
            >
              📥 Template Area (Multi-Sheet)
            </a>
            <a
              href={api.getTemplateDownloadUrl('single-sheet')}
              target="_blank"
              rel="noopener noreferrer"
              className="engine-action-btn"
              title="Unduh template Excel rekap tagihan 1 sheet"
            >
              📥 Template Rekap (1-Sheet)
            </a>
            <a
              href={api.getBackupDownloadUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="engine-action-btn secondary"
              title="Unduh snapshot cadangan database SQLite saat ini"
            >
              💾 Backup SQLite (.db)
            </a>
            <a
              href={api.getFullDashboardDownloadUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="engine-action-btn accent"
              title="Unduh dashboard 6-sheet lengkap"
            >
              📊 Export Dashboard.xlsx
            </a>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            color: '#fb7185',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: '0.9rem',
          }}
        >
          <span>⚠️</span>
          <div style={{ flex: 1 }}>{error}</div>
          <button
            onClick={() => setError(null)}
            style={{ background: 'transparent', border: 'none', color: '#fb7185', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Execution Success Banner */}
      {executionResult && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.2), rgba(16, 185, 129, 0.1))',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            boxShadow: '0 8px 30px rgba(16, 185, 129, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: '1.6rem' }}>🎉</span>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#34d399', margin: 0 }}>
                Pembaruan Database Berhasil Disinkronkan!
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                Strategi: <strong style={{ color: '#fff' }}>{executionResult.strategy}</strong> • Format File: {executionResult.format}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div className="engine-stat-mini">
              <span className="label">Pelanggan Diproses</span>
              <span className="value">{executionResult.auditMetrics?.insertedCustomers || executionResult.auditMetrics?.updatedCustomers || 0}</span>
            </div>
            <div className="engine-stat-mini">
              <span className="label">Tagihan Diperbarui</span>
              <span className="value">{executionResult.auditMetrics?.insertedInvoices || executionResult.auditMetrics?.updatedInvoices || 0}</span>
            </div>
            <div className="engine-stat-mini">
              <span className="label">Pembayaran Masuk</span>
              <span className="value">{executionResult.auditMetrics?.insertedPayments || executionResult.auditMetrics?.updatedPayments || 0}</span>
            </div>
            <div className="engine-stat-mini">
              <span className="label">Periode Bulan</span>
              <span className="value">{executionResult.auditMetrics?.periodsCount || 0} Periode</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a
              href={api.getFullDashboardDownloadUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-export"
              style={{ fontSize: '0.85rem', textDecoration: 'none' }}
            >
              📥 Unduh dashboard.xlsx Hasil Sinkronisasi
            </a>
            <button className="btn btn-primary" onClick={handleReset} style={{ fontSize: '0.85rem' }}>
              📁 Unggah Berkas Lain
            </button>
          </div>
        </div>
      )}

      {/* Main Upload Dropzone (When no file or ready to upload) */}
      {!executionResult && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`excel-dropzone ${isDragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
          onClick={() => {
            if (!file && fileInputRef.current) fileInputRef.current.click();
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".xls,.xlsx,.xlsm,.csv"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0]);
            }}
          />

          {!file ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>📂</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                Tarik & Lepaskan Berkas Excel di Sini
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: 460, margin: '0 auto 16px' }}>
                Mendukung format multi-sheet area matrix (<code style={{ color: 'var(--accent-indigo)' }}>.xls / .xlsx</code>), single-sheet rekap tagihan, maupun format master pelanggan.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  if (fileInputRef.current) fileInputRef.current.click();
                }}
              >
                Pilih Berkas dari Komputer
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                  📊
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{file.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Ukuran: {(file.size / 1024).toFixed(1)} KB • Tipe: {file.name.split('.').pop()?.toUpperCase()}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {inspecting ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-sky)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 14, height: 14, border: '2px solid var(--accent-sky)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                    Menganalisis berkas...
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                    style={{
                      background: 'rgba(244,63,94,0.12)',
                      border: '1px solid rgba(244,63,94,0.25)',
                      color: '#fb7185',
                      padding: '6px 14px',
                      borderRadius: 8,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Ganti Berkas ✕
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pre-Flight Inspection & Strategy Configuration Panel */}
      {inspectionResult && !executionResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Strategy Selection Cards */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div className="glass-card-header" style={{ marginBottom: 16 }}>
              <div className="icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)' }}>
                🎯
              </div>
              <div>
                <h3 style={{ margin: 0 }}>Pilih Strategi Pembaruan Database</h3>
                <p style={{ margin: 0 }}>Tentukan bagaimana data dari Excel akan diaplikasikan ke database SQLite.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {/* Option 1: Full Rebuild */}
              <div
                className={`strategy-card ${strategy === 'FULL_REBUILD' ? 'active' : ''}`}
                onClick={() => setStrategy('FULL_REBUILD')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '1.2rem' }}>🔄</span>
                  <span className="strategy-pill recommended">Rekomendasi (Fresh Sync)</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                  Full Database Rebuild
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Membuat backup otomatis snapshot DB, me-reset seluruh tabel, dan meng-ingest seluruh data master & riwayat bulan dari berkas Excel secara presisi.
                </p>
              </div>

              {/* Option 2: Incremental Upsert */}
              <div
                className={`strategy-card ${strategy === 'INCREMENTAL_UPSERT' ? 'active' : ''}`}
                onClick={() => setStrategy('INCREMENTAL_UPSERT')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '1.2rem' }}>⚡</span>
                  <span className="strategy-pill">Smart Merge</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                  Incremental Upsert (Merge)
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Menambahkan pelanggan baru dan memperbarui status tagihan hanya pada periode bulan yang ada di file, tanpa menghapus riwayat bulan terdahulu.
                </p>
              </div>

              {/* Option 3: Single Month Target */}
              <div
                className={`strategy-card ${strategy === 'PERIOD_UPDATE' ? 'active' : ''}`}
                onClick={() => setStrategy('PERIOD_UPDATE')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '1.2rem' }}>📅</span>
                  <span className="strategy-pill">Target Periode</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                  Single Month Ingest
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 8px' }}>
                  Hanya memperbarui atau mengimpor tagihan khusus untuk satu bulan tertentu.
                </p>
                {strategy === 'PERIOD_UPDATE' && (
                  <select
                    className="form-select"
                    value={targetPeriod}
                    onChange={(e) => setTargetPeriod(e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '6px 10px', minHeight: 34 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {(inspectionResult.periods || []).map((p) => (
                      <option key={p} value={p}>
                        Periode: {p}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Pre-Flight Inspection Summary & Metrics */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.3rem' }}>🔍</span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Hasil Pemeriksaan Pre-Flight (Dry-Run)</h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="format-badge">
                  Format: {inspectionResult.formatInfo?.format || 'AUTO-DETECTED'}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  ({inspectionResult.sheetNames?.length || 0} Sheets Terbaca)
                </span>
              </div>
            </div>

            {/* KPI Metric Cards from Parsed Data */}
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
              <div className="kpi-card indigo">
                <span className="kpi-label">Total Pelanggan</span>
                <div className="kpi-value">{inspectionResult.analysis?.metrics?.totalCustomers || 0}</div>
                <div className="kpi-sub">{inspectionResult.detectedAreas?.length || 8} Wilayah/Area</div>
              </div>

              <div className="kpi-card emerald">
                <span className="kpi-label">Est. Penerimaan (Lunas)</span>
                <div className="kpi-value" style={{ fontSize: '1.25rem', color: 'var(--accent-emerald)' }}>
                  {formatCurrency(inspectionResult.analysis?.metrics?.totalRevenuePaid)}
                </div>
                <div className="kpi-sub">{inspectionResult.analysis?.metrics?.lunasCount || 0} Tagihan Lunas</div>
              </div>

              <div className="kpi-card amber">
                <span className="kpi-label">Est. Tunggakan</span>
                <div className="kpi-value" style={{ fontSize: '1.25rem', color: 'var(--accent-amber)' }}>
                  {formatCurrency(inspectionResult.analysis?.metrics?.totalOutstanding)}
                </div>
                <div className="kpi-sub">{inspectionResult.analysis?.metrics?.unpaidCount || 0} Tagihan Belum Lunas</div>
              </div>

              <div className="kpi-card sky">
                <span className="kpi-label">Efisiensi Penagihan</span>
                <div className="kpi-value" style={{ color: 'var(--accent-sky)' }}>
                  {inspectionResult.analysis?.metrics?.collectionRate || 100}%
                </div>
                <div className="kpi-sub">{inspectionResult.periods?.length || 1} Periode Bulan</div>
              </div>
            </div>

            {/* Area & Period Badges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-accent)', textTransform: 'uppercase' }}>
                  Wilayah Ditemukan:
                </span>
                {(inspectionResult.detectedAreas || []).map((a) => (
                  <span key={a.code} className="area-badge-chip">
                    {a.name} ({a.code})
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-accent)', textTransform: 'uppercase' }}>
                  Periode Bulan:
                </span>
                {(inspectionResult.periods || []).map((p) => (
                  <span key={p} className="period-badge-chip">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Warnings Alert (If any) */}
            {inspectionResult.analysis?.warnings?.length > 0 && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  marginBottom: 20,
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--accent-amber)', fontSize: '0.85rem', marginBottom: 6 }}>
                  ⚠️ Catatan & Peringatan Validasi:
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {inspectionResult.analysis.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview Sample Table */}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>
                  Pratinjau Sampel Data Hasil Parsing ({filteredPreviewRows.length} Baris)
                </h4>
                <input
                  type="text"
                  placeholder="Cari nama/kode..."
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 8,
                    color: '#fff',
                    outline: 'none',
                    width: 180,
                  }}
                />
              </div>

              <div className="data-table-wrapper" style={{ maxHeight: 280 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Kode Pelanggan</th>
                      <th>Nama Pelanggan</th>
                      <th>Wilayah</th>
                      <th>Periode</th>
                      <th>Tagihan</th>
                      <th>Status</th>
                      <th>Metode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPreviewRows.slice(0, 15).map((row, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td className="col-code">{row.customerCode}</td>
                        <td className="col-name">{row.customerName}</td>
                        <td>{row.areaName}</td>
                        <td>{row.billingPeriod}</td>
                        <td className="col-money">{formatCurrency(row.amount)}</td>
                        <td>
                          <span
                            className={`status-badge ${
                              row.status === 'LUNAS'
                                ? 'lunas'
                                : row.status === 'FREE'
                                ? 'proses'
                                : row.status === 'ISOLIR'
                                ? 'isolir'
                                : 'belum-lunas'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td>{row.paymentMethod || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Execution Actions & Progress Steps */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-glass)' }}>
              {executing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-indigo)' }}>
                      {executionStep === 1 && '1/4: Mengunggah berkas Excel ke server...'}
                      {executionStep === 2 && '2/4: Memvalidasi & menguraikan skema data...'}
                      {executionStep === 3 && '3/4: Menjalankan transaksi SQLite atomik & snapshot backup...'}
                      {executionStep === 4 && '4/4: Membuat ulang dashboard.xlsx 6-sheet...'}
                      {executionStep === 5 && 'Selesai!'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mohon jangan menutup halaman</span>
                  </div>

                  <div className="progress-bar-track">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${executionStep === 1 ? 25 : executionStep === 2 ? 50 : executionStep === 3 ? 75 : 100}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <button type="button" onClick={handleReset} className="btn btn-reset" style={{ fontSize: '0.875rem' }}>
                    ✕ Batalkan
                  </button>

                  <button
                    type="button"
                    onClick={handleExecuteUpdate}
                    className="btn btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                      boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                      padding: '12px 28px',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                    }}
                  >
                    🚀 Jalankan Pembaruan Database Sekarang
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

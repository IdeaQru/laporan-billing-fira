import { useState, useRef, useEffect } from 'react';

export default function GlobalFilterBar({
  months = [],
  areas = [],
  selectedMonth,
  setSelectedMonth,
  selectedAreas,
  setSelectedAreas,
  selectedStatus,
  setSelectedStatus,
  searchQuery,
  setSearchQuery,
  onResetFilters,
}) {
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowAreaDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleArea = (areaName) => {
    if (selectedAreas.includes(areaName)) {
      setSelectedAreas(selectedAreas.filter(a => a !== areaName));
    } else {
      setSelectedAreas([...selectedAreas, areaName]);
    }
  };

  const handleSelectAllAreas = () => {
    setSelectedAreas(areas.map(a => a.name));
  };

  const handleClearAreas = () => {
    setSelectedAreas([]);
  };

  const isAllAreasSelected = selectedAreas.length === 0 || selectedAreas.length === areas.length;

  return (
    <div className="global-filter-bar">
      {/* 1. Month Selector */}
      <div className="filter-group">
        <label className="filter-label">Bulan</label>
        <select
          className="filter-select"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          id="global-month-select"
        >
          <option value="ALL">Semua Bulan (Akumulasi)</option>
          {months.map((m) => (
            <option key={m.code} value={m.code}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Multi-Select Location/Area Dropdown */}
      <div className="filter-group" ref={dropdownRef} style={{ position: 'relative' }}>
        <label className="filter-label">Lokasi / Area</label>
        <button
          type="button"
          className="filter-select multi-select-trigger"
          onClick={() => setShowAreaDropdown(!showAreaDropdown)}
          id="global-area-multi-select"
        >
          {isAllAreasSelected
            ? 'Semua Area'
            : selectedAreas.length === 1
            ? selectedAreas[0]
            : `${selectedAreas.length} Area Dipilih`}
          <span style={{ marginLeft: 8, fontSize: '0.7rem' }}>▼</span>
        </button>

        {showAreaDropdown && (
          <div className="multi-select-dropdown">
            <div className="multi-select-header">
              <button type="button" className="text-btn" onClick={handleSelectAllAreas}>
                Pilih Semua
              </button>
              <button type="button" className="text-btn danger" onClick={handleClearAreas}>
                Bersihkan
              </button>
            </div>

            <div className="multi-select-list">
              {areas.map((a) => {
                const checked = selectedAreas.includes(a.name);
                return (
                  <label key={a.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleArea(a.name)}
                    />
                    <span>{a.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Status Selector */}
      <div className="filter-group">
        <label className="filter-label">Status</label>
        <select
          className="filter-select"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          id="global-status-select"
        >
          <option value="">Semua Status</option>
          <option value="LUNAS">Lunas</option>
          <option value="BELUM LUNAS">Belum Lunas</option>
          <option value="ISOLIR">Isolir</option>
          <option value="PROSES">Proses</option>
        </select>
      </div>

      {/* 4. Search Bar */}
      <div className="filter-group search-group">
        <label className="filter-label">Cari</label>
        <div className="search-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="Cari nama atau ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="global-search-input"
          />
        </div>
      </div>

      {/* 5. Reset Button */}
      <div className="filter-group" style={{ justifyContent: 'flex-end' }}>
        <label className="filter-label">&nbsp;</label>
        <button
          type="button"
          className="btn btn-reset"
          onClick={onResetFilters}
          title="Reset semua filter"
          id="global-reset-btn"
        >
          Reset Filter
        </button>
      </div>
    </div>
  );
}

-- ============================================================
-- WiFi Billing Database Schema (Normalized)
-- ============================================================

-- Paket internet yang tersedia
CREATE TABLE IF NOT EXISTS packages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    code        INTEGER NOT NULL UNIQUE,       -- Kode paket (10, 20, 30, ...)
    speed_name  TEXT    NOT NULL,               -- Nama paket (10mbps, 20mbps, ...)
    price       INTEGER NOT NULL               -- Harga dalam Rupiah
);

-- Area / Wilayah pelanggan
CREATE TABLE IF NOT EXISTS areas (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    code        TEXT    NOT NULL UNIQUE,        -- Kode area singkat (BLI, JMB, IDN, TLS, ...)
    name        TEXT    NOT NULL,               -- Nama lengkap area
    source_file TEXT                            -- File sumber data (dashboard.xlsx / laporan juli.xls)
);

-- Data pelanggan
CREATE TABLE IF NOT EXISTS customers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_code   TEXT    NOT NULL UNIQUE,    -- ID unik pelanggan (BLI-001, JMB-001, ...)
    name            TEXT    NOT NULL,
    area_id         INTEGER NOT NULL,
    package_id      INTEGER,
    created_at      TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (area_id)   REFERENCES areas(id),
    FOREIGN KEY (package_id) REFERENCES packages(id)
);

-- Tagihan bulanan pelanggan
CREATE TABLE IF NOT EXISTS invoices (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id     INTEGER NOT NULL,
    billing_period  TEXT    NOT NULL,           -- Format: YYYY-MM (misal 2026-07)
    amount          INTEGER NOT NULL,           -- Nominal tagihan
    status          TEXT    NOT NULL DEFAULT 'BELUM LUNAS',  -- LUNAS / BELUM LUNAS / ISOLIR / PROSES
    unpaid_amount   INTEGER DEFAULT 0,
    unpaid_months   INTEGER DEFAULT 0,
    notes           TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    UNIQUE(customer_id, billing_period)
);

-- Detail pembayaran per tagihan (mendukung multi-channel)
CREATE TABLE IF NOT EXISTS payments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id      INTEGER NOT NULL,
    payment_method  TEXT    NOT NULL,           -- CASH / BCA / BRI / MANDIRI / BNI
    amount_paid     INTEGER NOT NULL,
    payment_date    TEXT,
    notes           TEXT,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- Pengeluaran operasional
CREATE TABLE IF NOT EXISTS expenses (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_date    TEXT    NOT NULL,
    description     TEXT    NOT NULL,
    amount          INTEGER NOT NULL,
    category        TEXT    DEFAULT 'FEE'      -- FEE / OPERASIONAL / LAINNYA
);

-- Riwayat status bulanan pelanggan (dari laporan juli.xls per area sheet)
CREATE TABLE IF NOT EXISTS monthly_status_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id     INTEGER NOT NULL,
    month_year      TEXT    NOT NULL,           -- Format: YYYY-MM
    status_text     TEXT,                       -- LUNAS / BELUM / kosong / tanggal bayar / dll.
    source_sheet    TEXT,                       -- Nama sheet asal
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_customers_area         ON customers(area_id);
CREATE INDEX IF NOT EXISTS idx_customers_package      ON customers(package_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer      ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_period        ON invoices(billing_period);
CREATE INDEX IF NOT EXISTS idx_invoices_status        ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_payments_invoice       ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_method        ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_expenses_date          ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_monthly_status_cust    ON monthly_status_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_monthly_status_month   ON monthly_status_history(month_year);

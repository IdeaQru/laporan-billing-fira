// ============================================================
// API Client — Extended with JWT Auth Support
// ============================================================
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getToken() {
  return localStorage.getItem('wifi_token');
}

/** @param {string} endpoint @param {object} [params] */
async function fetchApi(endpoint, params = {}) {
  const url = new URL(`${API_BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      if (Array.isArray(v)) {
        if (v.length > 0) url.searchParams.set(k, v.join(','));
      } else {
        url.searchParams.set(k, String(v));
      }
    }
  });

  const token = getToken();
  const res = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('wifi_token');
    localStorage.removeItem('wifi_user');
    window.location.reload();
    throw new Error('Session berakhir. Silakan login kembali.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Network error');
  }
  return res.json();
}

/** @param {string} endpoint @param {object} body @param {string} [method] */
async function postApi(endpoint, body, method = 'POST') {
  const token = getToken();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('wifi_token');
    localStorage.removeItem('wifi_user');
    window.location.reload();
    throw new Error('Session berakhir. Silakan login kembali.');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const api = {
  // ── Auth ──
  login: ({ username, password }) =>
    fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Login gagal');
      return data;
    }),

  verifyToken: () => fetchApi('/auth/verify'),

  // ── Dashboard ──
  getMonths: () => fetchApi('/months'),

  getDashboardSummary: ({ month, areas, status } = {}) =>
    fetchApi('/dashboard/summary', { month, areas, status }),

  getHistoricalTrends: () => fetchApi('/dashboard/history-trends'),

  // ── Reports ──
  getReportTable: ({ search, status, areas, month, sortBy, sortDir, page, limit } = {}) =>
    fetchApi('/reports/table', { search, status, areas, month, sortBy, sortDir, page, limit }),

  // ── Customers ──
  getCustomers: ({ search, areaId, page, limit } = {}) =>
    fetchApi('/customers', { search, areaId, page, limit }),

  createCustomer: (data) => postApi('/customers', data),
  updateCustomer: (id, data) => postApi(`/customers/${id}`, data, 'PUT'),
  updateInvoice: (id, data) => postApi(`/invoices/${id}`, data, 'PUT'),

  getCustomerHistory: (code) => fetchApi(`/customers/${code}/history`),

  // ── Payments ──
  recordPayment: (invoiceId, data) => postApi(`/invoices/${invoiceId}/pay`, data),

  // ── Expenses ──
  getExpenses: () => fetchApi('/expenses'),
  createExpense: (data) => postApi('/expenses', data),

  // ── Metadata ──
  getAreas: () => fetchApi('/areas'),
  getPackages: () => fetchApi('/packages'),

  // ── Export ──
  getExportUrl: ({ search, status, areas, month } = {}) => {
    const url = new URL(`${API_BASE}/reports/export/excel`);
    const token = getToken();
    if (search) url.searchParams.set('search', search);
    if (status) url.searchParams.set('status', status);
    if (areas && areas.length > 0) url.searchParams.set('areas', areas.join(','));
    if (month) url.searchParams.set('month', month);
    if (token) url.searchParams.set('token', token);
    return url.toString();
  },
};

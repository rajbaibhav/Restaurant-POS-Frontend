const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Identity ──────────────────────────────────────────────────
// Called on mount to restore role when the user has an existing token (page refresh)
export const fetchCurrentUser = async (token: string) => {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Session expired');
  }
  return res.json(); // Returns { _id, name, role, status }
};

// ── Billing ───────────────────────────────────────────────────
// Returns server-calculated bill totals (prevents display/charge mismatch)
export const fetchRunningBill = async (tableId: number, token: string) => {
  const res = await fetch(`${API_BASE}/tables/${tableId}/bill`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch running bill');
  return res.json(); // Returns { tableId, items[{ name, pricePerItem, quantity, totalPrice }], subtotal, total }
};

// Backend reads { name, pin } — not userId/password/role
export const login = async (name: string, pin: string) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, pin })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Login failed');
  }
  return res.json(); // Returns { _id, name, role, token }
};

export const register = async (name: string, pin: string) => {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, pin })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Registration failed');
  }
  return res.json();
};

export const fetchMenu = async (token) => {
  const res = await fetch(`${API_BASE}/menu`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch menu');
  return res.json();
};

export const fetchTables = async (token) => {
  const res = await fetch(`${API_BASE}/tables`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch tables');
  return res.json();
};

export const updateTableOrder = async (tableId, items, token) => {
  const res = await fetch(`${API_BASE}/tables/${tableId}/order`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ items })
  });
  if (!res.ok) throw new Error('Failed to update table order');
  return res.json();
};

// Backend only needs tableId and paymentMethod — it re-calculates the total securely
export const finalizeTransaction = async (tableId: number, paymentMethod: string, token: string) => {
  const res = await fetch(`${API_BASE}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ tableId, paymentMethod })
  });
  if (!res.ok) throw new Error('Failed to finalize transaction');
  return res.json();
};

// ── Staff Management ─────────────────────────────────────────
export const fetchAllUsers = async (token: string) => {
  const res = await fetch(`${API_BASE}/auth/all-users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
};

export const updateUser = async (id: string, body: Record<string, unknown>, token: string) => {
  const res = await fetch(`${API_BASE}/auth/update/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update user');
  return res.json();
};

export const deleteUser = async (id: string, token: string) => {
  const res = await fetch(`${API_BASE}/auth/delete/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete user');
  return res.json();
};

// ── Menu Management ──────────────────────────────────────────
export const updateMenuItemStatus = async (id: string, status: string, token: string) => {
  const res = await fetch(`${API_BASE}/menu/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update menu item status');
  return res.json();
};

export const addMenuItemApi = async (formData: FormData, token: string) => {
  const res = await fetch(`${API_BASE}/menu`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }, // No Content-Type — browser sets multipart boundary
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to add menu item');
  return res.json();
};

export const fetchTransactions = async (token) => {
  const res = await fetch(`${API_BASE}/transactions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
};

export const changePin = async (newPin: string, confirmNewPin: string, token: string) => {
  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json', 
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ newPin, confirmNewPin })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to change PIN');
  }
  return res.json();
};


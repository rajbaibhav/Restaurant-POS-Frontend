const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface BillRegistryResponse {
  date: string;
  summary: {
    totalRevenue: number;
    totalBills: number;
    totalItemsServed: number;
  };
  transactions: unknown[];
}

export const fetchBillRegistry = async (token: string): Promise<BillRegistryResponse> => {
  const res = await fetch(`${API_BASE}/transactions/registry`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch bill registry');
  }
  return res.json();
};

export const fetchSoldItemsLogs = async (date: string, token: string) => {
  const res = await fetch(`${API_BASE}/reports/logs/${date}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch sold items logs');
  }
  return res.json();
};

export const fetchThirtyDaySummary = async (token: string) => {
  const res = await fetch(`${API_BASE}/reports/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch 30-day summary');
  }
  return res.json();
};

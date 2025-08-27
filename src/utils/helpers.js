
export const fmt = (x) => {
  if (typeof x !== 'number') return x;
  return x.toLocaleString('uz-UZ', { style: 'currency', currency: 'UZS' });
};

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const uid = () => Math.random().toString(36).substr(2, 9);

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('uz-UZ', {
    style: 'currency',
    currency: 'UZS',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('uz-UZ');
};

// Helper function for making authenticated API calls
export const apiCall = async (url, options = {}) => {
  const { getToken } = await import('./storage.js');
  const token = getToken();
  
  if (!token) {
    throw new Error('Token not found');
  }

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  const response = await fetch(`http://localhost:3000${url}`, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'API call failed');
  }

  return data;
};

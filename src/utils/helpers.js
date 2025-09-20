
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

// Timezone utility functions for Uzbekistan (UTC+5)
export const toUzbekistanTime = (date) => {
  const inputDate = new Date(date);
  // Create a new date object that represents the same moment in Uzbekistan timezone
  // We use Intl.DateTimeFormat to properly handle timezone conversion
  const uzbekistanTime = new Date(inputDate.toLocaleString("en-US", {timeZone: "Asia/Tashkent"}));
  return uzbekistanTime;
};

export const formatUzbekistanDate = (date) => {
  const inputDate = new Date(date);
  return inputDate.toLocaleDateString('uz-UZ', {timeZone: 'Asia/Tashkent'});
};

export const formatUzbekistanTime = (date) => {
  const inputDate = new Date(date);
  return inputDate.toLocaleTimeString('uz-UZ', {
    timeZone: 'Asia/Tashkent',
    hour: '2-digit', 
    minute: '2-digit'
  });
};

export const formatUzbekistanDateTime = (date) => {
  const inputDate = new Date(date);
  return {
    date: inputDate.toLocaleDateString('uz-UZ', {timeZone: 'Asia/Tashkent'}),
    time: inputDate.toLocaleTimeString('uz-UZ', {
      timeZone: 'Asia/Tashkent',
      hour: '2-digit', 
      minute: '2-digit'
    })
  };
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

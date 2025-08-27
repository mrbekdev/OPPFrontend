
export const LS_KEYS = {
  items: 'items',
  customers: 'customers',
  rentals: 'rentals',
  settings: 'settings',
  token: 'token',
  user: 'user',
  tokenExpiry: 'tokenExpiry',
};

export const loadLS = (key, def) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : def;
  } catch (e) {
    return def;
  }
};

export const saveLS = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save ${key} to localStorage`, e);
  }
};

// Token management functions
export const saveToken = (token, user) => {
  const expiryTime = Date.now() + (3 * 60 * 60 * 1000); // 3 hours from now
  saveLS(LS_KEYS.token, token);
  saveLS(LS_KEYS.user, user);
  saveLS(LS_KEYS.tokenExpiry, expiryTime);
  // Also save to old format for compatibility
  localStorage.setItem('token', token);
};

export const getToken = () => {
  // First try to get token from new system
  let token = loadLS(LS_KEYS.token, null);
  const expiryTime = loadLS(LS_KEYS.tokenExpiry, 0);
  
  // If no token in new system, try old system
  if (!token) {
    token = localStorage.getItem('token');
    if (token) {
      // Migrate old token to new system
      saveToken(token, null);
      return token;
    }
  }
  
  // Check if token has expired (only for new system)
  if (expiryTime > 0 && Date.now() > expiryTime) {
    clearToken();
    return null;
  }
  
  return token;
};

export const getUser = () => {
  const user = loadLS(LS_KEYS.user, null);
  const expiryTime = loadLS(LS_KEYS.tokenExpiry, 0);
  
  // Check if token has expired
  if (expiryTime > 0 && Date.now() > expiryTime) {
    clearToken();
    return null;
  }
  
  // If no user in new system, check if we have a token and try to get user from it
  if (!user) {
    const token = getToken();
    if (token) {
      // Token exists but no user data, return placeholder
      return null;
    }
  }
  
  return user;
};

export const clearToken = () => {
  localStorage.removeItem(LS_KEYS.token);
  localStorage.removeItem(LS_KEYS.user);
  localStorage.removeItem(LS_KEYS.tokenExpiry);
  // Also clear old token format
  localStorage.removeItem('token');
};

// Check token validity on app start
export const checkTokenValidity = () => {
  const token = getToken();
  if (!token) {
    clearToken();
    return false;
  }
  return true;
};

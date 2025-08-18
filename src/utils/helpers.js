export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
export const fmt = (n) => new Intl.NumberFormat('uz-UZ', { style:'currency', currency:'UZS', maximumFractionDigits:0 }).format(n || 0);
export const today = () => new Date().toISOString().slice(0,10);

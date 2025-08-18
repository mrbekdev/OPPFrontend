export const LS_KEYS = {
  items: "rentalcrm_items_v1",
  customers: "rentalcrm_customers_v1",
  rentals: "rentalcrm_rentals_v1",
  settings: "rentalcrm_settings_v1",
};

export function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveLS(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

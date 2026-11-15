export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const deviceId = () => {
  const key = 'saloon_tablet_device_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = `TAB-${crypto.randomUUID?.().replace(/-/g, '').slice(0, 12).toUpperCase() || Date.now().toString(36).toUpperCase()}`;
  localStorage.setItem(key, id);
  return id;
};

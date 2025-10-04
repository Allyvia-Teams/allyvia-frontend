export const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

export const hhmm = (seconds?: number | null) => {
  if (!seconds && seconds !== 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
};

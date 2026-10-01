export const formatHours = (totalSeconds: number): string => {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

export const employeeInitials = (first: string, last: string): string =>
  `${first.trim().charAt(0)}${last.trim().charAt(0)}`.toUpperCase() || '—';

export const formatLaborCost = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Math.abs(amount) < 100 ? 2 : 0,
    maximumFractionDigits: Math.abs(amount) < 100 ? 2 : 0
  }).format(amount);

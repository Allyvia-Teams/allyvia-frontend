/** Keep unknown bank currencies explicit rather than guessing USD. */
export function bankMoney(value: string | number | null | undefined, currency: string, digits = 2): string {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  const options = { minimumFractionDigits: digits, maximumFractionDigits: digits };
  try {
    return new Intl.NumberFormat('en-US', { ...options, style: 'currency', currency }).format(amount);
  } catch {
    return `${new Intl.NumberFormat('en-US', options).format(amount)} ${currency}`;
  }
}

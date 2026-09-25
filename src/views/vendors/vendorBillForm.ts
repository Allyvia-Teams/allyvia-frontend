const cents = (value: string): number | null => {
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ''] = value.trim().split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(result) && result > 0 ? result : null;
};

export const billAmount = (amounts: string[]): string | null => {
  if (!amounts.length) return null;
  const values = amounts.map(cents);
  if (values.some((value) => value === null)) return null;
  const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  return Number.isSafeInteger(total) ? (total / 100).toFixed(2) : null;
};

const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

export const validateBill = (invoice: string, billDate: string, dueDate: string, amounts: string[]): string | null => {
  if (!invoice.trim()) return 'Enter the vendor invoice number.';
  if (!validDate(billDate) || !validDate(dueDate) || dueDate < billDate) return 'Choose a due date on or after the bill date.';
  if (!billAmount(amounts)) return 'Enter a positive amount with at most two decimal places for each line.';
  return null;
};

export const validatePayment = (amount: string, remaining: string, paidDate: string, today: string): string | null => {
  const value = cents(amount);
  const balance = cents(remaining);
  if (value === null || balance === null || value > balance) return 'Enter a positive amount no greater than the outstanding balance.';
  if (!validDate(paidDate) || paidDate > today) return 'A recorded payment must already have occurred.';
  return null;
};

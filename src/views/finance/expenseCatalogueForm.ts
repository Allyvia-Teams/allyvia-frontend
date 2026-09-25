import type { ExpenseForm } from 'types/expenseCatalogue';
export const treatments = ['operating_expense', 'inventory', 'fixed_asset', 'prepaid', 'deposit', 'liability', 'transfer'];
export function decimalCents(value: string): bigint {
  if (!/^\d{1,13}(\.\d{1,2})?$/.test(value)) throw new Error('Enter a positive amount with at most two decimal places');
  const [whole, part = ''] = value.split('.');
  return BigInt(whole) * BigInt(100) + BigInt(part.padEnd(2, '0'));
}
export function expensePayload(form: ExpenseForm): ExpenseForm {
  if (decimalCents(form.amount) <= BigInt(0)) throw new Error('Amount must be greater than zero');
  if (
    !form.lines.length ||
    form.lines.some((line) => !line.category_id || !treatments.includes(line.treatment) || decimalCents(line.amount) <= BigInt(0))
  )
    throw new Error('Choose categories and positive split amounts');
  if (form.lines.reduce((sum, line) => sum + decimalCents(line.amount), BigInt(0)) !== decimalCents(form.amount))
    throw new Error('Split amounts must equal the total');
  if (!/^[A-Z]{3}$/.test(form.currency)) throw new Error('Enter a three-letter currency code');
  return { ...form, due_date: form.due_date || null };
}
export const expenseGroups = [
  { key: 'inventory', label: 'Inventory' },
  { key: 'labor', label: 'Labor' },
  { key: 'opex', label: 'Operating expenses' },
  { key: 'capex', label: 'Capital expenditure' },
  { key: 'technology', label: 'Technology' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'misc', label: 'Miscellaneous' }
];
export function orderedExpenseGroups<T extends { group?: string }>(rows: T[]): { key: string; label: string; rows: T[] }[] {
  return expenseGroups
    .map((group) => ({ ...group, rows: rows.filter((row) => (row.group || 'misc') === group.key) }))
    .filter((group) => group.rows.length > 0);
}

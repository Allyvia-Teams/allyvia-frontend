export function getTopExpenseName(expense: any, fallbackIndex?: number): string {
  return expense?.expense_name || expense?.category || (fallbackIndex !== undefined ? `Expense ${fallbackIndex + 1}` : 'Expense');
}

import { useQuery } from '@tanstack/react-query';
import FinanceAPI from 'api/finance.api';
import { useSelector } from 'store';
import type { RootState } from 'store';
import { expenseCategoryRows } from './statementsView';

const isoDay = (value?: string | null) => (value ? new Date(value).toISOString().split('T')[0] : '');

/** The page's date window, as the finance thunks read it (see views/finance/index.tsx). */
export function useFinanceWindow() {
  const filters = useSelector((state: RootState) => state.finance.filters);
  const companyId = useSelector((state: RootState) => state.auth.currentRole?.company_id);
  return { companyId, startISO: isoDay(filters.startDate), endISO: isoDay(filters.endDate) };
}

export const EXPENSE_CATEGORIES_KEY = ['finance', 'expense-categories'] as const;

/** Spend per category in the page's window: one request shared by the Statements and Expenses tabs. */
export function useExpenseCategories() {
  const { companyId, startISO, endISO } = useFinanceWindow();
  const query = useQuery({
    queryKey: [...EXPENSE_CATEGORIES_KEY, companyId, startISO, endISO],
    queryFn: () => FinanceAPI.Expense.getCategoryTotals({ companyId: companyId as string, startDate: startISO, endDate: endISO }),
    enabled: !!companyId && !!startISO && !!endISO
  });
  return { query, rows: expenseCategoryRows(query.data) };
}

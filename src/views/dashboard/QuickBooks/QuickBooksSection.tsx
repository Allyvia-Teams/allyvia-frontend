import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// project imports
import { fetcher } from 'utils/axios';
import { Company } from 'types/entities';
import type { FinanceKPIsData } from 'types/finance';
import QBWidget from './QBWidget';
import { setCompanyId } from 'utils/authStorage';
import { EM_DASH } from 'utils/financeFormat';
import { KpiRow } from 'ui-component/frame';
import type { Tone } from 'ui-component/frame';

interface QuickBooksSectionProps {
  kpis: FinanceKPIsData | null | undefined;
  isLoading: boolean;
  isError: boolean;
  /** "Aug 13 – Sep 11, 2026" — the window every ranged figure is measured over. */
  windowLabel: string;
  /** The window's last day, for the as-of figures. */
  endLabel: string;
}

// Whole dollars: the tile is a headline, the P&L carries the cents.
const formatCurrency = (value: number | string | null | undefined, currency: string): string => {
  if (value === null || value === undefined) return EM_DASH;
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(numValue)) return EM_DASH;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(
    numValue
  );
};

// ==============================|| DASHBOARD - KPI ROW ||============================== //
// Design handoff Part 2: four KPI tiles with no card wrapper, read from the
// date-ranged finance KPIs so they follow the page's date picker. This payload
// carries no prior-period comparison, so there are no delta chips; every tile
// states its window or its as-of date instead.

export function QuickBooksSection({ kpis, isLoading, isError, windowLabel, endLabel }: QuickBooksSectionProps) {
  const connectedCompany = (data: Company[]) => {
    const connected = data.filter((d: Company) => d.is_connected_to_quickbooks)[0];
    if (connected) {
      setCompanyId(connected.id);
    }
    return connected;
  };

  const { isError: companyError, error } = useQuery({
    queryKey: ['company'],
    queryFn: () => fetcher('/company/'),
    select: connectedCompany,
    retry: false // Don't retry on 404
  });

  // A 404 just means QuickBooks isn't connected yet; only log other failures.
  useEffect(() => {
    if (companyError && error && (error as any)?.response?.status !== 404) {
      console.error('Error fetching company:', error);
    }
  }, [companyError, error]);

  const currency = kpis?.currency || kpis?.summary?.currency || 'USD';
  const k = kpis?.kpis;
  const unavailable = isError ? 'Could not load' : undefined;

  const profitTone: Tone = k ? (k.net_income < 0 ? 'error' : 'default') : 'default';

  return (
    <KpiRow>
      <QBWidget title="Revenue" isLoading={isLoading} value={formatCurrency(k?.revenue, currency)} basis={unavailable ?? windowLabel} />
      <QBWidget
        title="Net profit"
        isLoading={isLoading}
        value={formatCurrency(k?.net_income, currency)}
        basis={unavailable ?? windowLabel}
        tone={profitTone}
      />
      <QBWidget
        title="Receivables outstanding"
        isLoading={isLoading}
        value={formatCurrency(k?.accounts_receivable_outstanding, currency)}
        basis={unavailable ?? `as of ${endLabel}`}
      />
      <QBWidget
        title="Cash balance"
        isLoading={isLoading}
        value={formatCurrency(k?.cash_balance, currency)}
        // ALL-88 / finance-metrics: an estimate says so instead of posing as a bank figure.
        basis={unavailable ?? (k?.cash_balance_estimated ? `estimated from POS · as of ${endLabel}` : `bank accounts · as of ${endLabel}`)}
      />
    </KpiRow>
  );
}

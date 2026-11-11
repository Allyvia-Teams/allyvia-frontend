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
  /** The window's last day (kept for callers; the POS row has no as-of figures). */
  endLabel?: string;
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

export function QuickBooksSection({ kpis, isLoading, isError, windowLabel }: QuickBooksSectionProps) {
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

  const currency = kpis?.summary?.currency || kpis?.currency || 'USD';
  const k = kpis?.kpis;
  const unavailable = isError ? 'Could not load' : undefined;

  // The dashboard row is POS-only in every mode (bank-connected or not, and
  // while loading), so the owner never sees bank or receivables figures here.
  // Bank activity (cash in/out, balances, classified expenses) and receivables
  // live on Finance & accounting.
  const num = (v: number | string | null | undefined): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const revenueNum = num(k?.revenue);
  const grossNum = num(k?.gross_profit);
  const marginPct = revenueNum && grossNum !== null ? Math.round((grossNum / revenueNum) * 100) : null;
  const count = num(kpis?.summary?.payments_count);
  const grossTone: Tone = grossNum !== null && grossNum < 0 ? 'error' : 'default';

  return (
    <KpiRow>
      <QBWidget
        title="Revenue"
        isLoading={isLoading}
        value={formatCurrency(revenueNum, currency)}
        basis={unavailable ?? `POS sales · ${windowLabel}`}
      />
      <QBWidget
        title="Gross profit"
        isLoading={isLoading}
        value={formatCurrency(grossNum, currency)}
        basis={unavailable ?? (marginPct !== null ? `${marginPct}% margin · revenue − cost of goods` : 'revenue − cost of goods')}
        tone={grossTone}
      />
      <QBWidget
        title="Sales"
        isLoading={isLoading}
        value={count === null ? EM_DASH : new Intl.NumberFormat('en-US').format(count)}
        basis={unavailable ?? `transactions · ${windowLabel}`}
      />
      <QBWidget
        title="Average sale"
        isLoading={isLoading}
        value={formatCurrency(num(kpis?.summary?.avg_ticket), currency)}
        basis={unavailable ?? windowLabel}
      />
    </KpiRow>
  );
}

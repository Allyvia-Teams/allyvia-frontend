import { useQuery } from '@tanstack/react-query';

// project imports
import { FinanceAPI } from 'api/finance.api';
import { useSelector } from 'store';
import type { FinanceKPIsData } from 'types/finance';
import type { IsoWindow } from './dashboardRange';

export const FINANCE_KPIS_KEY = 'dashboard-finance-kpis';

/**
 * The date-ranged finance KPIs (/analytics/finance/kpis/) that the Dashboard's
 * tiles read. Chosen over /dashboard/summary because that endpoint only takes a
 * fixed range enum and the Dashboard now carries the same date picker as
 * Finance and Analytics. Shared with the Finance view's KPI tiles, so the two
 * pages cannot disagree over the same window.
 */
export const useFinanceKpis = ({ startDate, endDate }: IsoWindow) => {
  const companyId = useSelector((state) => state.auth.currentRole?.company_id) || null;
  return useQuery<FinanceKPIsData | null>({
    queryKey: [FINANCE_KPIS_KEY, companyId, startDate, endDate],
    queryFn: () => FinanceAPI.Analytics.getFinanceKPIs({ companyId: companyId!, startDate, endDate }),
    enabled: !!companyId,
    staleTime: 60 * 1000,
    retry: false
  });
};

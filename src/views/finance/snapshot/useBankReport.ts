import { useQuery } from '@tanstack/react-query';

// project imports
import bankingApi, { type BankReport } from 'api/banking';
import type { Range } from './snapshotView';

/** The bank report for the range: the feed state, the accounts and the Needs review count. */
export function useBankReport(range: Range, scope: (string | undefined)[], enabled: boolean) {
  return useQuery<BankReport>({
    queryKey: ['banking', 'report', ...scope, range],
    queryFn: () => bankingApi.report({ start_date: range.start, end_date: range.end }),
    enabled,
    refetchInterval: 30_000,
    retry: false
  });
}

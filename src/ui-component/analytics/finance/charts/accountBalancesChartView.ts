export interface AccountBalancePoint {
  x: string;
  y: number;
}

export interface AccountTrendRow {
  account_type?: string;
  total_balance?: number | string;
}

export interface AccountSummaryRow {
  total_balance?: number | string;
}

export function buildAccountBalancesChartData(
  accountTrends: AccountTrendRow[] | null | undefined,
  accountSummary: AccountSummaryRow | null | undefined
): AccountBalancePoint[] {
  let data = (accountTrends || [])
    .filter((a) => Number(a.total_balance) > 0)
    .map((a) => ({
      x: String(a.account_type || 'Other').replace(/_/g, ' '),
      y: Number(a.total_balance)
    }));

  if (!data.length && accountSummary && Number(accountSummary.total_balance) > 0) {
    data = [{ x: 'Total Balance', y: Number(accountSummary.total_balance) }];
  }

  return data;
}

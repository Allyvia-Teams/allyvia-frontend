import { describe, expect, it } from 'vitest';
import { buildAccountBalancesChartData } from './accountBalancesChartView';

describe('AccountBalancesChart (ALL-141 FIX 4)', () => {
  it('builds chart points from account trends', () => {
    const data = buildAccountBalancesChartData(
      [
        { account_type: 'Bank', total_balance: 50000 },
        { account_type: 'Accounts_Receivable', total_balance: 80000 }
      ],
      null
    );

    expect(data).toEqual([
      { x: 'Bank', y: 50000 },
      { x: 'Accounts Receivable', y: 80000 }
    ]);
  });

  it('falls back to account summary total when trends are empty', () => {
    const data = buildAccountBalancesChartData([], { total_balance: 12500 });

    expect(data).toEqual([{ x: 'Total Balance', y: 12500 }]);
  });

  it('returns an empty array instead of invented mock balances when no API data exists', () => {
    expect(buildAccountBalancesChartData([], null)).toEqual([]);
    expect(buildAccountBalancesChartData(undefined, { total_balance: 0 })).toEqual([]);
    expect(buildAccountBalancesChartData(null, null)).toEqual([]);
  });
});

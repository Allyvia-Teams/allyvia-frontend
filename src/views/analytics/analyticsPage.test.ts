import { describe, expect, it } from 'vitest';

import {
  analyticsCsv,
  bestSellerRows,
  canSeeSection,
  changeDirection,
  expenseCategoryRows,
  expenseMonthRows,
  fillDays,
  formatMoney,
  groupPoints,
  kpiCards,
  lastYearWindow,
  moneyOutBasis,
  percentChange,
  previousWindow,
  rankRows,
  shiftForward,
  sourceSentence,
  tenderRows,
  toNumber,
  toPoints,
  weekdayAverages
} from './analyticsPage';

describe('windows', () => {
  it('previous window is the same length, ending the day before', () => {
    expect(previousWindow('2026-11-01', '2026-11-10')).toEqual({ start: '2026-10-22', end: '2026-10-31' });
    expect(previousWindow('2026-03-01', '2026-03-01')).toEqual({ start: '2026-02-28', end: '2026-02-28' });
  });

  it('last year lines up weekdays (364 days back)', () => {
    expect(lastYearWindow('2026-11-07', '2026-11-08')).toEqual({ start: '2025-11-08', end: '2025-11-09' });
  });

  it('crosses a DST change without losing a day', () => {
    expect(previousWindow('2026-11-02', '2026-11-08')).toEqual({ start: '2026-10-26', end: '2026-11-01' });
  });
});

describe('money and change', () => {
  it('reads decimal strings and keeps unknown as null', () => {
    expect(toNumber('1203.50')).toBe(1203.5);
    expect(toNumber(null)).toBeNull();
    expect(toNumber('')).toBeNull();
    expect(toNumber('nope')).toBeNull();
    expect(toNumber(0)).toBe(0);
  });

  it('formats whole dollars, unknown as a dash, and survives a bad currency code', () => {
    expect(formatMoney(48210.4)).toBe('$48,210');
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(5, 'dollars')).toBe('$5');
  });

  it('percent change refuses a zero or unknown base', () => {
    expect(percentChange(108, 100)).toBe('+8%');
    expect(percentChange(97, 100)).toBe('-3%');
    expect(percentChange(100.2, 100)).toBe('0%');
    expect(percentChange(50, 0)).toBeNull();
    expect(percentChange(null, 10)).toBeNull();
    expect(percentChange(10, null)).toBeNull();
  });

  it('only colours a change when up is clearly good or bad', () => {
    expect(changeDirection('+8%', true)).toBe('up');
    expect(changeDirection('-8%', true)).toBe('down');
    expect(changeDirection('+8%', null)).toBe('neutral');
    expect(changeDirection('0%', true)).toBe('neutral');
    expect(changeDirection(null, true)).toBe('neutral');
  });
});

describe('the four money figures', () => {
  const current = {
    expense_basis: 'bank' as const,
    bank_activity: { accounts: [{ name: 'Chase', mask: '4821', type: 'depository' }] },
    summary: { payments_count: 1385, avg_ticket: '34.81', currency: 'USD' },
    kpis: { revenue: '48210.00', expenses: '39870.00', net_income: '8340.00', cash_balance: null }
  };
  const previous = { kpis: { revenue: '44640.00', expenses: '38710.00', net_income: '5930.00' } };

  it('puts Sales, Money out, Left over, Cash on hand in that order', () => {
    expect(kpiCards(current, previous).map((c) => c.label)).toEqual(['Sales', 'Money out', 'Left over', 'Cash on hand']);
  });

  it('carries values, changes and a basis line for each', () => {
    const [sales, out, left, cash] = kpiCards(current, previous);
    expect(sales).toMatchObject({ value: '$48,210', change: '+8%', direction: 'up', basis: '1,385 sales · average $35' });
    expect(out).toMatchObject({ value: '$39,870', change: '+3%', direction: 'neutral', basis: 'From your bank · Chase 4821' });
    expect(left).toMatchObject({ value: '$8,340', change: '+41%', direction: 'up' });
    expect(cash).toMatchObject({ value: '—', change: null, basis: 'Not available' });
  });

  it('never prints a percentage when left over crosses zero', () => {
    const [, , left] = kpiCards({ kpis: { net_income: '200' } }, { kpis: { net_income: '-100' } });
    expect(left.change).toBeNull();
  });

  it('shows no change without a previous period', () => {
    expect(kpiCards(current, null).every((c) => c.change === null)).toBe(true);
  });

  it('says where money out came from for each source', () => {
    expect(moneyOutBasis({ expense_basis: 'accounting' })).toBe('From QuickBooks');
    expect(moneyOutBasis({ expense_basis: 'own_records' })).toBe('Recorded expenses');
    expect(moneyOutBasis({ expense_basis: 'bank' })).toBe('From your bank');
    expect(moneyOutBasis(null)).toBe('Expenses for the period');
    expect(sourceSentence('bank')).toContain('from your bank');
    expect(sourceSentence(undefined)).toBe('');
  });

  it('marks an estimated cash balance', () => {
    const [, , , cash] = kpiCards({ kpis: { cash_balance: '100', cash_balance_estimated: true } }, null);
    expect(cash.basis).toBe('Estimated from POS takings');
  });
});

describe('series', () => {
  const pts = toPoints([
    { date: '2026-11-02', amount: '100' },
    { date: '2026-11-03', amount: 50 },
    { date: '2026-11-09', total_amount: 25 },
    { date: 'bad', amount: 9 }
  ]);

  it('normalises amount or total_amount and drops bad dates', () => {
    expect(pts).toEqual([
      { date: '2026-11-02', amount: 100 },
      { date: '2026-11-03', amount: 50 },
      { date: '2026-11-09', amount: 25 }
    ]);
  });

  it('groups by Monday weeks and by month', () => {
    expect(groupPoints(pts, 'week')).toEqual([
      { date: '2026-11-02', amount: 150 },
      { date: '2026-11-09', amount: 25 }
    ]);
    expect(groupPoints(pts, 'month')).toEqual([{ date: '2026-11-01', amount: 175 }]);
  });

  it('fills missing days with zero', () => {
    expect(fillDays([{ date: '2026-11-02', amount: 5 }], '2026-11-01', '2026-11-03').map((p) => p.amount)).toEqual([0, 5, 0]);
  });

  it('averages each weekday over how often it occurred', () => {
    // Mon 2 Nov (100) and Mon 9 Nov (0): Monday averages 50.
    const avg = weekdayAverages([{ date: '2026-11-02', amount: 100 }], '2026-11-02', '2026-11-09');
    expect(avg[0]).toEqual({ day: 'Mon', amount: 50 });
    expect(avg.map((a) => a.day)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  });

  it('shifts last year onto this year', () => {
    expect(shiftForward([{ date: '2025-11-08', amount: 1 }])).toEqual([{ date: '2026-11-07', amount: 1 }]);
  });
});

describe('ranked rows', () => {
  it('sorts largest first, drops zero and negative rows, and folds the tail', () => {
    const rows = rankRows(
      [
        { label: 'A', amount: 10 },
        { label: 'B', amount: 40 },
        { label: 'C', amount: 0 },
        { label: 'D', amount: -5 },
        { label: 'E', amount: 20 }
      ],
      2
    );
    expect(rows.map((r) => [r.label, r.amount, r.share])).toEqual([
      ['B', 40, 100],
      ['E', 20, 50],
      ['Everything else', 10, 25]
    ]);
  });

  it('reads both expense breakdown shapes', () => {
    expect(expenseCategoryRows([{ category: 'Inventory', amount: '120.00' }])[0]).toMatchObject({ label: 'Inventory', amount: 120 });
    expect(expenseCategoryRows({ by_category: [{ category_name: 'Rent', total: 50 }] })[0]).toMatchObject({ label: 'Rent', amount: 50 });
    expect(expenseCategoryRows(null)).toEqual([]);
  });

  it('labels expense months in words', () => {
    expect(
      expenseMonthRows([
        { date: '2026-10-05', amount: 10 },
        { date: '2026-11-01', amount: 20 }
      ]).map((r) => r.label)
    ).toEqual(['October 2026', 'November 2026']);
  });

  it('best sellers carry units sold and never fold into a tail row', () => {
    const rows = bestSellerRows(Array.from({ length: 10 }, (_, i) => ({ name: `Item ${i}`, qty: i + 1, amount: (i + 1) * 10 })));
    expect(rows).toHaveLength(8);
    expect(rows[0]).toMatchObject({ label: 'Item 9', detail: '10 sold', amount: 100 });
  });

  it('merges tender providers into plain names', () => {
    const rows = tenderRows({
      payment_methods: [
        { provider: 'pos_card', amount: '100.00', count: 3 },
        { provider: 'Card', amount: '50.00', count: 1 },
        { provider: 'pos_cash', amount: '20.00', count: 1 }
      ]
    });
    expect(rows.map((r) => [r.label, r.amount, r.detail])).toEqual([
      ['Card', 150, '4 payments'],
      ['Cash', 20, '1 payment']
    ]);
  });
});

describe('section access', () => {
  it('admins see every section', () => {
    expect(canSeeSection('crm', 'admin', {} as any)).toBe(true);
  });

  it('members see only what they were granted', () => {
    const perms = { finance: true } as any;
    expect(canSeeSection('finance', 'member', perms)).toBe(true);
    expect(canSeeSection('crm', 'member', perms)).toBe(false);
  });
});

describe('download', () => {
  it('writes the figures, the daily series and the ranked rows, quoting commas', () => {
    const csv = analyticsCsv({
      start: '2026-11-01',
      end: '2026-11-02',
      cards: kpiCards({ kpis: { revenue: '1200' } }, null),
      sales: [{ date: '2026-11-01', amount: 1200 }],
      moneyOut: [{ date: '2026-11-01', amount: 300 }],
      spend: [{ label: 'Rent, shop', amount: 300, share: 100 }],
      sold: [{ label: 'Dress', detail: '2 sold', amount: 200, share: 100 }]
    });
    expect(csv).toContain('Sales,"$1,200",,Sales for the period');
    expect(csv).toContain('2026-11-01,1200.00,300.00');
    expect(csv).toContain('"Rent, shop",300.00');
    expect(csv).toContain('Dress,2 sold,200.00');
  });
});

import { describe, expect, it } from 'vitest';
import {
  bestSellers,
  buildOwnerCharts,
  busiestDays,
  daysIn,
  lastYearWindow,
  salesPerLaborHour,
  salesVsLastYear,
  styleOf,
  WEEKLY_THRESHOLD_DAYS
} from './ownerCharts';

// 2026-11-02 is a Monday; 364 days earlier (2025-11-03) is also a Monday.
const pts = (start: string, values: number[]) =>
  values.map((v, i) => ({
    date: new Date(Date.parse(`${start}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10),
    amount: String(v)
  }));

describe('lastYearWindow', () => {
  it('shifts back 364 days so weekdays line up', () => {
    expect(lastYearWindow('2026-11-02', '2026-11-08')).toEqual({ start: '2025-11-03', end: '2025-11-09' });
    expect(new Date('2025-11-03T00:00:00Z').getUTCDay()).toBe(new Date('2026-11-02T00:00:00Z').getUTCDay());
  });
});

describe('salesVsLastYear', () => {
  it('totals the window, compares to last year and pairs days by weekday', () => {
    const c = salesVsLastYear(pts('2026-11-02', [100, 200, 300]), pts('2025-11-03', [50, 100, 150]), '2026-11-02', '2026-11-04')!;
    expect(c.headline).toBe('$600');
    expect(c.description).toBe('up 100.0% on the same 3 days last year ($300)');
    expect(c.series[0].data).toEqual([100, 200, 300]);
    expect(c.series[1]).toMatchObject({ name: 'Last year', data: [50, 100, 150], dashed: true });
  });

  it('says down when below last year', () => {
    const c = salesVsLastYear(pts('2026-11-02', [90]), pts('2025-11-03', [100]), '2026-11-02', '2026-11-02')!;
    expect(c.description).toMatch(/^down 10\.0%/);
  });

  it('drops the comparison line when last year has no sales', () => {
    const c = salesVsLastYear(pts('2026-11-02', [10, 20]), [], '2026-11-02', '2026-11-03')!;
    expect(c.series).toHaveLength(1);
    expect(c.description).toBe('No sales recorded for the same 2 days last year');
  });

  it('fills days without sales with zero instead of skipping them', () => {
    const c = salesVsLastYear([{ date: '2026-11-03', amount: 40 }], [], '2026-11-02', '2026-11-04')!;
    expect(c.series[0].data).toEqual([0, 40, 0]);
  });

  it('buckets weekly beyond the threshold so long ranges stay readable', () => {
    const n = WEEKLY_THRESHOLD_DAYS + 8;
    const start = '2026-01-05';
    const end = new Date(Date.parse(`${start}T00:00:00Z`) + (n - 1) * 86_400_000).toISOString().slice(0, 10);
    const c = salesVsLastYear(pts(start, Array(n).fill(10)), [], start, end)!;
    expect(c.xAxis[0]).toBe('Wk of 1/5');
    expect(c.series[0].data[0]).toBe(70);
    expect(c.series[0].data.reduce((a, b) => a + b, 0)).toBe(n * 10);
  });

  it('returns null when neither period has sales', () => {
    expect(salesVsLastYear([], [], '2026-11-02', '2026-11-03')).toBeNull();
  });
});

describe('bestSellers', () => {
  it('rolls variants up to their style and ranks by revenue', () => {
    const c = bestSellers(
      [
        { name: 'Wild Jacket / Black / M', qty: 1, amount: '314.00' },
        { name: 'Wild Jacket / Black / L', qty: 1, amount: '314.00' },
        { name: 'Body Lotion', qty: 20, amount: '480.00' },
        { name: 'Lip Balm', qty: 5, amount: '40.00' }
      ],
      2000
    )!;
    expect(c.xAxis).toEqual(['Wild Jacket', 'Body Lotion', 'Lip Balm']);
    expect(c.series[0].data).toEqual([628, 480, 40]);
    expect(c.headline).toBe('Wild Jacket');
    expect(c.description).toBe('$628 from 2 sold · top 3 styles are 57% of sales');
    expect(c.horizontal).toBe(true);
  });

  it('keeps only the top N styles', () => {
    const items = Array.from({ length: 12 }, (_, i) => ({ name: `Style ${i}`, qty: 1, amount: 100 - i }));
    expect(bestSellers(items, 0, 8)!.xAxis).toHaveLength(8);
  });

  it('is null when nothing sold', () => {
    expect(bestSellers([], 0)).toBeNull();
    expect(styleOf('')).toBe('Unnamed item');
  });
});

describe('busiestDays', () => {
  it('averages each weekday over the window and orders Monday first', () => {
    // Two full weeks from Monday 2026-11-02: Saturdays 600, every other day 100.
    const values = Array.from({ length: 14 }, (_, i) => (i % 7 === 5 ? 600 : 100));
    const c = busiestDays(pts('2026-11-02', values), '2026-11-02', '2026-11-15')!;
    expect(c.xAxis).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(c.series[0].data).toEqual([100, 100, 100, 100, 100, 600, 100]);
    expect(c.headline).toBe('Saturdays');
    expect(c.description).toBe('average $600 · 50% of a typical week · 6.0× a Monday');
  });

  it('is null with no sales', () => {
    expect(busiestDays([], '2026-11-02', '2026-11-08')).toBeNull();
  });
});

describe('salesPerLaborHour', () => {
  const labor = [
    { date: '2026-11-02', employees: [{ hours: '8' }, { hours: '2' }] },
    { date: '2026-11-03', employees: [{ hours: 5 }] }
  ];

  it('divides sales by staff hours, only on staffed days', () => {
    const c = salesPerLaborHour(pts('2026-11-02', [1000, 250, 999]), labor, '2026-11-02', '2026-11-04')!;
    expect(c.xAxis).toEqual(['11/2', '11/3']);
    expect(c.series[0].data).toEqual([100, 50]);
    expect(c.headline).toBe('$83/hr'); // 1,250 / 15 hours
    expect(c.description).toBe('15 staff hours across 2 staffed days · best 11/2 at $100/hr');
  });

  it('is null without timecards', () => {
    expect(salesPerLaborHour(pts('2026-11-02', [10]), [], '2026-11-02', '2026-11-02')).toBeNull();
  });
});

describe('buildOwnerCharts', () => {
  it('returns the charts that have data, in the owner order', () => {
    const charts = buildOwnerCharts({
      start: '2026-11-02',
      end: '2026-11-03',
      current: pts('2026-11-02', [100, 50]),
      lastYear: [],
      topItems: [{ name: 'Tee', qty: 1, amount: 50 }],
      labor: []
    });
    expect(charts.map((c) => c.key)).toEqual(['sales', 'bestSellers', 'busiestDays']);
    expect(daysIn('2026-11-02', '2026-11-03')).toHaveLength(2);
  });
});

import { describe, expect, it } from 'vitest';
import {
  deltaKind,
  formatAsOf,
  initials,
  isoWindowLabel,
  rangeMetricLabel,
  rangeWindowLabel,
  sparkHeights,
  splitLead,
  subtitleLine
} from './frame';

describe('deltaKind', () => {
  it('reads the sign of a formatted delta', () => {
    expect(deltaKind('+8.1%')).toBe('up');
    expect(deltaKind('-3.2%')).toBe('down');
    expect(deltaKind('−3.2%')).toBe('down');
  });
  it('treats the em dash and prose as neutral', () => {
    expect(deltaKind('—')).toBe('neutral');
    expect(deltaKind('No activity this period')).toBe('neutral');
    expect(deltaKind(null)).toBe('neutral');
  });
});

describe('sparkHeights', () => {
  it('scales to the peak and floors at the minimum', () => {
    expect(sparkHeights([0, 11, 22], 22, 3)).toEqual([3, 11, 22]);
  });
  it('refuses a series too short to be a trend', () => {
    expect(sparkHeights([5])).toEqual([]);
    expect(sparkHeights(undefined)).toEqual([]);
  });
  it('refuses a series with a non-finite value rather than drawing a hole', () => {
    expect(sparkHeights([1, NaN, 3])).toEqual([]);
  });
  it('draws hairlines for an all-zero series', () => {
    expect(sparkHeights([0, 0, 0])).toEqual([3, 3, 3]);
  });
});

describe('subtitleLine', () => {
  it('joins the window and the freshness with a middle dot', () => {
    const line = subtitleLine('Last 30 days', '2026-09-11T14:42:00Z');
    expect(line.startsWith('Last 30 days · as of ')).toBe(true);
    expect(line).toMatch(/\d{2}:\d{2}/);
  });
  it('drops whichever half is missing', () => {
    expect(subtitleLine('Today', null)).toBe('Today');
    expect(subtitleLine(null, 'not a date')).toBe('');
  });
  it('formatAsOf returns null for garbage', () => {
    expect(formatAsOf('nope')).toBeNull();
    expect(formatAsOf(undefined)).toBeNull();
  });
});

describe('range labels', () => {
  it('names every range', () => {
    expect(rangeWindowLabel('today')).toBe('Today');
    expect(rangeWindowLabel('7d')).toBe('Last 7 days');
    expect(rangeWindowLabel('30d')).toBe('Last 30 days');
    expect(rangeWindowLabel('mtd')).toBe('Month to date');
  });
  it('builds sentence-case metric labels', () => {
    expect(rangeMetricLabel('30d', 'Profit')).toBe('30-day profit');
    expect(rangeMetricLabel('mtd', 'Pending invoices')).toBe('MTD pending invoices');
    expect(rangeMetricLabel('today', 'Revenue')).toBe("Today's revenue");
  });
});

describe('splitLead', () => {
  it('splits on the first sentence', () => {
    expect(splitLead('Reorder Cormo scarves before the weekend. 34 sold in 9 days, 11 on hand.')).toEqual({
      title: 'Reorder Cormo scarves before the weekend.',
      body: '34 sold in 9 days, 11 on hand.'
    });
  });
  it('keeps a one-sentence text as a title alone', () => {
    expect(splitLead('Thursday evening is overstaffed')).toEqual({ title: 'Thursday evening is overstaffed', body: null });
  });
  it('does not split on a decimal point', () => {
    const { title } = splitLead('Margin fell to 61.4% on linen. Mark it down.');
    expect(title).toBe('Margin fell to 61.4% on linen.');
  });
  it('cuts an overlong first sentence on a word boundary and carries the rest into the body', () => {
    const long =
      'Consider reordering the entire autumn knitwear range from Cormo because sell-through has been unusually strong this month and stock is thin. Lead time is six days.';
    const { title, body } = splitLead(long);
    expect(title.length).toBeLessThanOrEqual(91);
    expect(title.endsWith('…')).toBe(true);
    expect(body).toContain('Lead time is six days.');
  });
  it('returns an empty title for empty input', () => {
    expect(splitLead('')).toEqual({ title: '', body: null });
  });
});

describe('initials', () => {
  it('uses first and last names', () => {
    expect(initials('Maya', 'Karas')).toBe('MK');
  });
  it('falls back to the first letter of an email', () => {
    expect(initials('', null, 'nigel@f2.ai')).toBe('N');
    expect(initials(null, null, null)).toBe('');
  });
});

describe('isoWindowLabel', () => {
  it('names a same-year window once', () => {
    expect(isoWindowLabel('2026-09-01', '2026-09-13')).toBe('Sep 1 – Sep 13, 2026');
  });
  it('names both years across a year boundary', () => {
    expect(isoWindowLabel('2025-12-20', '2026-01-05')).toBe('Dec 20, 2025 – Jan 5, 2026');
  });
  it('collapses a one-day window to the date', () => {
    expect(isoWindowLabel('2026-09-11', '2026-09-11')).toBe('Sep 11, 2026');
  });
  it('returns nothing for garbage rather than "Invalid Date"', () => {
    expect(isoWindowLabel('', undefined)).toBe('');
    expect(isoWindowLabel('nope', '2026-09-11')).toBe('Sep 11, 2026');
  });
});

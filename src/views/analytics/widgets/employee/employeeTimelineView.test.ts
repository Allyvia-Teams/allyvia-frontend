import { describe, expect, it } from 'vitest';
import { omittedEntryCount, timelinePointFor, timelineSeries, timelineSeriesFor } from './employeeTimelineView';

const day = (employees: any[]) => ({ day: 'Monday', date: '2026-09-07', employees });

describe('employee timeline (ALL-140 H1)', () => {
  it('plots a shift from real clock-in and clock-out times', () => {
    const point = timelinePointFor(
      day([{ employee_name: 'Alice', start_time: '2026-09-07T09:15:00', end_time: '2026-09-07T17:30:00' }]),
      'Alice'
    );

    expect(point).toEqual({ x: 'Monday', y: [9.25, 17.5] });
  });

  // The regression: this entry has hours but no timestamps. The old code
  // invented a 9:00 AM start and drew a solid bar to 17:00, which a manager
  // would read as a measured shift. It must produce nothing instead.
  it('omits a day that has hours but no clock times, rather than inventing 9am', () => {
    const bucket = day([{ employee_name: 'Alice', hours: 8 }]);

    expect(timelinePointFor(bucket, 'Alice')).toBeNull();
    expect(timelineSeriesFor([bucket], 'Alice').data).toEqual([]);
  });

  it('omits a half-recorded day with only one of the two timestamps', () => {
    expect(timelinePointFor(day([{ employee_name: 'Alice', start_time: '2026-09-07T09:00:00', hours: 8 }]), 'Alice')).toBeNull();
    expect(timelinePointFor(day([{ employee_name: 'Alice', end_time: '2026-09-07T17:00:00', hours: 8 }]), 'Alice')).toBeNull();
  });

  it('omits an unparseable timestamp instead of plotting NaN', () => {
    expect(
      timelinePointFor(day([{ employee_name: 'Alice', start_time: 'not-a-date', end_time: '2026-09-07T17:00:00' }]), 'Alice')
    ).toBeNull();
  });

  // The invented end time was `start + Math.floor(hours)`, so a long entry
  // produced an end hour past 24 and a bar that overran the axis.
  it('never emits an end hour beyond the 24h axis', () => {
    const point = timelinePointFor(day([{ employee_name: 'Alice', hours: 19 }]), 'Alice');

    expect(point).toBeNull();
  });

  it('omits a bar that would render backwards across local midnight', () => {
    expect(
      timelinePointFor(day([{ employee_name: 'Alice', start_time: '2026-09-07T22:00:00', end_time: '2026-09-08T06:00:00' }]), 'Alice')
    ).toBeNull();
  });

  it('returns null when the employee is absent from the day', () => {
    expect(
      timelinePointFor(day([{ employee_name: 'Bob', start_time: '2026-09-07T09:00:00', end_time: '2026-09-07T17:00:00' }]), 'Alice')
    ).toBeNull();
  });

  it('keeps real days and drops fabricated ones in the same series', () => {
    const days = [
      {
        day: 'Monday',
        date: '2026-09-07',
        employees: [{ employee_name: 'Alice', start_time: '2026-09-07T09:00:00', end_time: '2026-09-07T17:00:00' }]
      },
      { day: 'Tuesday', date: '2026-09-08', employees: [{ employee_name: 'Alice', hours: 8 }] }
    ];

    const series = timelineSeriesFor(days, 'Alice');

    expect(series.data.map((p) => p.x)).toEqual(['Monday']);
  });

  it('builds one series per employee', () => {
    const days = [
      {
        day: 'Monday',
        date: '2026-09-07',
        employees: [
          { employee_name: 'Alice', start_time: '2026-09-07T09:00:00', end_time: '2026-09-07T17:00:00' },
          { employee_name: 'Bob', hours: 6 }
        ]
      }
    ];

    const series = timelineSeries(days, ['Alice', 'Bob']);

    expect(series.map((s) => s.name)).toEqual(['Alice', 'Bob']);
    expect(series[0].data).toHaveLength(1);
    expect(series[1].data).toHaveLength(0);
  });

  it('counts omitted entries so the chart can disclose them', () => {
    const days = [
      {
        day: 'Monday',
        date: '2026-09-07',
        employees: [
          { employee_name: 'Alice', start_time: '2026-09-07T09:00:00', end_time: '2026-09-07T17:00:00' },
          { employee_name: 'Bob', hours: 6 }
        ]
      }
    ];

    expect(omittedEntryCount(days, ['Alice', 'Bob'])).toBe(1);
    expect(omittedEntryCount(days, ['Alice'])).toBe(0);
  });

  it('survives empty and missing inputs', () => {
    expect(timelineSeries([], ['Alice'])).toEqual([{ name: 'Alice', data: [] }]);
    expect(timelineSeries(undefined as any, undefined as any)).toEqual([]);
  });
});

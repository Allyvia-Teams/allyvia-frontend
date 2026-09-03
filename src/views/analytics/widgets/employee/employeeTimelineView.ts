// Pure view-model for the Employee tab's clock-in/clock-out timeline.
//
// The chart claims to plot "actual clock-in/out times". When an entry carried
// only a total-hours figure the old code invented a 9:00 AM start and drew it
// with the same colour, shape and tooltip as a real shift, so fabricated
// attendance detail was indistinguishable from measured data (ALL-140 H1).
// A day without both timestamps now produces no point at all.

export type DailyEmployeeEntry = {
  employee_name?: string;
  start_time?: string | null;
  end_time?: string | null;
  hours?: number | string | null;
};

export type DailyBucket = { day: string; date: string; employees: DailyEmployeeEntry[] };

export type TimelinePoint = { x: string; y: [number, number] };

// Local clock-hour of a timestamp, as a fraction (9:30 → 9.5).
const localHour = (iso: string): number | null => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() + d.getMinutes() / 60;
};

export function timelinePointFor(day: DailyBucket, employeeName: string): TimelinePoint | null {
  const emp = day.employees?.find((e) => e.employee_name === employeeName);
  if (!emp) return null;

  // Both timestamps are required. Anything less is not a measured shift, and
  // the timeline has no honest way to draw it.
  if (!emp.start_time || !emp.end_time) return null;

  const start = localHour(emp.start_time);
  const end = localHour(emp.end_time);
  if (start === null || end === null) return null;

  // A shift crossing local midnight would otherwise render as a backwards bar.
  if (end < start) return null;

  return { x: day.day, y: [start, end] };
}

export function timelineSeriesFor(days: DailyBucket[], employeeName: string): { name: string; data: TimelinePoint[] } {
  const data = (days ?? []).map((day) => timelinePointFor(day, employeeName)).filter((p): p is TimelinePoint => p !== null);
  return { name: employeeName, data };
}

export function timelineSeries(days: DailyBucket[], employeeNames: string[]): Array<{ name: string; data: TimelinePoint[] }> {
  return (employeeNames ?? []).map((name) => timelineSeriesFor(days, name));
}

// How many day/employee pairs were dropped for want of real timestamps, so the
// chart can say so instead of quietly showing a partial week as if complete.
export function omittedEntryCount(days: DailyBucket[], employeeNames: string[]): number {
  let omitted = 0;
  for (const day of days ?? []) {
    for (const name of employeeNames ?? []) {
      const emp = day.employees?.find((e) => e.employee_name === name);
      if (emp && timelinePointFor(day, name) === null) omitted += 1;
    }
  }
  return omitted;
}

import { useEffect, useMemo, useState } from 'react';
import { IconUserSearch, IconCalendar, IconDownload, IconReload } from '@tabler/icons-react';
import { getTimeEntries, TimeEntry } from '../../api/employee.api';

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
const hhmm = (sec?: number | null) => {
  if (typeof sec !== 'number') return '—';
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
};
const dayBoundsToUtc = (startDay: string, endDay: string) => {
  const startUtc = new Date(`${startDay}T00:00:00`);
  const endUtcExcl = new Date(`${endDay}T00:00:00`);
  endUtcExcl.setDate(endUtcExcl.getDate() + 1);
  return { start: startUtc.toISOString(), end: endUtcExcl.toISOString() };
};
const isoToday = () => new Date().toISOString().slice(0, 10);
const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export default function AdminTimesheet() {
  const [employeeId, setEmployeeId] = useState('');
  const [start, setStart] = useState(isoDaysAgo(7));
  const [end, setEnd] = useState(isoToday());
  const [rows, setRows] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const eid = p.get('employee_id');
    if (eid) setEmployeeId(eid);
  }, []);

  const fetchRows = async () => {
    setErr(null);
    if (!employeeId) return setErr('Employee ID is required');
    setLoading(true);
    try {
      const { start: s, end: e } = dayBoundsToUtc(start, end);
      const { data } = await getTimeEntries({ employee_id: employeeId, start: s, end: e });
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? 'Failed to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const totalSecs = useMemo(() => rows.reduce((s, r) => s + (r.duration_seconds ?? 0), 0), [rows]);

  const exportCSV = () => {
    const header = 'clock_in,clock_out,duration_seconds,note\n';
    const body = rows
      .map((r) => [r.clock_in, r.clock_out ?? '', r.duration_seconds ?? 0, (r.note || '').replace(/,/g, ';')].join(','))
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet_${employeeId}_${start}_${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border bg-white/90 shadow-sm backdrop-blur">
        {/* header */}
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-slate-50 to-white px-6 py-4">
          <div className="flex items-center gap-2">
            <IconUserSearch className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-semibold">Admin: Timesheet</h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
              Entries: <b>{rows.length}</b>
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
              Total: <b>{hhmm(totalSecs)}</b>
            </span>
          </div>
        </div>

        {/* controls */}
        <div className="px-6 py-4">
          {err && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[320px]">
              <label className="mb-1 block text-xs font-medium text-slate-600">Employee ID (UUID)</label>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="d1e63802-…"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Start</label>
              <div className="flex items-center gap-2">
                <IconCalendar className="h-4 w-4 text-slate-400" />
                <input
                  className="rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-slate-200"
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">End</label>
              <div className="flex items-center gap-2">
                <IconCalendar className="h-4 w-4 text-slate-400" />
                <input
                  className="rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-slate-200"
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={fetchRows}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              <IconReload className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Loading…' : 'Fetch'}
            </button>

            <div className="ml-auto flex gap-2">
              <button
                className="rounded-full border px-3 py-1 text-xs hover:bg-slate-50"
                onClick={() => {
                  setStart(isoDaysAgo(7));
                  setEnd(isoToday());
                }}
              >
                Last 7 days
              </button>
              <button
                className="rounded-full border px-3 py-1 text-xs hover:bg-slate-50"
                onClick={() => {
                  const now = new Date();
                  const d = (now.getDay() + 6) % 7;
                  const mon = new Date(now);
                  mon.setDate(now.getDate() - d);
                  const sun = new Date(mon);
                  sun.setDate(mon.getDate() + 6);
                  setStart(mon.toISOString().slice(0, 10));
                  setEnd(sun.toISOString().slice(0, 10));
                }}
              >
                This week
              </button>
              <button
                onClick={exportCSV}
                disabled={!rows.length}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                <IconDownload className="h-4 w-4" /> Export CSV
              </button>
            </div>
          </div>

          {/* table */}
          <div className="mt-4 overflow-x-auto rounded-xl border">
            <table className="w-full table-fixed text-sm">
              <thead className="sticky top-0 bg-slate-50/90 backdrop-blur">
                <tr className="text-left">
                  <th className="px-4 py-2">Clock In</th>
                  <th className="px-4 py-2">Clock Out</th>
                  <th className="px-4 py-2">Duration</th>
                  <th className="px-4 py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length ? (
                  rows.map((r, i) => (
                    <tr key={r.id} className={i % 2 ? 'bg-slate-50/40' : ''}>
                      <td className="px-4 py-2">{fmt(r.clock_in)}</td>
                      <td className="px-4 py-2">{fmt(r.clock_out)}</td>
                      <td className="px-4 py-2">{hhmm(r.duration_seconds)}</td>
                      <td className="px-4 py-2">{r.note || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={4}>
                      No entries
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-sm text-slate-600">
            Total time: <b className="text-slate-900">{hhmm(totalSecs)}</b>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { IconClock, IconPlayerPlay, IconPlayerStop } from '@tabler/icons-react';
import { clockIn, clockOut, getMyTimeEntries, TimeEntry } from '../../api/employee.api';
import { fmt } from '../../lib/time';

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export default function ClockInOutCard() {
  const [openEntry, setOpenEntry] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const refresh = async () => {
    setError(null);
    try {
      const { data } = await getMyTimeEntries({ open: true });
      setOpenEntry(Array.isArray(data) && data.length ? data[0] : null);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to load');
    }
  };
  useEffect(() => {
    refresh();
  }, []);

  // live ticker
  useEffect(() => {
    if (!openEntry?.clock_in) return;
    const t = setInterval(() => setOpenEntry((e) => (e ? { ...e } : e)), 1000);
    return () => clearInterval(t);
  }, [openEntry?.clock_in]);

  const elapsed = useMemo(() => {
    if (!openEntry?.clock_in) return '00:00:00';
    const started = new Date(openEntry.clock_in).getTime();
    const secs = Math.max(0, Math.floor((Date.now() - started) / 1000));
    const h = Math.floor(secs / 3600),
      m = Math.floor((secs % 3600) / 60),
      s = secs % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }, [openEntry]);

  const isClockedIn = !!openEntry;

  const onClockIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await clockIn();
      await refresh();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Clock-in failed');
    } finally {
      setLoading(false);
    }
  };

  const onClockOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await clockOut(note || undefined);
      setNote('');
      await refresh();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Clock-out failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border bg-white/90 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between border-b bg-gradient-to-r from-indigo-50 to-white px-5 py-3">
        <div className="flex items-center gap-2">
          <IconClock className="h-5 w-5 text-indigo-600" />
          <h2 className="text-base font-semibold">Time Tracking</h2>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isClockedIn ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}
        >
          {isClockedIn ? 'Clocked in' : 'Clocked out'}
        </span>
      </div>

      <div className="space-y-4 p-5">
        {isClockedIn ? (
          <div className="grid gap-1 text-sm">
            <div className="text-slate-600">
              Since: <span className="font-medium text-slate-900">{fmt(openEntry?.clock_in)}</span>
            </div>
            <div className="font-mono text-3xl font-semibold tracking-wider">{elapsed}</div>
          </div>
        ) : (
          <div className="text-sm text-slate-600">You’re currently clocked out.</div>
        )}

        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {isClockedIn ? (
            <>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Add a note (optional)…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button
                onClick={onClockOut}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60 sm:w-auto"
              >
                <IconPlayerStop className="h-4 w-4" /> {loading ? 'Clocking out…' : 'Clock Out'}
              </button>
            </>
          ) : (
            <button
              onClick={onClockIn}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 sm:w-auto"
            >
              <IconPlayerPlay className="h-4 w-4" /> {loading ? 'Clocking in…' : 'Clock In'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

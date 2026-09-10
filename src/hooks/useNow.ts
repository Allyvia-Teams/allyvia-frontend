import { useEffect, useState } from 'react';

/**
 * A Date that re-renders on a tick. For anything showing elapsed or remaining
 * time -- a pairing-code countdown, a "last seen 3 min ago" column -- where the
 * display has to move without the data changing.
 *
 * The clock lives here rather than inside the formatters so those stay pure and
 * testable: they take `now` as a parameter (see ui-component/settings/registers.ts).
 *
 * Not utils/resend-timer.ts, which counts down from a fixed cooldown anchored in
 * sessionStorage rather than toward a server-supplied instant, and which lists
 * its own countdown in its effect's dependency array -- so it tears down and
 * rebuilds the interval on every tick.
 *
 * @param intervalMs how often to tick; 0 or negative freezes the clock, which
 *   is how a caller stops the interval once whatever it was timing has ended.
 */
export default function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    if (intervalMs <= 0) return;
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}

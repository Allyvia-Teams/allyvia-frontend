// Pure helpers for the page frame (design handoff "Allyvia OS tidy-up").
// No React and no MUI: vitest runs in node, so everything a view decides
// before it renders lives here where it can be asserted.

export type DeltaKind = 'up' | 'down' | 'neutral';

/** Status text colours from the handoff's token sheet. Light mode only; dark mode
 *  falls back to the palette's `main` for each status. */
export const STATUS_TEXT = {
  warning: '#b46a00',
  error: '#a33',
  success: '#256b4c'
} as const;

export type Tone = 'default' | 'warning' | 'error' | 'success' | 'muted';

/**
 * Direction of a formatted delta label. `formatDeltaLabel` produces "+8.1%",
 * "-3.2%", an em dash or "No activity this period"; only a leading sign is a
 * direction. A unicode minus (U+2212) counts as down, because a designer will
 * paste one.
 */
export const deltaKind = (label: string | null | undefined): DeltaKind => {
  if (!label) return 'neutral';
  const first = label.trim().charAt(0);
  if (first === '+') return 'up';
  if (first === '-' || first === '−') return 'down';
  return 'neutral';
};

/**
 * Bar heights for a 14-bar sparkline. Scales to `maxPx`, floors at `minPx` so
 * a zero day still draws a hairline, and returns [] for anything that is not
 * a series of at least two finite numbers — a one-point sparkline is a claim
 * about a trend the data cannot support.
 */
export const sparkHeights = (values: ReadonlyArray<number> | null | undefined, maxPx = 22, minPx = 3): number[] => {
  if (!values || values.length < 2) return [];
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length !== values.length) return [];
  const peak = Math.max(...finite);
  if (peak <= 0) return finite.map(() => minPx);
  return finite.map((v) => Math.max(minPx, Math.round((v / peak) * maxPx * 10) / 10));
};

/** "02:42 PM" from an ISO timestamp; null when it cannot be parsed. */
export const formatAsOf = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

/** The subtitle line: "Last 30 days · as of 02:42 PM". Either half may be absent. */
export const subtitleLine = (windowLabel: string | null | undefined, asOf: string | null | undefined): string => {
  const parts: string[] = [];
  if (windowLabel) parts.push(windowLabel);
  const time = formatAsOf(asOf);
  if (time) parts.push(`as of ${time}`);
  return parts.join(' · ');
};

export type FrameRange = 'today' | '7d' | '30d' | 'mtd';

/** Window label used until the server's own `windowLabel` arrives. */
export const rangeWindowLabel = (range: FrameRange): string => {
  switch (range) {
    case 'today':
      return 'Today';
    case '7d':
      return 'Last 7 days';
    case '30d':
      return 'Last 30 days';
    case 'mtd':
      return 'Month to date';
    default:
      return '';
  }
};

/** KPI label prefix per range, sentence case: "30-day profit", "MTD profit". */
export const rangeMetricLabel = (range: FrameRange, metric: string): string => {
  const lower = metric.charAt(0).toLowerCase() + metric.slice(1);
  switch (range) {
    case 'today':
      return `Today's ${lower}`;
    case '7d':
      return `7-day ${lower}`;
    case '30d':
      return `30-day ${lower}`;
    case 'mtd':
      return `MTD ${lower}`;
    default:
      return metric;
  }
};

/**
 * Split a recommendation into a list row's title and body. The title is the
 * first sentence (up to the first terminal punctuation followed by a space);
 * the body is the rest. A one-sentence text becomes a title with no body, and
 * very long first sentences are cut on a word boundary with an ellipsis so
 * the row keeps its shape.
 */
export const splitLead = (text: string, maxTitle = 90): { title: string; body: string | null } => {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return { title: '', body: null };
  const match = /^(.+?[.!?])(?:\s+|$)([\s\S]*)$/.exec(trimmed);
  let title = match ? match[1] : trimmed;
  let body: string | null = match && match[2] ? match[2].trim() : null;
  if (title.length > maxTitle) {
    const cut = title.lastIndexOf(' ', maxTitle);
    const head = title.slice(0, cut > 40 ? cut : maxTitle).trimEnd();
    const tail = title.slice(head.length).trim();
    body = [tail, body].filter(Boolean).join(' ') || null;
    title = `${head}…`;
  }
  if (body === '') body = null;
  return { title, body };
};

/** Two-letter initials for the sidebar's user row. */
export const initials = (first?: string | null, last?: string | null, fallback?: string | null): string => {
  const a = (first ?? '').trim().charAt(0);
  const b = (last ?? '').trim().charAt(0);
  const joined = `${a}${b}`.toUpperCase();
  if (joined) return joined;
  const f = (fallback ?? '').trim();
  return f ? f.charAt(0).toUpperCase() : '';
};

/** "Sep 1 – Sep 13, 2026" from two YYYY-MM-DD strings; a single date when equal; '' when unparseable. */
export const isoWindowLabel = (startISO: string | null | undefined, endISO: string | null | undefined): string => {
  const parse = (iso: string | null | undefined) => {
    if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const start = parse(startISO);
  const end = parse(endISO);
  if (!start && !end) return '';
  const monthDay = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const full = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (start && end) {
    if (start.getTime() === end.getTime()) return full(start);
    if (start.getFullYear() === end.getFullYear()) return `${monthDay(start)} – ${full(end)}`;
    return `${full(start)} – ${full(end)}`;
  }
  return full((start ?? end) as Date);
};

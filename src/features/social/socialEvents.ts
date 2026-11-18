// Events from her Instagram posts: what the review list and the Instagram card say and send. Pure.
//
// The words never say "AI", "model" or "proposal": a suggestion is "Suggested from your posts", and nothing is an
// event until she confirms it. Every edit she makes (kind, dates, store) is what Confirm sends.

import type { ConfirmBody, SocialConnection, SocialEventKind, SocialProposal } from 'api/social.api';

export const SUGGESTED_LINE = 'Suggested from your posts.';
export const REVIEW_TITLE = 'Events from your posts';
/** The longest event Confirm accepts (the server's own limit). */
export const LONGEST_DAYS = 31;

export const KINDS: ReadonlyArray<{ value: SocialEventKind; label: string }> = [
  { value: 'sale', label: 'Sale' },
  { value: 'in_store_event', label: 'In-store event' },
  { value: 'pop_up', label: 'Pop-up' },
  { value: 'trunk_show', label: 'Trunk show' },
  { value: 'new_arrival', label: 'New arrivals' },
  { value: 'late_hours', label: 'Late night' },
  { value: 'other', label: 'Store event' }
];

export const kindLabel = (kind: SocialEventKind): string => KINDS.find((k) => k.value === kind)?.label ?? 'Store event';

/** "Events from your posts (3 to review)", or nothing when there is nothing to review. */
export function reviewLink(toReview: number | null | undefined): string | null {
  if (!toReview || toReview < 1) return null;
  return `${REVIEW_TITLE} (${toReview} to review)`;
}

/** The Trends page's link: with a count while there is something to review; without one while Instagram is
 * connected (so a confirmed event can still be withdrawn); otherwise none (off, not her role, never connected). */
export function trendsLink(connection: SocialConnection | undefined): string | null {
  if (!connection) return null;
  return reviewLink(connection.to_review) ?? (connection.status === 'disconnected' ? null : REVIEW_TITLE);
}

// ---- the caption, with her post's own words highlighted ----------------------

export interface CaptionPart {
  text: string;
  quoted: boolean;
}

const norm = (s: string) => s.replace(/\s+/g, ' ').toLowerCase();

/** The caption split around the quoted words (matched ignoring case and spacing); unmatched, the caption as it is. */
export function captionParts(caption: string, quote: string): CaptionPart[] {
  const q = norm(quote).trim();
  if (!q) return [{ text: caption, quoted: false }];
  // Map each normalised character back to its place in the caption.
  const map: number[] = [];
  let flat = '';
  for (let i = 0; i < caption.length; i += 1) {
    const ch = caption[i];
    const space = /\s/.test(ch);
    if (space && flat.endsWith(' ')) continue;
    flat += space ? ' ' : ch.toLowerCase();
    map.push(i);
  }
  const at = flat.indexOf(q);
  if (at < 0) return [{ text: caption, quoted: false }];
  const start = map[at];
  const end = map[at + q.length - 1] + 1;
  return [
    { text: caption.slice(0, start), quoted: false },
    { text: caption.slice(start, end), quoted: true },
    { text: caption.slice(end), quoted: false }
  ].filter((p) => p.text.length > 0);
}

// ---- one row and her edits ---------------------------------------------------

export interface Draft {
  kind: SocialEventKind;
  start: string;
  end: string;
  /** '' = every store. */
  locationId: string;
}

export const draftOf = (p: SocialProposal): Draft => ({
  kind: p.kind,
  start: p.start_date,
  end: p.end_date,
  locationId: p.location_id ?? ''
});

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function dayNumber(iso: string): number | null {
  if (!ISO.test(iso)) return null;
  const ms = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(ms)) return null;
  // Date.parse rolls 2026-02-31 over; a real day survives the round trip.
  return new Date(ms).toISOString().slice(0, 10) === iso ? Math.round(ms / 86_400_000) : null;
}

/** Why Confirm is off, in one sentence, or null when the draft can be confirmed. */
export function draftProblem(draft: Draft): string | null {
  const start = dayNumber(draft.start);
  const end = dayNumber(draft.end);
  if (start === null || end === null) return 'Give a first and a last day.';
  if (end < start) return 'The last day is before the first.';
  if (end - start + 1 > LONGEST_DAYS) return `An event can last at most ${LONGEST_DAYS} days.`;
  return null;
}

export const canConfirm = (draft: Draft): boolean => draftProblem(draft) === null;

/** Exactly what Confirm sends: her kind, her dates, her store. */
export function confirmBody(draft: Draft): ConfirmBody {
  return { kind: draft.kind, start_date: draft.start, end_date: draft.end, location_id: draft.locationId || null };
}

const dayWords = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  });

/** "Posted Thu, Nov 12, 2026" from the post's instant, in her browser's day. */
export function postedLine(postedAt: string, timeZone?: string): string {
  const when = new Date(postedAt);
  if (Number.isNaN(when.getTime())) return 'Posted';
  return `Posted ${when.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone })}`;
}

/** "Sat, Nov 21, 2026" or "Sat, Nov 21, 2026 to Sun, Nov 22, 2026". */
export function datesLine(start: string, end: string): string {
  return start === end ? dayWords(start) : `${dayWords(start)} to ${dayWords(end)}`;
}

/** The confirmed list's line: "Sale, Sat, Nov 21, 2026 to Sun, Nov 22, 2026, every store." */
export function confirmedLine(p: SocialProposal): string {
  return `${kindLabel(p.kind)}, ${datesLine(p.start_date, p.end_date)}, ${p.location_name ? `at ${p.location_name}` : 'every store'}.`;
}

export interface ReviewLists {
  toReview: SocialProposal[];
  confirmed: SocialProposal[];
}

/** Suggestions first-day order; confirmed ones newest event first. Dismissed ones are not shown. */
export function reviewLists(rows: ReadonlyArray<SocialProposal> | undefined): ReviewLists {
  const list = [...(rows ?? [])];
  return {
    toReview: list
      .filter((r) => r.status === 'proposed')
      .sort((a, b) => a.start_date.localeCompare(b.start_date) || a.id.localeCompare(b.id)),
    confirmed: list
      .filter((r) => r.status === 'confirmed')
      .sort((a, b) => b.start_date.localeCompare(a.start_date) || a.id.localeCompare(b.id))
  };
}

// ---- the Instagram card --------------------------------------------------------

export type CardState =
  | { kind: 'hidden' }
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'not_set_up'; line: string }
  | { kind: 'connect'; line: string; button: string }
  | { kind: 'connected'; line: string; button: string }
  | { kind: 'reconnect'; line: string; button: string };

export const CARD_TITLE = 'Instagram';
const CONNECT_LINE =
  'Connect your Instagram so Allyvia can suggest the sales and events your posts announce. Nothing goes on your calendar until you confirm it.';

/** What the card shows. A 404 (switched off on this server) or 403 (not her role) hides it. */
export function cardState(state: { data?: SocialConnection; status?: number; loading?: boolean }): CardState {
  if (state.status === 404 || state.status === 403) return { kind: 'hidden' };
  if (state.data === undefined) return state.loading ? { kind: 'loading' } : { kind: 'error' };
  const c = state.data;
  const name = c.username ? `@${c.username}` : 'your account';
  if (c.status === 'connected') return { kind: 'connected', line: `Connected as ${name}.`, button: 'Disconnect' };
  if (c.status === 'needs_reconnect')
    return {
      kind: 'reconnect',
      line: `Instagram stopped letting Allyvia read ${name}. Reconnect to keep suggestions coming.`,
      button: 'Reconnect'
    };
  if (!c.configured) return { kind: 'not_set_up', line: 'Instagram is not set up on this server yet.' };
  return { kind: 'connect', line: CONNECT_LINE, button: 'Connect Instagram' };
}

export const DISCONNECT_CONFIRM = 'Disconnect Instagram? Allyvia stops reading new posts. The events you confirmed stay on your calendar.';

// What the owner reads in plan mode (owner trust T2; docs/owner-trust-design.md §4.1): an evidence status in
// words and an ISO month as a month and year. The status words match the backend's one map
// (agent/trace_composers.py STATUS_WORDS); stored labels keep their ISO months ("Store revenue 2026-11"), and
// the page says them as "November 2026".

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** An evidence status in her words; an unknown status says nothing rather than its raw word. */
export const EVIDENCE_WORDS: Record<string, string> = {
  measured: 'from your own sales',
  measured_series: 'from your own sales',
  assumed: 'assumed',
  policy: 'a set rule',
  owner_stated: 'you told us',
  unproven: 'measured, not yet proven',
  insufficient: 'not enough history',
  no_effect: 'made no measurable difference',
  estimated: 'estimated',
  unobserved: 'not known'
};

export const statusWords = (status: string | null | undefined): string => (status ? (EVIDENCE_WORDS[status] ?? '') : '');

// "2026-11" or "2026_11", standing alone: not part of a full date ("2026-11-14") or a longer number.
const ISO_MONTH = /(?<![\d-])(\d{4})[-_](0[1-9]|1[0-2])(?![\d-])/g;

/** Every ISO month in a label or sentence as "November 2026"; the rest of the text as written. */
export const monthWords = (text: string): string =>
  text.replace(ISO_MONTH, (_match, year: string, month: string) => `${MONTHS[Number(month) - 1]} ${year}`);

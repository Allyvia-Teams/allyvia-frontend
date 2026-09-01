// Pure vocabulary and payload construction for the ALL-17 feedback loop.
//
// Split out of agent.api.ts on the inventoryStock.query.ts precedent: that
// module exists because importing anything that pulls in utils/axios also pulls
// in utils/mockApi, which reads localStorage at module load and therefore
// cannot be imported under vitest's node environment. Keeping the decisions
// here — which reason codes exist, what goes in the body, what counts as
// "back from snooze" — means they are directly testable, and the API module
// stays a thin transport layer with nothing to get wrong.

// The eight codes the backend accepts. Anything outside this list is rejected
// server-side, so the UI never invents one.
export const FEEDBACK_REASON_CODES = [
  'not_relevant',
  'already_doing_it',
  'too_much_effort',
  'cash_flow_timing',
  'too_risky',
  'data_looks_wrong',
  'relationship_constraint',
  'other'
] as const;

export type FeedbackReasonCode = (typeof FEEDBACK_REASON_CODES)[number];

export type FeedbackSentiment = 'up' | 'down';

// Merchant-readable labels. Deliberately first-person-plural and concrete —
// "Already doing this" is something a shop owner recognises; "already_doing_it"
// is something an engineer recognises, and the whole point of the chip row is
// that it gets tapped rather than skipped.
export const FEEDBACK_REASON_LABELS: Record<FeedbackReasonCode, string> = {
  not_relevant: 'Not relevant to us',
  already_doing_it: 'Already doing this',
  too_much_effort: 'Too much work',
  cash_flow_timing: 'Bad timing for cash flow',
  too_risky: 'Too risky',
  data_looks_wrong: 'The numbers look wrong',
  relationship_constraint: 'Supplier or customer relationship',
  other: 'Something else'
};

export const isFeedbackReasonCode = (value: unknown): value is FeedbackReasonCode =>
  typeof value === 'string' && (FEEDBACK_REASON_CODES as readonly string[]).includes(value);

export interface FeedbackInput {
  sentiment: FeedbackSentiment;
  reasonCode?: FeedbackReasonCode | null;
  reasonText?: string | null;
}

export interface FeedbackPayload {
  sentiment: FeedbackSentiment;
  reason_code?: FeedbackReasonCode;
  reason_text?: string;
}

/**
 * Build the POST body for /agent/recommendations/<id>/feedback/.
 *
 * Three rules, each of which exists because the alternative loses information
 * or invents it:
 *
 *  - An unchosen reason is OMITTED, not sent as `other`. The backend already
 *    records an omitted code on a "down" as `other`; sending `other` ourselves
 *    would make a merchant who skipped the chips indistinguishable from one who
 *    deliberately picked "Something else", and those are different signals.
 *  - Reason fields are dropped entirely on "up". A thumbs-up has no chip row,
 *    so any code present is a leftover from a down-tap the merchant changed
 *    their mind about — sending it would attach a complaint to an endorsement.
 *  - Whitespace-only free text is omitted rather than sent blank, so "" and
 *    "they never typed anything" don't have to be told apart downstream.
 */
export const buildFeedbackPayload = ({ sentiment, reasonCode, reasonText }: FeedbackInput): FeedbackPayload => {
  const payload: FeedbackPayload = { sentiment };
  if (sentiment !== 'down') return payload;

  if (isFeedbackReasonCode(reasonCode)) {
    payload.reason_code = reasonCode;
  }
  const trimmed = typeof reasonText === 'string' ? reasonText.trim() : '';
  if (trimmed) {
    payload.reason_text = trimmed;
  }
  return payload;
};

// Snooze windows offered in the UI. 7 is the default because a week is the
// shortest interval that reliably outlasts "I'll deal with it later this week".
export const SNOOZE_DAY_OPTIONS = [3, 7, 14, 30] as const;
export const DEFAULT_SNOOZE_DAYS = 7;

export const MIN_SNOOZE_DAYS = 1;
export const MAX_SNOOZE_DAYS = 30;

/**
 * Clamp to the backend's 1..30 range.
 *
 * Clamped rather than validated-and-thrown: the only callers are our own
 * buttons, so an out-of-range value is a bug in this file, and turning it into
 * a 400 the merchant sees would be the worst of both outcomes. Non-finite input
 * falls back to the default.
 */
export const clampSnoozeDays = (days: number): number => {
  if (!Number.isFinite(days)) return DEFAULT_SNOOZE_DAYS;
  return Math.min(MAX_SNOOZE_DAYS, Math.max(MIN_SNOOZE_DAYS, Math.round(days)));
};

/**
 * Whether a card that came back from the server has an expired snooze on it.
 *
 * A card whose `snoozed_until` is in the past is one the merchant deferred and
 * that has now returned — worth saying so, because a recommendation reappearing
 * with no explanation reads as the system forgetting it was told no.
 * Unparseable or absent dates are false: a hint we cannot justify is worse than
 * no hint.
 */
export const isBackFromSnooze = (snoozedUntil: string | null | undefined, now: Date = new Date()): boolean => {
  if (!snoozedUntil) return false;
  const until = new Date(snoozedUntil).getTime();
  if (Number.isNaN(until)) return false;
  return until <= now.getTime();
};

/** Format a realized-savings figure. Whole dollars — cents imply a precision
 *  a 14-to-90-day outcome measurement does not have. */
export const formatSavingsDollars = (value: number | string | null | undefined): string => {
  const amount = typeof value === 'string' ? Number(value) : value;
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '$0';
  return `$${Math.round(amount).toLocaleString()}`;
};

import type { MemberLookupStatus } from '../types/pos.types';

/**
 * Everything the Inner Circle number field renders, and what the sale sends.
 *
 * THE FIELD MUST NEVER BLOCK A SALE. Every failure phase still yields
 * `continueIntent: 'advance'` — a loyalty lookup is worth nothing next to a
 * customer standing at the counter with a card in their hand.
 *
 * Three things this file exists to make impossible:
 *
 *   1. An errored lookup rendering as a success. `chipTone` is a total record
 *      over `phase`, not a chain of ifs, so there is no path to a tone that
 *      was not written down for that phase.
 *   2. A throttled lookup reading as "not a member". A 429 is a rate limit,
 *      not an answer, and the per-phone budget is SHARED ACROSS EVERY TILL —
 *      so a busy shop hits it on customers who are perfectly good members.
 *   3. A `linked` result being worded as an opt-in. `linked` INCLUDES a
 *      membership the customer DECLINED — the till is told the same thing
 *      either way, deliberately, because confirming who a number belongs to
 *      happens on the customer's own device. So the copy says "already on
 *      file" and promises nothing.
 */

export type MemberLookupFailureKind = 'invalid_phone' | 'throttled' | 'auth' | 'role' | 'offline' | 'unknown';

export interface MemberLookupFailure {
  kind: MemberLookupFailureKind;
  /** The server's own sentence when it gave one, else ''. */
  serverMessage: string;
  /** Seconds, from Retry-After or from the throttle sentence. Null when neither is readable. */
  retryAfterSeconds: number | null;
}

export type MemberLookupPhase =
  | 'idle'
  | 'unchecked'
  | 'checking'
  | 'created'
  | 'linked_new'
  | 'linked'
  | 'rejected'
  | 'throttled'
  | 'failed';

export type MemberLookupTone = 'none' | 'neutral' | 'info' | 'success' | 'warning' | 'error';

export interface MemberLookupInput {
  /** Live field text, exactly as typed. */
  input: string;
  /** The string sent on the last attempt, so a stale result can be dropped. */
  attemptedPhone: string | null;
  status: MemberLookupStatus | null;
  error: unknown;
  isPending: boolean;
  /** A contact is already chosen in the customer search panel. */
  hasSelectedCustomer: boolean;
}

export interface MemberLookupView {
  phase: MemberLookupPhase;
  failureKind: MemberLookupFailureKind | null;
  chipLabel: string;
  chipTone: MemberLookupTone;
  helperLabel: string;
  attachLabel: string;
  overrideLabel: string;
  preChargeWarningLabel: string;
  retryAfterSeconds: number | null;
  canLookup: boolean;
  continueIntent: 'advance' | 'lookup' | 'wait';
  /** What to put on Order.memberPhone. Null means send nothing. */
  memberPhone: string | null;
}

/** The backend's max_length on `phone`. Longer is a guaranteed 400. */
const MAX_PHONE_LENGTH = 32;

/** Digits only, with a US country code dropped so "1 555…" and "555…" match. */
export function memberPhoneDigits(value: string): string {
  const digits = (value || '').replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
}

/**
 * Worth spending a lookup on. Deliberately permissive — the backend is the
 * authority on what normalizes, and this only avoids calls that are certain
 * to fail. Being strict here would reject valid international numbers.
 */
export function isPossibleMemberPhone(value: string): boolean {
  const raw = (value || '').trim();
  if (!raw || raw.length > MAX_PHONE_LENGTH) return false;
  if (/[^\d\s()+.\-]/.test(raw)) return false;
  const digits = memberPhoneDigits(raw);
  return digits.length >= 10 && digits.length <= 15;
}

/** Digit equality, so a cosmetic reformat does not throw away a settled result. */
export function sameMemberPhone(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return memberPhoneDigits(a) === memberPhoneDigits(b);
}

function asBody(error: unknown): Record<string, unknown> | null {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  return data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
}

function firstString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return '';
}

/**
 * Classify a rejection without assuming its shape.
 *
 * A 401 usually does NOT arrive here as a 401: utils/axios intercepts it,
 * attempts a refresh, and on failure rejects with a bare Error carrying no
 * `.response` at all. So "no response" is a real, common branch — not a
 * defensive afterthought.
 */
export function classifyMemberLookupError(error: unknown): MemberLookupFailure {
  const none: MemberLookupFailure = { kind: 'unknown', serverMessage: '', retryAfterSeconds: null };
  if (!error) return none;

  const response = (error as { response?: { status?: number; headers?: Record<string, string> } })?.response;
  if (!response) return { ...none, kind: 'offline' };

  const status = response.status;
  const body = asBody(error);
  const detail = firstString(body?.detail);

  if (status === 429) {
    const header = response.headers?.['retry-after'] ?? response.headers?.['Retry-After'];
    const fromHeader = header ? Number.parseInt(String(header), 10) : Number.NaN;
    const matched = /in\s+(\d+)\s+seconds?/i.exec(detail);
    const seconds = Number.isFinite(fromHeader) ? fromHeader : matched ? Number.parseInt(matched[1], 10) : Number.NaN;
    return { kind: 'throttled', serverMessage: detail, retryAfterSeconds: Number.isFinite(seconds) ? seconds : null };
  }
  if (status === 400 && body && 'phone' in body) {
    return { ...none, kind: 'invalid_phone', serverMessage: firstString(body.phone) };
  }
  if (status === 400 && typeof body?.error === 'string') {
    return { ...none, kind: 'role', serverMessage: body.error };
  }
  if (status === 401 || status === 403) return { ...none, kind: 'auth', serverMessage: detail };
  return { ...none, serverMessage: detail };
}

const CHIP_LABELS: Record<MemberLookupPhase, string> = {
  idle: '',
  unchecked: 'Not checked yet',
  checking: 'Checking…',
  created: 'Added to Inner Circle',
  linked_new: 'Linked to this store',
  linked: 'Already on file',
  rejected: 'Not a usable number',
  throttled: "Couldn't check right now",
  failed: "Couldn't check"
};

/** Total by construction — a failure phase can never reach a success tone. */
const CHIP_TONES: Record<MemberLookupPhase, MemberLookupTone> = {
  idle: 'none',
  unchecked: 'neutral',
  checking: 'neutral',
  created: 'success',
  linked_new: 'success',
  linked: 'info',
  rejected: 'warning',
  throttled: 'warning',
  failed: 'error'
};

const THROTTLED_HELPER =
  "Too many lookups for this number just now. That's a rate limit, not an answer — it does not mean they aren't a member. Nothing was created, so checking again is safe.";

const LINKED_HELPER = "This number was already on file at this store. The till can't see whether they opted in — don't assume they did.";

function failureHelper(kind: MemberLookupFailureKind | null): string {
  if (kind === 'auth') return "The lookup didn't go through — your session may have expired. Nothing was created.";
  if (kind === 'role') return "The lookup didn't go through — this till has no store selected. Nothing was created.";
  return "The lookup didn't reach Allyvia. Nothing was created — you can try again.";
}

export function buildMemberLookupView(input: MemberLookupInput): MemberLookupView {
  const { attemptedPhone, status, error, isPending, hasSelectedCustomer } = input;
  const text = (input.input || '').trim();
  const matches = sameMemberPhone(text, attemptedPhone);
  const failure = error ? classifyMemberLookupError(error) : null;

  let phase: MemberLookupPhase;
  if (text === '') {
    phase = 'idle';
  } else if (isPending && matches) {
    phase = 'checking';
  } else if (status && matches) {
    phase = status;
  } else if (failure && matches) {
    phase = failure.kind === 'invalid_phone' ? 'rejected' : failure.kind === 'throttled' ? 'throttled' : 'failed';
  } else {
    // Includes the stale cases: the clerk edited the number after a result
    // or mid-flight, so the previous customer's answer is dropped.
    phase = 'unchecked';
  }

  const failureKind = phase === 'rejected' || phase === 'throttled' || phase === 'failed' ? (failure?.kind ?? null) : null;

  // Withheld only when the backend has already refused to normalize this exact
  // string — sending it again guarantees an unattached sale and buys nothing.
  const memberPhone = text !== '' && isPossibleMemberPhone(text) && phase !== 'rejected' ? text : null;

  const canLookup = isPossibleMemberPhone(text) && !isPending && (phase === 'unchecked' || phase === 'throttled' || phase === 'failed');

  const continueIntent: MemberLookupView['continueIntent'] =
    phase === 'checking' ? 'wait' : phase === 'unchecked' && canLookup ? 'lookup' : 'advance';

  const helperByPhase: Record<MemberLookupPhase, string> = {
    idle: '',
    unchecked: '',
    checking: '',
    created: 'New number. Member created and linked to this store.',
    linked_new: 'Already an Allyvia member elsewhere. This store now has its own link.',
    linked: LINKED_HELPER,
    rejected: `${failure?.serverMessage || 'Enter a valid phone number.'} Nothing was created — correct the number or clear the field.`,
    throttled: THROTTLED_HELPER + (failure?.retryAfterSeconds ? ` Try again in about ${failure.retryAfterSeconds} seconds.` : ''),
    failed: failureHelper(failureKind)
  };

  const attachByPhase: Record<MemberLookupPhase, string> = {
    idle: '',
    unchecked: "Check the number so this sale is credited — an unchecked number that isn't already a member won't attach.",
    checking: '',
    created: 'This sale will be credited to them.',
    linked_new: 'This sale will be credited to them.',
    linked: 'This sale will be credited to them.',
    rejected: '',
    throttled: "This sale will still be credited if the number is already a member. If it isn't, nothing will be added.",
    failed: "This sale will still be credited if the number is already a member. If it isn't, nothing will be added."
  };

  const unconfirmed = phase === 'unchecked' || phase === 'throttled' || phase === 'failed';

  return {
    phase,
    failureKind,
    chipLabel: CHIP_LABELS[phase],
    chipTone: CHIP_TONES[phase],
    helperLabel: helperByPhase[phase],
    attachLabel: attachByPhase[phase],
    overrideLabel:
      hasSelectedCustomer && memberPhone !== null
        ? 'A customer is already selected, so the sale will be credited to them and not to this number.'
        : '',
    preChargeWarningLabel:
      memberPhone !== null && unconfirmed
        ? "Inner Circle number wasn't confirmed. If it isn't already a member, this sale won't be credited."
        : '',
    retryAfterSeconds: failure?.retryAfterSeconds ?? null,
    canLookup,
    continueIntent,
    memberPhone
  };
}

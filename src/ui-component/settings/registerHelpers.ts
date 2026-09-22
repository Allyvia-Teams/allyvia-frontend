// Pure logic behind Settings → Registers. Everything here is a plain function
// because vitest runs in the `node` environment with no jsdom and no
// testing-library, so nothing rendered can be asserted -- the same reason
// employee-management/statusColumns.ts and views/inventory/matrix.ts exist.
//
// `now` is a PARAMETER on every time-dependent function, never Date.now().
// A countdown that read the clock itself could only be tested by freezing it.

import type { Location } from 'api/inventoryStock.api';
import type { RegisterDeviceRow } from 'api/register.api';
import type { StripeReaderInfo } from 'api/stripe.api';

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

export type ChipColor = 'success' | 'warning' | 'error' | 'default';

export interface StatusChip {
  label: string;
  color: ChipColor;
}

/**
 * How a device row reads in the status column.
 *
 * The case worth having a function for is the fourth one: a device still
 * `pending` whose pairing code has EXPIRED. The server keeps the row pending
 * (the code is only checked when someone tries to use it), so a chip driven by
 * `status` alone would tell an owner the iPad is "waiting to pair" when in fact
 * the code they wrote down is dead and the only way forward is to reissue.
 */
export const deviceStatusChip = (row: RegisterDeviceRow, now: Date): StatusChip => {
  if (row.status === 'revoked') return { label: 'Revoked', color: 'error' };
  if (row.status === 'active') return { label: 'Active', color: 'success' };
  if (row.status === 'pending') {
    const expiry = row.pairing_expires_at ? Date.parse(row.pairing_expires_at) : NaN;
    if (Number.isNaN(expiry)) return { label: 'Needs a code', color: 'warning' };
    return expiry <= now.getTime() ? { label: 'Code expired', color: 'warning' } : { label: 'Waiting to pair', color: 'warning' };
  }
  // An unknown status is shown verbatim rather than guessed at -- the server
  // owns this vocabulary and inventing a label would hide the new state.
  return { label: row.status || 'Unknown', color: 'default' };
};

export interface Countdown {
  secondsLeft: number;
  label: string;
  expired: boolean;
}

const countdownFrom = (secondsLeft: number): Countdown => {
  if (secondsLeft <= 0) return { secondsLeft: 0, label: 'Expired', expired: true };
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return { secondsLeft, label: `${minutes}:${String(seconds).padStart(2, '0')}`, expired: false };
};

/**
 * "4:58" until a pairing code dies, from a DURATION.
 *
 * This is the form the freshly-issued-code dialog uses, because the create and
 * reissue responses carry `pairing_code_ttl_seconds` -- a duration, immune to
 * clock skew -- alongside the absolute expiry.
 *
 * Anchoring on the absolute time instead makes a wrong browser clock look like
 * a dead code: an owner whose laptop is 20 minutes fast sees a perfectly valid
 * 8-character code under a red "This code has expired", reissues, sees the same
 * thing, and cannot open the shop. The server would have accepted any of them.
 *
 * @param issuedAt when the response arrived, by this browser's clock
 * @param ttlSeconds the server's stated lifetime
 */
export const ttlCountdown = (issuedAt: Date, ttlSeconds: number, now: Date): Countdown => {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) return { secondsLeft: 0, label: 'Expired', expired: true };
  const elapsed = Math.floor((now.getTime() - issuedAt.getTime()) / 1000);
  // Both anchors come from the same clock, so only elapsed time matters -- an
  // offset cancels out, and a clock that jumps backwards cannot add time.
  return countdownFrom(Math.max(0, Math.ceil(ttlSeconds - Math.max(0, elapsed))));
};

/**
 * "4:58" until a pairing code dies, from the absolute expiry. Clamped at zero:
 * a negative countdown ("-0:03") reads as a bug rather than as an expiry.
 *
 * Used where no duration is available (a pending row in the table, whose code
 * was issued in some earlier session). Prefer ttlCountdown when the response
 * that minted the code is in hand.
 */
export const pairingCountdown = (expiresAt: string | null, now: Date): Countdown => {
  const expiry = expiresAt ? Date.parse(expiresAt) : NaN;
  if (Number.isNaN(expiry)) return { secondsLeft: 0, label: 'Expired', expired: true };
  return countdownFrom(Math.max(0, Math.ceil((expiry - now.getTime()) / 1000)));
};

/**
 * "3 min ago" for the last-seen column. There is no relative-time formatter in
 * the repo (utils/dateUtils.ts has formatDate and nothing else), so this is it.
 *
 * A timestamp in the FUTURE reads as "just now", not "in 3 minutes": the only
 * way a device is seen in the future is clock skew between the iPad's host and
 * this browser, and a store does not need to be told about that.
 */
export const formatLastSeen = (iso: string | null, now: Date): string => {
  if (!iso) return 'Never';
  const seen = Date.parse(iso);
  if (Number.isNaN(seen)) return 'Never';
  const seconds = Math.floor((now.getTime() - seen) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days <= 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(seen).toLocaleDateString();
};

// ---------------------------------------------------------------------------
// Readers
// ---------------------------------------------------------------------------

/**
 * A reader's store name.
 *
 * StripeReaderInfo.location_id is the STRIPE location id (the server sends
 * `reader.location.stripe_location_id`), not an Allyvia Location UUID -- so
 * this joins through Location.stripe_terminal_location_id. Without the join the
 * column would show `tml_1A2b3C`, which names nothing an owner recognises.
 */
export const readerLocationName = (reader: StripeReaderInfo, locations: Location[]): string => {
  if (!reader.location_id) return 'Unassigned';
  const match = locations.find((location) => location.stripe_terminal_location_id === reader.location_id);
  return match ? match.name : reader.location_id;
};

/** Stripe reports 'online' | 'offline'; anything else is shown as-is. */
export const readerStatusChip = (reader: StripeReaderInfo): StatusChip => {
  if (reader.status === 'online') return { label: 'Online', color: 'success' };
  if (reader.status === 'offline') return { label: 'Offline', color: 'default' };
  return { label: reader.status || 'Unknown', color: 'default' };
};

/**
 * The reader's display name and subtitle, matching what the POS checkout
 * picker already shows (features/pos/components/CheckoutModal.tsx) so the same
 * hardware is not named two different ways in one product.
 */
export const readerLabel = (reader: StripeReaderInfo): string =>
  reader.label || reader.serial_number || reader.stripe_reader_id || reader.id;

// ---------------------------------------------------------------------------
// The three company register settings
// ---------------------------------------------------------------------------

export interface RegisterSettingsForm {
  register_idle_timeout_seconds: string;
  register_low_stock_threshold: string;
  register_discount_limit_pct: string;
}

export type RegisterSettingsField = keyof RegisterSettingsForm;

/**
 * Bounds mirroring company/serializers.py's validators, so a typo is caught
 * before a round trip. The server is still the authority -- these exist to give
 * an immediate message, not to be the only check.
 */
export const REGISTER_SETTINGS_BOUNDS: Record<RegisterSettingsField, { min: number; max: number }> = {
  register_idle_timeout_seconds: { min: 15, max: 3600 },
  register_low_stock_threshold: { min: 0, max: 1000 },
  // 100 is the cap because pos/policy.py compares Σ line discounts against
  // this as a percentage of the subtotal: past 100 a keyholder can take a sale
  // below zero, which is not a discount but a payout.
  register_discount_limit_pct: { min: 0, max: 100 }
};

export const REGISTER_SETTINGS_FIELDS: RegisterSettingsField[] = [
  'register_idle_timeout_seconds',
  'register_low_stock_threshold',
  'register_discount_limit_pct'
];

export type RegisterSettingsErrors = Partial<Record<RegisterSettingsField, string>>;

const LABELS: Record<RegisterSettingsField, string> = {
  register_idle_timeout_seconds: 'Idle timeout',
  register_low_stock_threshold: 'Low-stock threshold',
  register_discount_limit_pct: 'Keyholder discount limit'
};

export const validateRegisterSettings = (form: RegisterSettingsForm): RegisterSettingsErrors => {
  const errors: RegisterSettingsErrors = {};
  REGISTER_SETTINGS_FIELDS.forEach((field) => {
    const raw = (form[field] ?? '').trim();
    if (raw === '') {
      errors[field] = `${LABELS[field]} is required.`;
      return;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      errors[field] = `${LABELS[field]} must be a whole number.`;
      return;
    }
    const { min, max } = REGISTER_SETTINGS_BOUNDS[field];
    if (value < min || value > max) {
      errors[field] = `${LABELS[field]} must be between ${min} and ${max}.`;
    }
  });
  return errors;
};

/**
 * The changed keys only, as NUMBERS.
 *
 * Deliberately not ui-component/settings/BusinessInfo.tsx's differ, which
 * `.trim()`s every value on the way out because every field it owns is a
 * string. Reused here it would PUT "90" for an integer column.
 *
 * The zero case is the one to keep an eye on: a low-stock threshold of 0 means
 * "never show the amber badge" and is a real choice, so this compares against
 * the original rather than testing the new value for truthiness.
 */
export const registerSettingsPayload = (
  form: RegisterSettingsForm,
  original: RegisterSettingsForm
): Partial<Record<RegisterSettingsField, number>> => {
  if (Object.keys(validateRegisterSettings(form)).length > 0) return {};
  const payload: Partial<Record<RegisterSettingsField, number>> = {};
  REGISTER_SETTINGS_FIELDS.forEach((field) => {
    const next = (form[field] ?? '').trim();
    const before = (original[field] ?? '').trim();
    // Compared numerically, so "090" is not treated as a change to 90 -- but
    // a BLANK original compares as NaN rather than as Number(''), which is 0.
    // Otherwise typing 0 into a field the server never sent a value for would
    // look unchanged and never be saved.
    const beforeValue = before === '' ? NaN : Number(before);
    if (next !== '' && Number(next) !== beforeValue) {
      payload[field] = Number(next);
    }
  });
  return payload;
};

/**
 * Has anything been typed? Independent of whether it is VALID.
 *
 * Kept separate from registerSettingsPayload, which deliberately returns {}
 * while any field is invalid. Deriving "dirty" from that payload strands the
 * form: clear the idle timeout with backspace and the field is invalid, so the
 * payload is empty, so dirty is false, so BOTH Save and Reset go grey -- and
 * the original value is no longer shown anywhere on the page.
 */
export const registerSettingsDirty = (form: RegisterSettingsForm, original: RegisterSettingsForm): boolean =>
  REGISTER_SETTINGS_FIELDS.some((field) => (form[field] ?? '').trim() !== (original[field] ?? '').trim());

/** The server's numbers as form strings. */
export const registerSettingsForm = (source: Partial<Record<RegisterSettingsField, number | null>>): RegisterSettingsForm => ({
  register_idle_timeout_seconds: source.register_idle_timeout_seconds == null ? '' : String(source.register_idle_timeout_seconds),
  register_low_stock_threshold: source.register_low_stock_threshold == null ? '' : String(source.register_low_stock_threshold),
  register_discount_limit_pct: source.register_discount_limit_pct == null ? '' : String(source.register_discount_limit_pct)
});

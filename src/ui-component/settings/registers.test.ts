import { describe, expect, it } from 'vitest';

import {
  REGISTER_SETTINGS_BOUNDS,
  deviceStatusChip,
  formatLastSeen,
  pairingCountdown,
  readerLabel,
  readerLocationName,
  readerStatusChip,
  registerSettingsDirty,
  registerSettingsForm,
  registerSettingsPayload,
  ttlCountdown,
  validateRegisterSettings,
  type RegisterSettingsForm
} from './registers';
import type { Location } from 'api/inventoryStock.api';
import type { RegisterDeviceRow } from 'api/register.api';
import type { StripeReaderInfo } from 'api/stripe.api';

const NOW = new Date('2026-09-03T17:00:00.000Z');

const device = (over: Partial<RegisterDeviceRow> = {}): RegisterDeviceRow => ({
  id: 'd1',
  name: 'Front till',
  status: 'active',
  location: { id: 'l1', name: 'Broad Ripple' },
  pairing_expires_at: null,
  paired_at: '2026-09-01T12:00:00.000Z',
  last_seen_at: '2026-09-03T16:59:30.000Z',
  revoked_at: null,
  created_at: '2026-09-01T11:00:00.000Z',
  ...over
});

const reader = (over: Partial<StripeReaderInfo> = {}): StripeReaderInfo => ({
  id: 'r1',
  stripe_reader_id: 'tmr_123',
  label: 'Counter reader',
  device_type: 'stripe_s700',
  serial_number: 'STR-0001',
  status: 'online',
  location_id: 'tml_abc',
  last_seen_at: null,
  ...over
});

const location = (over: Partial<Location> = {}): Location => ({
  id: 'l1',
  name: 'Broad Ripple',
  address: {},
  stripe_terminal_location_id: 'tml_abc',
  stripe_terminal_display_name: 'Broad Ripple',
  is_default: true,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  ...over
});

const form = (over: Partial<RegisterSettingsForm> = {}): RegisterSettingsForm => ({
  register_idle_timeout_seconds: '90',
  register_low_stock_threshold: '4',
  register_discount_limit_pct: '20',
  ...over
});

describe('deviceStatusChip', () => {
  it('reads active and revoked straight off the status', () => {
    expect(deviceStatusChip(device({ status: 'active' }), NOW)).toEqual({ label: 'Active', color: 'success' });
    expect(deviceStatusChip(device({ status: 'revoked' }), NOW)).toEqual({ label: 'Revoked', color: 'error' });
  });

  it('distinguishes a live pairing code from an expired one', () => {
    // The whole reason this is a function. The server leaves the row `pending`
    // either way, so a chip driven by status alone would tell an owner the iPad
    // is still waiting when the code they wrote down is dead.
    const live = device({ status: 'pending', pairing_expires_at: '2026-09-03T17:05:00.000Z' });
    const dead = device({ status: 'pending', pairing_expires_at: '2026-09-03T16:55:00.000Z' });
    expect(deviceStatusChip(live, NOW).label).toBe('Waiting to pair');
    expect(deviceStatusChip(dead, NOW).label).toBe('Code expired');
  });

  it('says a pending device with no code at all needs one', () => {
    expect(deviceStatusChip(device({ status: 'pending', pairing_expires_at: null }), NOW).label).toBe('Needs a code');
  });

  it('shows an unrecognised status verbatim instead of guessing', () => {
    expect(deviceStatusChip(device({ status: 'quarantined' }), NOW)).toEqual({ label: 'quarantined', color: 'default' });
  });
});

describe('pairingCountdown', () => {
  it('counts down in m:ss with a padded seconds field', () => {
    expect(pairingCountdown('2026-09-03T17:04:58.000Z', NOW).label).toBe('4:58');
    expect(pairingCountdown('2026-09-03T17:00:05.000Z', NOW).label).toBe('0:05');
    expect(pairingCountdown('2026-09-03T17:15:00.000Z', NOW).label).toBe('15:00');
  });

  it('clamps at expiry rather than going negative', () => {
    const past = pairingCountdown('2026-09-03T16:50:00.000Z', NOW);
    expect(past).toEqual({ secondsLeft: 0, label: 'Expired', expired: true });
  });

  it('treats the exact instant of expiry as expired, not as 0:00', () => {
    // The boundary the comparison actually turns on.
    expect(pairingCountdown('2026-09-03T17:00:00.000Z', NOW).expired).toBe(true);
    expect(pairingCountdown('2026-09-03T17:00:01.000Z', NOW)).toMatchObject({ label: '0:01', expired: false });
  });

  it('treats a missing or unparseable expiry as expired', () => {
    expect(pairingCountdown(null, NOW).expired).toBe(true);
    expect(pairingCountdown('not a date', NOW).expired).toBe(true);
  });
});

describe('formatLastSeen', () => {
  it('never says a device was seen in the future', () => {
    // Clock skew between the iPad's host and this browser is the only way this
    // happens, and "in 3 minutes" would read as a bug to the person holding it.
    expect(formatLastSeen('2026-09-03T17:03:00.000Z', NOW)).toBe('Just now');
  });

  it('scales through minutes, hours and days', () => {
    expect(formatLastSeen('2026-09-03T16:59:30.000Z', NOW)).toBe('Just now');
    expect(formatLastSeen('2026-09-03T16:57:00.000Z', NOW)).toBe('3 min ago');
    expect(formatLastSeen('2026-09-03T16:00:00.000Z', NOW)).toBe('1 hr ago');
    expect(formatLastSeen('2026-09-03T12:00:00.000Z', NOW)).toBe('5 hrs ago');
    expect(formatLastSeen('2026-09-02T12:00:00.000Z', NOW)).toBe('1 day ago');
    expect(formatLastSeen('2026-08-31T12:00:00.000Z', NOW)).toBe('3 days ago');
  });

  it('switches from "n days ago" to a date at the 7-day boundary', () => {
    // Asserted in both directions and against the real output. `not.toContain
    // ('ago')` alone would pass for 'Never', 'Just now' or an empty string.
    expect(formatLastSeen('2026-08-27T17:00:00.000Z', NOW)).toBe('7 days ago');
    const eightDays = '2026-08-26T17:00:00.000Z';
    expect(formatLastSeen(eightDays, NOW)).toBe(new Date(Date.parse(eightDays)).toLocaleDateString());
  });

  it('says Never for nothing, and for something unparseable', () => {
    expect(formatLastSeen(null, NOW)).toBe('Never');
    expect(formatLastSeen('rubbish', NOW)).toBe('Never');
  });
});

describe('readerLocationName', () => {
  it('joins the STRIPE location id to an Allyvia store name', () => {
    // reader.location_id is a Stripe id, not a Location UUID; without the join
    // this column reads "tml_abc", which names nothing an owner recognises.
    expect(readerLocationName(reader(), [location()])).toBe('Broad Ripple');
  });

  it('falls back to the raw id when no store claims it, and says so when unassigned', () => {
    expect(readerLocationName(reader(), [location({ stripe_terminal_location_id: 'tml_other' })])).toBe('tml_abc');
    expect(readerLocationName(reader({ location_id: null }), [location()])).toBe('Unassigned');
  });
});

describe('readerLabel and readerStatusChip', () => {
  it('falls back through label, serial and id the way checkout does', () => {
    expect(readerLabel(reader())).toBe('Counter reader');
    expect(readerLabel(reader({ label: '' }))).toBe('STR-0001');
    expect(readerLabel(reader({ label: '', serial_number: '' }))).toBe('tmr_123');
  });

  it('maps online and offline and passes anything else through', () => {
    expect(readerStatusChip(reader()).color).toBe('success');
    expect(readerStatusChip(reader({ status: 'offline' })).label).toBe('Offline');
    expect(readerStatusChip(reader({ status: 'rebooting' })).label).toBe('rebooting');
  });
});

describe('validateRegisterSettings', () => {
  it('accepts the defaults', () => {
    expect(validateRegisterSettings(form())).toEqual({});
  });

  it('mirrors the server bound that keeps a keyholder from paying the customer', () => {
    expect(REGISTER_SETTINGS_BOUNDS.register_discount_limit_pct).toEqual({ min: 0, max: 100 });
    expect(validateRegisterSettings(form({ register_discount_limit_pct: '101' })).register_discount_limit_pct).toBe(
      'Keyholder discount limit must be between 0 and 100.'
    );
    expect(validateRegisterSettings(form({ register_discount_limit_pct: '100' }))).toEqual({});
    expect(validateRegisterSettings(form({ register_discount_limit_pct: '0' }))).toEqual({});
  });

  it('bounds the idle timeout at both ends', () => {
    expect(validateRegisterSettings(form({ register_idle_timeout_seconds: '14' })).register_idle_timeout_seconds).toContain(
      'between 15 and 3600'
    );
    expect(validateRegisterSettings(form({ register_idle_timeout_seconds: '3601' })).register_idle_timeout_seconds).toBeTruthy();
    expect(validateRegisterSettings(form({ register_idle_timeout_seconds: '15' }))).toEqual({});
    expect(validateRegisterSettings(form({ register_idle_timeout_seconds: '3600' }))).toEqual({});
  });

  it('accepts a low-stock threshold of zero', () => {
    // "Never show the amber badge" is a real choice; a required-and-truthy
    // check would reject it.
    expect(validateRegisterSettings(form({ register_low_stock_threshold: '0' }))).toEqual({});
    expect(validateRegisterSettings(form({ register_low_stock_threshold: '1001' })).register_low_stock_threshold).toBeTruthy();
  });

  it('rejects blanks, decimals and rubbish with a field-specific sentence', () => {
    expect(validateRegisterSettings(form({ register_idle_timeout_seconds: '' })).register_idle_timeout_seconds).toBe(
      'Idle timeout is required.'
    );
    expect(validateRegisterSettings(form({ register_discount_limit_pct: '20.5' })).register_discount_limit_pct).toBe(
      'Keyholder discount limit must be a whole number.'
    );
    expect(validateRegisterSettings(form({ register_low_stock_threshold: 'four' })).register_low_stock_threshold).toContain('whole number');
    expect(validateRegisterSettings(form({ register_low_stock_threshold: '-1' })).register_low_stock_threshold).toBeTruthy();
  });
});

describe('registerSettingsPayload', () => {
  it('sends nothing when nothing changed', () => {
    expect(registerSettingsPayload(form(), form())).toEqual({});
  });

  it('sends NUMBERS, not the strings the inputs hold', () => {
    // BusinessInfo's differ .trim()s every value because all its fields are
    // strings; reused here it would PUT "120" into an integer column.
    const payload = registerSettingsPayload(form({ register_idle_timeout_seconds: '120' }), form());
    expect(payload).toEqual({ register_idle_timeout_seconds: 120 });
    expect(typeof payload.register_idle_timeout_seconds).toBe('number');
  });

  it('sends a zero, which a truthiness check would drop', () => {
    expect(registerSettingsPayload(form({ register_low_stock_threshold: '0' }), form())).toEqual({
      register_low_stock_threshold: 0
    });
  });

  it('sends a 0 typed into a field the server never gave a value for', () => {
    // Number('') is 0, so comparing numerically against a blank original would
    // read a deliberate 0 as unchanged and never save it. Reachable whenever
    // this frontend meets a backend whose company payload lacks the key.
    expect(registerSettingsPayload(form({ register_low_stock_threshold: '0' }), form({ register_low_stock_threshold: '' }))).toEqual({
      register_low_stock_threshold: 0
    });
  });

  it('does not treat a re-typed number as a change', () => {
    expect(registerSettingsPayload(form({ register_idle_timeout_seconds: '090' }), form())).toEqual({});
    expect(registerSettingsPayload(form({ register_discount_limit_pct: ' 20 ' }), form())).toEqual({});
  });

  it('sends nothing at all while any field is invalid', () => {
    // Half a save is worse than none: the owner would see one field take and
    // the other silently not.
    const invalid = form({ register_idle_timeout_seconds: '120', register_discount_limit_pct: '900' });
    expect(registerSettingsPayload(invalid, form())).toEqual({});
  });

  it('sends every changed field together', () => {
    const next = form({ register_idle_timeout_seconds: '30', register_low_stock_threshold: '2', register_discount_limit_pct: '10' });
    expect(registerSettingsPayload(next, form())).toEqual({
      register_idle_timeout_seconds: 30,
      register_low_stock_threshold: 2,
      register_discount_limit_pct: 10
    });
  });
});

describe('registerSettingsForm', () => {
  it('turns the server numbers into input strings, zero included', () => {
    expect(
      registerSettingsForm({ register_idle_timeout_seconds: 90, register_low_stock_threshold: 0, register_discount_limit_pct: 20 })
    ).toEqual({ register_idle_timeout_seconds: '90', register_low_stock_threshold: '0', register_discount_limit_pct: '20' });
  });

  it('leaves a missing value blank rather than inventing a default', () => {
    expect(registerSettingsForm({}).register_idle_timeout_seconds).toBe('');
  });
});

describe('ttlCountdown', () => {
  const ISSUED = new Date('2026-09-03T17:00:00.000Z');

  it('counts down from the server-stated duration', () => {
    expect(ttlCountdown(ISSUED, 900, new Date('2026-09-03T17:00:00.000Z')).label).toBe('15:00');
    expect(ttlCountdown(ISSUED, 900, new Date('2026-09-03T17:10:02.000Z')).label).toBe('4:58');
    expect(ttlCountdown(ISSUED, 900, new Date('2026-09-03T17:15:00.000Z')).expired).toBe(true);
  });

  it('IS IMMUNE TO A WRONG BROWSER CLOCK, which is the whole point', () => {
    // Both anchors come from the same clock, so an offset cancels. Counted
    // against the server's absolute expiry instead, an owner whose laptop is 20
    // minutes fast sees a perfectly valid code under a red "expired", reissues,
    // sees it again, and cannot open the shop -- while the iPad would have
    // accepted any of those codes.
    const skewed = new Date('2026-09-03T17:20:00.000Z'); // "now", 20 min fast
    const issuedOnTheSameSkewedClock = new Date('2026-09-03T17:20:00.000Z');
    expect(ttlCountdown(issuedOnTheSameSkewedClock, 900, skewed).label).toBe('15:00');
    // The absolute-expiry form, given the server's real expiry, calls it dead.
    expect(pairingCountdown('2026-09-03T17:15:00.000Z', skewed).expired).toBe(true);
  });

  it('cannot gain time from a clock that jumps backwards', () => {
    expect(ttlCountdown(ISSUED, 900, new Date('2026-09-03T16:50:00.000Z')).label).toBe('15:00');
  });

  it('treats a missing or nonsensical TTL as expired', () => {
    expect(ttlCountdown(ISSUED, 0, ISSUED).expired).toBe(true);
    expect(ttlCountdown(ISSUED, NaN, ISSUED).expired).toBe(true);
    expect(ttlCountdown(ISSUED, -5, ISSUED).expired).toBe(true);
  });
});

describe('registerSettingsDirty', () => {
  it('is true for a change and false for none', () => {
    expect(registerSettingsDirty(form(), form())).toBe(false);
    expect(registerSettingsDirty(form({ register_idle_timeout_seconds: '120' }), form())).toBe(true);
  });

  it('IS TRUE WHILE A FIELD IS INVALID, unlike the payload', () => {
    // The bug this function exists for: dirty derived from the payload (which
    // is deliberately {} while anything is invalid) greys out Reset at exactly
    // the moment it is needed. Clear the idle timeout with backspace and the
    // original value is no longer anywhere on the page.
    const cleared = form({ register_idle_timeout_seconds: '' });
    expect(registerSettingsPayload(cleared, form())).toEqual({});
    expect(registerSettingsDirty(cleared, form())).toBe(true);

    const belowFloor = form({ register_idle_timeout_seconds: '5' });
    expect(registerSettingsPayload(belowFloor, form())).toEqual({});
    expect(registerSettingsDirty(belowFloor, form())).toBe(true);
  });

  it('ignores whitespace-only differences', () => {
    expect(registerSettingsDirty(form({ register_idle_timeout_seconds: ' 90 ' }), form())).toBe(false);
  });
});

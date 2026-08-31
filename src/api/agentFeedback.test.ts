import { describe, expect, it } from 'vitest';

// Imported from the pure module, not from agent.api: that pulls in utils/axios
// → utils/mockApi.ts, which reads localStorage at module load and therefore
// cannot be imported under vitest's node environment at all. Same reason
// inventoryStock.query.ts exists.
import {
  FEEDBACK_REASON_CODES,
  FEEDBACK_REASON_LABELS,
  DEFAULT_SNOOZE_DAYS,
  SNOOZE_DAY_OPTIONS,
  buildFeedbackPayload,
  clampSnoozeDays,
  formatSavingsDollars,
  isBackFromSnooze,
  isFeedbackReasonCode
} from './agentFeedback';

describe('feedback reason vocabulary', () => {
  it('matches the eight codes the backend accepts, exactly', () => {
    // A code the server rejects would 400 a merchant's dismissal; a code the
    // server accepts but we never offer is a reason that can never be recorded.
    expect([...FEEDBACK_REASON_CODES]).toEqual([
      'not_relevant',
      'already_doing_it',
      'too_much_effort',
      'cash_flow_timing',
      'too_risky',
      'data_looks_wrong',
      'relationship_constraint',
      'other'
    ]);
  });

  it('gives every code a merchant-readable label', () => {
    FEEDBACK_REASON_CODES.forEach((code) => {
      const label = FEEDBACK_REASON_LABELS[code];
      expect(label, code).toBeTruthy();
      // The label must not just be the code prettied up — that is the failure
      // mode the chip row exists to avoid.
      expect(label).not.toContain('_');
    });
  });

  it('rejects anything outside the vocabulary', () => {
    expect(isFeedbackReasonCode('not_relevant')).toBe(true);
    expect(isFeedbackReasonCode('made_up_code')).toBe(false);
    expect(isFeedbackReasonCode(undefined)).toBe(false);
    expect(isFeedbackReasonCode(null)).toBe(false);
    expect(isFeedbackReasonCode(7)).toBe(false);
  });
});

describe('buildFeedbackPayload — chip to request body', () => {
  it('maps each chip to its code', () => {
    FEEDBACK_REASON_CODES.forEach((code) => {
      expect(buildFeedbackPayload({ sentiment: 'down', reasonCode: code })).toEqual({
        sentiment: 'down',
        reason_code: code
      });
    });
  });

  it('OMITS reason_code when the chips are skipped, rather than sending `other`', () => {
    // The backend already records an omitted code on a "down" as `other`.
    // Sending `other` ourselves would make "skipped the chips" and
    // "deliberately chose Something else" indistinguishable in the data — which
    // is the exact signal this whole loop was built to recover.
    const payload = buildFeedbackPayload({ sentiment: 'down' });
    expect(payload).toEqual({ sentiment: 'down' });
    expect(payload).not.toHaveProperty('reason_code');

    expect(buildFeedbackPayload({ sentiment: 'down', reasonCode: null })).toEqual({ sentiment: 'down' });
  });

  it('ignores a code the backend would reject', () => {
    const payload = buildFeedbackPayload({
      sentiment: 'down',
      reasonCode: 'nonsense' as never
    });
    expect(payload).not.toHaveProperty('reason_code');
  });

  it('includes trimmed free text, and omits it when blank', () => {
    expect(buildFeedbackPayload({ sentiment: 'down', reasonCode: 'too_risky', reasonText: '  margins are thin  ' })).toEqual({
      sentiment: 'down',
      reason_code: 'too_risky',
      reason_text: 'margins are thin'
    });

    // "" and "they never typed anything" must not have to be told apart later.
    expect(buildFeedbackPayload({ sentiment: 'down', reasonText: '   ' })).toEqual({ sentiment: 'down' });
    expect(buildFeedbackPayload({ sentiment: 'down', reasonText: null })).toEqual({ sentiment: 'down' });
  });

  it('sends free text on its own when the chips were skipped', () => {
    expect(buildFeedbackPayload({ sentiment: 'down', reasonText: 'we tried this in March' })).toEqual({
      sentiment: 'down',
      reason_text: 'we tried this in March'
    });
  });

  it('drops reason fields entirely on a thumbs-up', () => {
    // Reachable in the UI: tap down, pick a chip, change your mind, tap up.
    // Sending the leftover code would attach a complaint to an endorsement.
    expect(
      buildFeedbackPayload({
        sentiment: 'up',
        reasonCode: 'too_risky',
        reasonText: 'stale text from a down-tap'
      })
    ).toEqual({ sentiment: 'up' });
  });
});

describe('clampSnoozeDays', () => {
  it('offers 3/7/14/30 with a 7-day default', () => {
    expect([...SNOOZE_DAY_OPTIONS]).toEqual([3, 7, 14, 30]);
    expect(DEFAULT_SNOOZE_DAYS).toBe(7);
    expect(SNOOZE_DAY_OPTIONS).toContain(DEFAULT_SNOOZE_DAYS);
  });

  it('keeps every offered option untouched', () => {
    SNOOZE_DAY_OPTIONS.forEach((days) => expect(clampSnoozeDays(days)).toBe(days));
  });

  it('clamps to the backend 1..30 range instead of letting a 400 reach the merchant', () => {
    expect(clampSnoozeDays(0)).toBe(1);
    expect(clampSnoozeDays(-5)).toBe(1);
    expect(clampSnoozeDays(31)).toBe(30);
    expect(clampSnoozeDays(9999)).toBe(30);
  });

  it('rounds fractional days and falls back on non-finite input', () => {
    expect(clampSnoozeDays(7.4)).toBe(7);
    expect(clampSnoozeDays(7.6)).toBe(8);
    expect(clampSnoozeDays(Number.NaN)).toBe(DEFAULT_SNOOZE_DAYS);
    expect(clampSnoozeDays(Number.POSITIVE_INFINITY)).toBe(DEFAULT_SNOOZE_DAYS);
  });
});

describe('isBackFromSnooze', () => {
  const now = new Date('2026-03-10T12:00:00Z');

  it('is true only once the snooze has lapsed', () => {
    expect(isBackFromSnooze('2026-03-09T12:00:00Z', now)).toBe(true);
    expect(isBackFromSnooze('2026-03-11T12:00:00Z', now)).toBe(false);
  });

  it('treats the exact boundary as back', () => {
    expect(isBackFromSnooze('2026-03-10T12:00:00Z', now)).toBe(true);
  });

  it('shows no hint it cannot justify', () => {
    // A card that was never snoozed, or whose date we cannot read, must not
    // claim to have come back from one.
    expect(isBackFromSnooze(null, now)).toBe(false);
    expect(isBackFromSnooze(undefined, now)).toBe(false);
    expect(isBackFromSnooze('', now)).toBe(false);
    expect(isBackFromSnooze('not a date', now)).toBe(false);
  });
});

describe('formatSavingsDollars', () => {
  it('renders whole dollars', () => {
    // Cents would imply a precision a 14-to-90-day outcome measurement does
    // not have.
    expect(formatSavingsDollars(1234.56)).toBe('$1,235');
    expect(formatSavingsDollars('892.10')).toBe('$892');
    expect(formatSavingsDollars(0)).toBe('$0');
  });

  it('degrades to $0 rather than NaN', () => {
    expect(formatSavingsDollars(null)).toBe('$0');
    expect(formatSavingsDollars(undefined)).toBe('$0');
    expect(formatSavingsDollars('not a number')).toBe('$0');
  });
});

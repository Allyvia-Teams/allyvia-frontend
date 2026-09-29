import { describe, expect, it } from 'vitest';

import type { MemberLookupStatus } from '../types/pos.types';
import {
  buildMemberLookupView,
  classifyMemberLookupError,
  isPossibleMemberPhone,
  memberPhoneDigits,
  sameMemberPhone,
  type MemberLookupInput,
  type MemberLookupPhase
} from './memberLookupView';

const idle: Omit<MemberLookupInput, 'input'> = {
  attemptedPhone: null,
  status: null,
  error: null,
  isPending: false,
  hasSelectedCustomer: false
};

const throttle = (detail: string, headers: Record<string, string> = {}) => ({
  response: { status: 429, data: { detail }, headers }
});

const resolved = (phone: string, status: MemberLookupStatus, extra: Partial<MemberLookupInput> = {}) =>
  buildMemberLookupView({ ...idle, input: phone, attemptedPhone: phone, status, ...extra });

const ALL_PHASES: MemberLookupPhase[] = [
  'idle',
  'unchecked',
  'checking',
  'created',
  'linked_new',
  'linked',
  'rejected',
  'throttled',
  'failed'
];

describe('the throttle is never mistaken for an answer', () => {
  it('does not read as "not a member"', () => {
    // THE bug: the per-phone budget is 10/hour and SHARED ACROSS EVERY TILL,
    // so a busy shop hits it on customers who are perfectly good members. A
    // clerk who reads that as "not a member" tells the customer they have no
    // membership, and may sign them up a second time.
    const view = buildMemberLookupView({
      ...idle,
      input: '5551234567',
      attemptedPhone: '5551234567',
      error: throttle('Request was throttled. Expected available in 42 seconds.')
    });

    expect(view.phase).toBe('throttled');
    expect(view.chipTone).not.toBe('success');
    expect(view.helperLabel).toContain('not an answer');
    expect(view.helperLabel).not.toContain('not a member');
  });

  it('still sends the number, because an unknown one simply does not attach', () => {
    const view = buildMemberLookupView({
      ...idle,
      input: '5551234567',
      attemptedPhone: '5551234567',
      error: throttle('Request was throttled. Expected available in 42 seconds.')
    });

    expect(view.memberPhone).toBe('5551234567');
  });

  it('reads the delay out of the sentence when the header is not exposed', () => {
    // The live case: a cross-origin XHR cannot see Retry-After unless the
    // server sends Access-Control-Expose-Headers.
    const failure = classifyMemberLookupError(throttle('Request was throttled. Expected available in 42 seconds.'));

    expect(failure.retryAfterSeconds).toBe(42);
  });

  it('prefers the header when it is exposed', () => {
    const failure = classifyMemberLookupError(
      throttle('Request was throttled. Expected available in 42 seconds.', { 'retry-after': '30' })
    );

    expect(failure.retryAfterSeconds).toBe(30);
  });

  it('survives a throttle with no readable delay', () => {
    const view = buildMemberLookupView({
      ...idle,
      input: '5551234567',
      attemptedPhone: '5551234567',
      error: throttle('Request was throttled.')
    });

    expect(view.retryAfterSeconds).toBeNull();
    expect(view.helperLabel).not.toMatch(/NaN|null|undefined/);
    expect(view.helperLabel.endsWith('.')).toBe(true);
  });
});

describe('a linked result is never worded as an opt-in', () => {
  it('says "already on file" and promises nothing', () => {
    // "linked" INCLUDES a membership the customer DECLINED — the till is told
    // the same thing either way, on purpose. Wording it as membership would
    // have the clerk promise perks a declined member will never receive.
    const view = resolved('5551234567', 'linked');

    expect(view.chipLabel).toBe('Already on file');
    expect(view.helperLabel).toContain("don't assume");
    expect(view.chipLabel).not.toMatch(/member/i);
    expect(view.helperLabel).not.toMatch(/signed up|enrolled|opted in\b(?! )/i);
  });

  it('tells a fresh enrolment apart from a link this store already had', () => {
    const labels = (['created', 'linked_new', 'linked'] as MemberLookupStatus[]).map((s) => resolved('5551234567', s).chipLabel);

    expect(new Set(labels).size).toBe(3);
  });
});

describe('a failure can never render as a success', () => {
  it('only the two genuine successes carry a success tone', () => {
    for (const phase of ALL_PHASES) {
      const view = buildMemberLookupView(
        phase === 'idle'
          ? { ...idle, input: '' }
          : phase === 'checking'
            ? { ...idle, input: '5551234567', attemptedPhone: '5551234567', isPending: true }
            : phase === 'unchecked'
              ? { ...idle, input: '5551234567' }
              : phase === 'rejected'
                ? {
                    ...idle,
                    input: '5551234567',
                    attemptedPhone: '5551234567',
                    error: { response: { status: 400, data: { phone: ['Enter a valid phone number.'] } } }
                  }
                : phase === 'throttled'
                  ? { ...idle, input: '5551234567', attemptedPhone: '5551234567', error: throttle('x') }
                  : phase === 'failed'
                    ? { ...idle, input: '5551234567', attemptedPhone: '5551234567', error: new Error('boom') }
                    : { ...idle, input: '5551234567', attemptedPhone: '5551234567', status: phase }
      );

      if (view.chipTone === 'success') {
        expect(['created', 'linked_new']).toContain(view.phase);
      }
    }
  });

  it('returns every label for every phase, so a component never renders undefined', () => {
    for (const status of ['created', 'linked_new', 'linked'] as MemberLookupStatus[]) {
      const view = resolved('5551234567', status);
      for (const key of Object.keys(view) as (keyof typeof view)[]) {
        expect(view[key]).not.toBeUndefined();
      }
    }
  });

  it('a rejected number is not sent, and does not imply they are not a member', () => {
    const view = buildMemberLookupView({
      ...idle,
      input: '5551234567',
      attemptedPhone: '5551234567',
      error: { response: { status: 400, data: { phone: ['Enter a valid phone number.'] } } }
    });

    expect(view.phase).toBe('rejected');
    expect(view.memberPhone).toBeNull();
    expect(view.helperLabel).toContain('Nothing was created');
  });

  it('a 401 the interceptor rethrew as a bare Error still reads as a failure', () => {
    // This is the REAL 401 path in this app: utils/axios intercepts a 401,
    // tries to refresh, and on failure rejects with an Error carrying no
    // .response at all. Treating "no response" as anything but a failure
    // would render an expired session as an answer about the customer.
    const view = buildMemberLookupView({
      ...idle,
      input: '5551234567',
      attemptedPhone: '5551234567',
      error: new Error('No refresh token available')
    });

    expect(view.phase).toBe('failed');
    expect(view.chipTone).toBe('error');
    expect(classifyMemberLookupError(new Error('x')).kind).toBe('offline');
  });

  it('classifies a missing role header, which the backend answers 400 not 403', () => {
    const failure = classifyMemberLookupError({
      response: { status: 400, data: { error: 'X-Role-ID header is required' } }
    });

    expect(failure.kind).toBe('role');
  });
});

describe('a stale result never attaches to the next customer', () => {
  it('drops the chip when the clerk edits the number', () => {
    // THE bug: the previous customer's "Added to Inner Circle" still on
    // screen while a different number is in the field.
    const view = buildMemberLookupView({
      ...idle,
      input: '5551234568',
      attemptedPhone: '5551234567',
      status: 'created'
    });

    expect(view.phase).toBe('unchecked');
  });

  it('drops the spinner when the clerk edits mid-flight', () => {
    const view = buildMemberLookupView({
      ...idle,
      input: '5551234568',
      attemptedPhone: '5551234567',
      isPending: true
    });

    expect(view.phase).toBe('unchecked');
  });

  it('keeps the result when the same number is merely reformatted', () => {
    // Burning a unit of a SHARED 10/hour budget on a cosmetic edit is the
    // failure this prevents.
    const view = buildMemberLookupView({
      ...idle,
      input: '(555) 123-4567',
      attemptedPhone: '5551234567',
      status: 'created'
    });

    expect(view.phase).toBe('created');
    expect(view.canLookup).toBe(false);
  });
});

describe('the field never blocks a sale', () => {
  it('every settled phase advances, including every failure', () => {
    const inputs: MemberLookupInput[] = [
      { ...idle, input: '' },
      { ...idle, input: 'abc' },
      { ...idle, input: 'x'.repeat(33) },
      { ...idle, input: '5551234567', attemptedPhone: '5551234567', error: throttle('x') },
      { ...idle, input: '5551234567', attemptedPhone: '5551234567', error: new Error('boom') },
      {
        ...idle,
        input: '5551234567',
        attemptedPhone: '5551234567',
        error: { response: { status: 400, data: { phone: ['bad'] } } }
      },
      { ...idle, input: '5551234567', attemptedPhone: '5551234567', status: 'created' }
    ];

    for (const input of inputs) {
      expect(buildMemberLookupView(input).continueIntent).toBe('advance');
    }
  });

  it('checks an unchecked number before advancing, and waits while in flight', () => {
    expect(buildMemberLookupView({ ...idle, input: '5551234567' }).continueIntent).toBe('lookup');
    expect(buildMemberLookupView({ ...idle, input: '5551234567', attemptedPhone: '5551234567', isPending: true }).continueIntent).toBe(
      'wait'
    );
  });

  it('will not spend a lookup on a resolved or rejected number, but will retry a failure', () => {
    expect(resolved('5551234567', 'created').canLookup).toBe(false);
    expect(
      buildMemberLookupView({
        ...idle,
        input: '5551234567',
        attemptedPhone: '5551234567',
        error: throttle('x')
      }).canLookup
    ).toBe(true);
  });
});

describe('what the sale carries', () => {
  it('discloses that a selected customer outranks the number', () => {
    const view = resolved('5551234567', 'created', { hasSelectedCustomer: true });

    expect(view.overrideLabel).toContain('not to this number');
  });

  it('warns before charging whenever the number was never confirmed', () => {
    expect(buildMemberLookupView({ ...idle, input: '5551234567' }).preChargeWarningLabel).not.toBe('');
    expect(resolved('5551234567', 'created').preChargeWarningLabel).toBe('');
  });
});

describe('phone helpers', () => {
  it('accepts what the backend can normalize and refuses what it cannot', () => {
    expect(isPossibleMemberPhone('5551234567')).toBe(true);
    expect(isPossibleMemberPhone('(555) 123-4567')).toBe(true);
    expect(isPossibleMemberPhone('+44 20 7946 0958')).toBe(true);
    expect(isPossibleMemberPhone('555123')).toBe(false);
    expect(isPossibleMemberPhone('call mum')).toBe(false);
    expect(isPossibleMemberPhone('x'.repeat(33))).toBe(false);
    expect(isPossibleMemberPhone('')).toBe(false);
  });

  it('treats a US country code as the same number', () => {
    expect(memberPhoneDigits('1 555 123 4567')).toBe('5551234567');
    expect(sameMemberPhone('+1 (555) 123-4567', '5551234567')).toBe(true);
    expect(sameMemberPhone('5551234567', '5551234568')).toBe(false);
    expect(sameMemberPhone(null, '5551234567')).toBe(false);
  });
});

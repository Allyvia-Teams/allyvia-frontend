import { describe, expect, it } from 'vitest';

import { fieldErrors, serverSentence } from './errors';

const err = (status: number, data: unknown) => ({ response: { status, data } });

describe("the server's own words for a refusal", () => {
  it('reads detail, else the first field error, else the fallback; a lost request says so', () => {
    expect(serverSentence(err(404, { detail: 'Plan mode is not on for this company.' }), 'x')).toBe(
      'Plan mode is not on for this company.'
    );
    expect(serverSentence(err(400, { errors: { name: 'Give the plan a name.' } }), 'x')).toBe('Give the plan a name.');
    expect(serverSentence(err(500, '<html>'), 'Something went wrong.')).toBe('Something went wrong.');
    expect(serverSentence({ message: 'Network Error' }, 'x')).toBe('That did not reach the server. Try again.');
  });

  it('maps field errors by field, in strings only', () => {
    expect(
      fieldErrors(err(400, { errors: { target_date: 'The order date (YYYY-MM-DD).', window_end: ['On or after window_start.'] } }))
    ).toEqual({
      target_date: 'The order date (YYYY-MM-DD).',
      window_end: 'On or after window_start.'
    });
    expect(fieldErrors(err(404, { detail: 'Not found.' }))).toEqual({});
  });
});

import { describe, expect, it } from 'vitest';

import { backendFinishedOutcome } from './callbackOutcome';

const params = (query: string) => new URLSearchParams(query);

describe('backendFinishedOutcome', () => {
  it('returns a connected Clover merchant to the Clover wizard', () => {
    expect(backendFinishedOutcome(params('connection=c-1&provider=clover&status=connected'), 'Clover')).toEqual({
      navigateTo: '/integrations/pos/connect/clover'
    });
  });

  it('says a failed Clover connection failed, naming Clover', () => {
    const outcome = backendFinishedOutcome(params('connection=c-1&provider=clover&status=failed&reason=exchange'), 'Clover');

    expect(outcome).toEqual({ error: expect.stringContaining('Clover') });
  });

  it('leaves a browser-finished callback (code and state) to the exchange', () => {
    expect(backendFinishedOutcome(params('code=abc&state=xyz'), 'Square')).toBeNull();
  });

  it('ignores a connection id without a status it understands', () => {
    expect(backendFinishedOutcome(params('connection=c-1&provider=clover&status=pending'), 'Clover')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';

import { isLocalHostname, shouldBypassSubscriptionGate } from './subscriptionBypass';

/** The only combination that may ever return true. */
const enabled = { isDev: true, hostname: 'localhost', flag: 'true' };

describe('shouldBypassSubscriptionGate', () => {
  it('is on only when the dev server, localhost AND the explicit flag all agree', () => {
    expect(shouldBypassSubscriptionGate(enabled)).toBe(true);
  });

  it('is OFF in a production build even on localhost with the flag set', () => {
    // The whole point of the isDev condition: a bundle built with the flag in its
    // environment must not be able to skip a paywall. Vite inlines DEV as false
    // at build time, so this branch is dead code there.
    expect(shouldBypassSubscriptionGate({ ...enabled, isDev: false })).toBe(false);
  });

  it('is OFF on a real host even in dev with the flag set', () => {
    // Guards against a dev server exposed on a LAN or a tunnel (ngrok, etc.).
    expect(shouldBypassSubscriptionGate({ ...enabled, hostname: 'app.allyvia.co' })).toBe(false);
    expect(shouldBypassSubscriptionGate({ ...enabled, hostname: '192.168.1.42' })).toBe(false);
    expect(shouldBypassSubscriptionGate({ ...enabled, hostname: 'abc123.ngrok.io' })).toBe(false);
  });

  it('is OFF unless the flag is exactly the string "true"', () => {
    // A .env holding `false`, `0` or a leftover value must read as off — and so
    // must anything truthy-but-not-'true', which is how a "quick toggle" leaks.
    for (const flag of ['false', '0', '', 'TRUE', 'yes', '1', undefined, null, true, 1, {}]) {
      expect(shouldBypassSubscriptionGate({ ...enabled, flag })).toBe(false);
    }
  });

  it('requires ALL THREE, so no single mistake turns it on', () => {
    // Every two-of-three combination is still off.
    expect(shouldBypassSubscriptionGate({ isDev: true, hostname: 'localhost', flag: 'false' })).toBe(false);
    expect(shouldBypassSubscriptionGate({ isDev: true, hostname: 'app.allyvia.co', flag: 'true' })).toBe(false);
    expect(shouldBypassSubscriptionGate({ isDev: false, hostname: 'localhost', flag: 'true' })).toBe(false);
  });
});

describe('isLocalHostname', () => {
  it('accepts the loopback names a dev server actually reports', () => {
    for (const host of ['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0', 'LOCALHOST', ' localhost ']) {
      expect(isLocalHostname(host)).toBe(true);
    }
    // RFC 6761 reserves *.localhost for loopback; some setups use it.
    expect(isLocalHostname('app.localhost')).toBe(true);
  });

  it('rejects anything that could be reached by someone else', () => {
    for (const host of ['app.allyvia.co', '192.168.1.42', '10.0.0.5', 'abc123.ngrok.io', 'notlocalhost.com']) {
      expect(isLocalHostname(host)).toBe(false);
    }
    // Specifically NOT fooled by a hostname that merely contains "localhost".
    expect(isLocalHostname('localhost.evil.com')).toBe(false);
  });
});

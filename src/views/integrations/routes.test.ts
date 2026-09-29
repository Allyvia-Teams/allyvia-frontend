import { describe, expect, it } from 'vitest';

import { INTEGRATIONS_HUB_ROUTE } from './routes';

describe('the route a connector page goes back to', () => {
  it('points at the Settings tab the hub actually renders in', () => {
    expect(INTEGRATIONS_HUB_ROUTE).toBe('/settings?tab=integrations');
  });

  it('does not go through /integrations, which drops the query string', () => {
    // MainRoutes redirects /integrations with a fixed <Navigate to=…>, so any
    // param the back link carries is lost. That is what broke ?hub=true.
    expect(INTEGRATIONS_HUB_ROUTE.startsWith('/integrations')).toBe(false);
    expect(INTEGRATIONS_HUB_ROUTE).not.toContain('hub=');
  });
});

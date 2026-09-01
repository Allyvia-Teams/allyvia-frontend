import { beforeEach, describe, expect, it, vi } from 'vitest';

// utils/axios cannot be imported under vitest's node environment — it pulls in
// utils/mockApi.ts, which reads localStorage at module load. Mocking the module
// outright is the repo's established pattern (see agent.api.test.ts) and it is
// what lets the transport layer itself be tested rather than a payload builder.
const post = vi.fn();
const patch = vi.fn();

vi.mock('utils/axios', () => ({
  default: {
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args)
  }
}));

import { authorizeConnection, completeOAuth, createConnection, updateConnection } from './posIntegrations.api';

beforeEach(() => {
  post.mockReset();
  patch.mockReset();
  post.mockResolvedValue({ data: {} });
  patch.mockResolvedValue({ data: {} });
});

describe('authorizeConnection', () => {
  it('asks the backend for the provider consent URL', async () => {
    post.mockResolvedValue({ data: { authorize_url: 'https://connect.squareupsandbox.com/oauth2/authorize?x=1' } });

    const result = await authorizeConnection('conn-1', 'https://app.test/integrations/pos/callback');

    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/integrations/connections/conn-1/authorize/');
    expect(body).toEqual({ redirect_uri: 'https://app.test/integrations/pos/callback' });
    expect(result.authorize_url).toContain('/oauth2/authorize');
  });

  it('never builds a provider URL itself', async () => {
    // The client ID and the scope list live server-side. A frontend that
    // assembled the URL would need both, and would drift from the backend the
    // first time a scope changed.
    await authorizeConnection('conn-1', 'https://app.test/cb');

    expect(post.mock.calls[0][0]).not.toContain('squareup');
  });
});

describe('completeOAuth', () => {
  it('hands the code and state to the backend for a server-side exchange', async () => {
    post.mockResolvedValue({ data: { id: 'conn-1', provider: 'square', status: 'active' } });

    const connection = await completeOAuth({ provider: 'square', code: 'CODE', state: 'STATE' });

    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/integrations/oauth/callback/');
    expect(body).toEqual({ provider: 'square', code: 'CODE', state: 'STATE' });
    expect(connection.status).toBe('active');
  });
});

describe('createConnection', () => {
  it('sends shop_domain for Shopify', async () => {
    post.mockResolvedValue({ data: { id: 'conn-2', provider: 'shopify', shop_domain: 'mystore.myshopify.com' } });

    await createConnection({ provider: 'shopify', mode: 'one_time', shop_domain: 'mystore.myshopify.com' });

    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/integrations/connections/');
    expect(body).toEqual({ provider: 'shopify', mode: 'one_time', shop_domain: 'mystore.myshopify.com' });
  });
});

describe('updateConnection', () => {
  it('can patch shop_domain', async () => {
    patch.mockResolvedValue({ data: { id: 'conn-2', shop_domain: 'other.myshopify.com' } });

    await updateConnection('conn-2', { shop_domain: 'other.myshopify.com' });

    const [url, body] = patch.mock.calls[0];
    expect(url).toBe('/integrations/connections/conn-2/');
    expect(body).toEqual({ shop_domain: 'other.myshopify.com' });
  });
});

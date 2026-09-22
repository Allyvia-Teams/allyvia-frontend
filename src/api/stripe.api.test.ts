import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn();

vi.mock('utils/axios', () => ({
  default: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args)
  }
}));

import stripeApi from './stripe.api';

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

describe('stripeApi.lookupStoreCredit', () => {
  it('normalizes the bearer code and scopes the lookup to the selected company', async () => {
    get.mockResolvedValue({
      data: {
        code: 'SC-8KP7W3N9FQ2M',
        state: 'active',
        currency: 'usd',
        remaining_minor: 2500,
        remaining: '25.00',
        amount_minor: 5000,
        customer_name: 'A. Customer',
        expires_at: null
      }
    });

    const credit = await stripeApi.lookupStoreCredit({
      companyId: 'company-1',
      code: '  sc-8kp7w3n9fq2m  '
    });

    expect(get.mock.calls[0][0]).toMatch(/\/api\/stripe\/pos\/store-credit\/SC-8KP7W3N9FQ2M$/);
    expect(get.mock.calls[0][1]).toEqual({ params: { company_id: 'company-1' } });
    expect(credit.remaining_minor).toBe(2500);
  });
});

import { beforeAll, describe, expect, it } from 'vitest';

// The finance slice must normalize /profit/* payloads at the reducer boundary:
// Django Decimals can arrive as JSON strings, and "0.00" is truthy — arithmetic
// on it downstream produced -Infinity% margins (design doc RC4).
//
// The slice's import chain (api/finance.api → utils/axios → utils/mockApi →
// features/pos/mocks/posHandlers) reads sessionStorage at module scope, so web
// storage is stubbed before a dynamic import — same convention as
// utils/brandThemeCache.test.ts.

let reducer: typeof import('./finance').default;

function stubWebStorage() {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear()
  };
  (globalThis as any).sessionStorage = (globalThis as any).sessionStorage ?? storage;
  (globalThis as any).localStorage = (globalThis as any).localStorage ?? storage;
}

beforeAll(async () => {
  stubWebStorage();
  reducer = (await import('./finance')).default;
});

describe('finance slice /profit/* normalization', () => {
  it('coerces profit-and-loss money fields to numbers on fulfilled', () => {
    const state = reducer(undefined, {
      type: 'finance/fetchProfitAndLoss/fulfilled',
      payload: {
        net_income: '-4500.00',
        net_operating_income: '-4500.00',
        gross_profit: '0.00',
        total_income: '0.00',
        total_expenses: '4500.00',
        operating_expenses: '4500.00',
        cost_of_goods_sold: '0.00',
        period: '2026-07-01 to 2026-07-31'
      }
    } as any);

    expect(state.profitAndLoss?.total_income).toBe(0);
    expect(state.profitAndLoss?.net_income).toBe(-4500);
    expect(state.profitAndLoss?.operating_expenses).toBe(4500);
    expect(typeof state.profitAndLoss?.gross_profit).toBe('number');
    expect(state.loading.profitAndLoss).toBe(false);
  });

  it('coerces gross-profit money and preserves a null margin on fulfilled', () => {
    const state = reducer(undefined, {
      type: 'finance/fetchGrossProfitDetail/fulfilled',
      payload: {
        period: '2026-07-01 to 2026-07-31',
        revenue: '0.00',
        cost_of_goods_sold: '0.00',
        gross_profit: '0.00',
        gross_profit_margin: null,
        breakdown: { revenue_sources: [], cost_breakdown: [] }
      }
    } as any);

    expect(state.grossProfitDetail?.revenue).toBe(0);
    expect(typeof state.grossProfitDetail?.revenue).toBe('number');
    expect(state.grossProfitDetail?.gross_profit_margin).toBeNull();
  });

  it('coerces COGS total on fulfilled', () => {
    const state = reducer(undefined, {
      type: 'finance/fetchCOGSDetail/fulfilled',
      payload: {
        period: '2026-07-01 to 2026-07-31',
        total_cogs: '180.00',
        breakdown: [{ category: 'Bills', amount: '120.00' }]
      }
    } as any);

    expect(state.cogsDetail?.total_cogs).toBe(180);
    expect(typeof state.cogsDetail?.total_cogs).toBe('number');
  });

  it('leaves null payloads null (safeGet can fulfill with null)', () => {
    const state = reducer(undefined, {
      type: 'finance/fetchProfitAndLoss/fulfilled',
      payload: null
    } as any);
    expect(state.profitAndLoss).toBeNull();
  });
});

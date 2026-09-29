import { beforeAll, describe, expect, it } from 'vitest';

let reducer: typeof import('./analytics').default;
let isMissingWeatherLocation: typeof import('api/insights.api').isMissingWeatherLocation;

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
  reducer = (await import('./analytics')).default;
  isMissingWeatherLocation = (await import('api/insights.api')).isMissingWeatherLocation;
});

describe('isMissingWeatherLocation', () => {
  it('matches the weather 409 for a company with no resolvable address', () => {
    expect(
      isMissingWeatherLocation({
        response: { status: 409, data: { reason: 'no_location', error: 'Add a city, state and postal code in Settings.' } }
      })
    ).toBe(true);
  });

  it('leaves other failures as errors', () => {
    expect(isMissingWeatherLocation({ response: { status: 500, data: { error: 'boom' } } })).toBe(false);
    expect(isMissingWeatherLocation({ response: { status: 409, data: { reason: 'duplicate' } } })).toBe(false);
  });
});

describe('weather insight location prompt', () => {
  it('records a missing location without an error message', () => {
    const state = reducer(undefined, {
      type: 'analytics/generateWeatherInsight/rejected',
      payload: { code: 'no_location' },
      error: { message: 'Rejected' }
    });

    expect(state.weatherInsightNeedsLocation).toBe(true);
    expect(state.weatherInsightError).toBeNull();
    expect(state.weatherInsightLoading).toBe(false);
  });

  it('still stores a real failure as an error', () => {
    const state = reducer(undefined, {
      type: 'analytics/generateWeatherInsight/rejected',
      error: { message: 'Request failed with status code 500' }
    });

    expect(state.weatherInsightNeedsLocation).toBe(false);
    expect(state.weatherInsightError).toBe('Request failed with status code 500');
  });
});

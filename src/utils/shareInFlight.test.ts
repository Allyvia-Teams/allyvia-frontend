import { describe, expect, it, vi } from 'vitest';

import { shareInFlight } from './shareInFlight';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('shareInFlight', () => {
  it('sends one request for callers that overlap, and gives each the answer', async () => {
    const answer = deferred<string>();
    const request = vi.fn(() => answer.promise);
    const get = shareInFlight((id: string) => id, request);

    const first = get('c1');
    const second = get('c1');
    answer.resolve('ok');

    await expect(first).resolves.toBe('ok');
    await expect(second).resolves.toBe('ok');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('keeps different keys apart', () => {
    const request = vi.fn(() => new Promise<string>(() => undefined));
    const get = shareInFlight((id: string) => id, request);
    get('c1');
    get('c2');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('starts a fresh request once the last one settled, including after a failure', async () => {
    const request = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce('ok');
    const get = shareInFlight((id: string) => id, request);

    await expect(get('c1')).rejects.toThrow('down');
    await expect(get('c1')).resolves.toBe('ok');
    expect(request).toHaveBeenCalledTimes(2);
  });
});

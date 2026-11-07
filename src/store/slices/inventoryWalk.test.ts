import { describe, expect, it } from 'vitest';
import { assemblePages, remainingPages, walkAllPages, walkProgressLabel, WALK_CONCURRENCY, type WalkPage } from './inventoryWalk';

type Row = { id: number };

/** A fake backend: `total` rows, 100 a page, each page answering after `delay(page)` ms. */
function fakeBackend(total: number, delay: (page: number) => number = () => 1, pageSize = 100) {
  const calls: number[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const fetchPage = async (page: number): Promise<WalkPage<Row>> => {
    calls.push(page);
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, delay(page)));
    inFlight -= 1;
    const start = (page - 1) * pageSize;
    const items = Array.from({ length: Math.max(0, Math.min(pageSize, total - start)) }, (_, i) => ({ id: start + i }));
    return { items, pagination: { total_items: total, total_pages: pages, has_next: page < pages } };
  };
  return { fetchPage, calls, maxInFlight: () => maxInFlight };
}

describe('walkAllPages', () => {
  it('returns every row in page order even when later pages finish first', async () => {
    // Page 2 is the slowest, so a naive "push as they arrive" would misorder it.
    const backend = fakeBackend(650, (page) => (page === 2 ? 30 : 1));
    const { items, totalItems } = await walkAllPages({ fetchPage: backend.fetchPage });
    expect(totalItems).toBe(650);
    expect(items.map((r) => r.id)).toEqual(Array.from({ length: 650 }, (_, i) => i));
  });

  it('fetches the remaining pages in parallel, never more than the cap at once', async () => {
    const backend = fakeBackend(6000, () => 5);
    await walkAllPages({ fetchPage: backend.fetchPage });
    expect(backend.calls).toHaveLength(60);
    expect(backend.maxInFlight()).toBe(WALK_CONCURRENCY);
  });

  it('hands page 1 over before any other page is requested', async () => {
    const backend = fakeBackend(300);
    let callsWhenFirstShown = -1;
    await walkAllPages({
      fetchPage: backend.fetchPage,
      onFirstPage: (first) => {
        callsWhenFirstShown = backend.calls.length;
        expect(first.items).toHaveLength(100);
      }
    });
    expect(callsWhenFirstShown).toBe(1);
  });

  it('makes exactly one request for a one-page catalogue', async () => {
    const backend = fakeBackend(42);
    const { items } = await walkAllPages({ fetchPage: backend.fetchPage });
    expect(backend.calls).toEqual([1]);
    expect(items).toHaveLength(42);
  });

  it('stops starting requests once aborted, and rejects as an AbortError', async () => {
    const backend = fakeBackend(6000, () => 5);
    const controller = new AbortController();
    const walk = walkAllPages({ fetchPage: backend.fetchPage, signal: controller.signal });
    setTimeout(() => controller.abort(), 12);
    await expect(walk).rejects.toMatchObject({ name: 'AbortError' });
    const requestedByAbort = backend.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(backend.calls.length).toBe(requestedByAbort);
    expect(requestedByAbort).toBeLessThan(60);
  });

  it('never hands page 1 to the page after an abort', async () => {
    const backend = fakeBackend(300, () => 10);
    const controller = new AbortController();
    let shown = false;
    const walk = walkAllPages({ fetchPage: backend.fetchPage, signal: controller.signal, onFirstPage: () => (shown = true) });
    controller.abort();
    await expect(walk).rejects.toMatchObject({ name: 'AbortError' });
    expect(shown).toBe(false);
  });

  it('rejects with the backend error when a page fails', async () => {
    const backend = fakeBackend(1000);
    const failing = async (page: number) => {
      if (page === 4) throw new Error('boom');
      return backend.fetchPage(page);
    };
    await expect(walkAllPages({ fetchPage: failing })).rejects.toThrow('boom');
  });

  it('follows has_next past the pages promised when the catalogue grew mid-walk', async () => {
    // Page 1 says 2 pages; page 2 then says there is a third.
    const fetchPage = async (page: number): Promise<WalkPage<Row>> => ({
      items: [{ id: page }],
      pagination: { total_items: page === 1 ? 2 : 3, total_pages: page === 1 ? 2 : 3, has_next: page < 3 }
    });
    const { items, totalItems } = await walkAllPages({ fetchPage });
    expect(items.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(totalItems).toBe(3);
  });
});

describe('assemblePages', () => {
  it('keeps the first copy of a row that shifted onto the next page', () => {
    expect(
      assemblePages([
        [{ id: 1 }, { id: 2 }],
        [{ id: 2 }, { id: 3 }]
      ]).map((r) => r.id)
    ).toEqual([1, 2, 3]);
  });

  it('treats a numeric and a string id as the same row', () => {
    expect(assemblePages<{ id: string | number }>([[{ id: 7 }], [{ id: '7' }]])).toHaveLength(1);
  });
});

describe('remainingPages', () => {
  it('lists pages 2..N from total_pages, or from the count when total_pages is missing', () => {
    expect(remainingPages({ items: [{}], pagination: { total_items: 300, total_pages: 3, has_next: true } })).toEqual([2, 3]);
    expect(remainingPages({ items: new Array(100).fill({}), pagination: { total_items: 250, has_next: true } })).toEqual([2, 3]);
    expect(remainingPages({ items: [{}], pagination: { total_items: 1, total_pages: 1, has_next: false } })).toEqual([]);
  });
});

describe('walkProgressLabel', () => {
  it('says how much of the catalogue is showing while the walk runs', () => {
    expect(walkProgressLabel(100, 6000, true)).toBe('Loading items: showing 100 of 6,000…');
  });

  it('is silent once the table holds everything, or when nothing is walking', () => {
    expect(walkProgressLabel(6000, 6000, true)).toBeNull();
    expect(walkProgressLabel(100, 6000, false)).toBeNull();
    expect(walkProgressLabel(0, 0, true)).toBeNull();
  });
});

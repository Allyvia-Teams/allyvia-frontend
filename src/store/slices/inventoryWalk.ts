/**
 * How the All Items list is loaded: every backend page, but not one after another.
 *
 * The table searches, filters, sorts and exports over the whole catalogue, so
 * the client still needs every row (the backend caps page_size at 100). What
 * changed in U10 is HOW the pages come in. Measured on a 6,000-item catalogue,
 * the old walk awaited 60 pages in a row: about 15-19 s before the first row
 * showed, and it carried on after the merchant had left the page.
 *
 * Now:
 *  - page 1 is fetched first and handed to `onFirstPage`, so a first visit has
 *    rows on screen after one round trip, and the page says how many are still
 *    coming (see `walkProgressLabel`);
 *  - pages 2..N are fetched WALK_CONCURRENCY at a time;
 *  - the walk stops starting new requests once `signal` is aborted (the page
 *    aborts it on unmount);
 *  - pages are assembled in page order, whatever order they finish in, and a
 *    row seen twice (a sale mid-walk can shift offsets) is kept once.
 *
 * Pure apart from the injected `fetchPage`, so it is tested in node.
 */

export const WALK_CONCURRENCY = 6;

export interface WalkPage<T> {
  items: T[];
  pagination: { total_items: number; total_pages?: number; has_next: boolean };
}

export class WalkAbortedError extends Error {
  constructor() {
    super('Inventory walk aborted');
    this.name = 'AbortError';
  }
}

/** Pages 2..N for a catalogue whose first page came back as `first`. */
export function remainingPages(first: WalkPage<unknown>): number[] {
  if (!first.pagination.has_next || first.items.length === 0) return [];
  const declared = first.pagination.total_pages ?? 0;
  const total = declared > 1 ? declared : Math.ceil(first.pagination.total_items / first.items.length);
  const pages: number[] = [];
  for (let page = 2; page <= total; page += 1) pages.push(page);
  return pages;
}

/** Concatenate in page order, keeping the first copy of any id. */
export function assemblePages<T extends { id: string | number }>(pagesInOrder: T[][]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const items of pagesInOrder) {
    for (const item of items) {
      const key = String(item.id);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

export async function walkAllPages<T extends { id: string | number }>(options: {
  fetchPage: (page: number) => Promise<WalkPage<T>>;
  onFirstPage?: (first: WalkPage<T>) => void;
  signal?: AbortSignal;
  concurrency?: number;
}): Promise<{ items: T[]; totalItems: number }> {
  const { fetchPage, onFirstPage, signal } = options;
  const concurrency = Math.max(1, options.concurrency ?? WALK_CONCURRENCY);
  const abortedNow = () => Boolean(signal?.aborted);

  const first = await fetchPage(1);
  if (abortedNow()) throw new WalkAbortedError();
  onFirstPage?.(first);

  const pages = remainingPages(first);
  const results = new Map<number, WalkPage<T>>();
  results.set(1, first);

  let next = 0;
  let failed = false;
  const worker = async () => {
    while (!failed && !abortedNow() && next < pages.length) {
      const page = pages[next];
      next += 1;
      try {
        results.set(page, await fetchPage(page));
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, pages.length) }, () => worker()));
  if (abortedNow()) throw new WalkAbortedError();

  // The catalogue can grow while the walk runs; follow has_next past the pages
  // the first response promised, one at a time, exactly as the old walk did.
  let lastPage = pages.length ? pages[pages.length - 1] : 1;
  while (results.get(lastPage)?.pagination.has_next && (results.get(lastPage)?.items.length ?? 0) > 0) {
    if (abortedNow()) throw new WalkAbortedError();
    lastPage += 1;
    results.set(lastPage, await fetchPage(lastPage));
  }

  const ordered = [...results.keys()].sort((a, b) => a - b).map((page) => results.get(page)!.items);
  const last = results.get(lastPage)!;
  return { items: assemblePages(ordered), totalItems: last.pagination.total_items };
}

/**
 * The line shown while the table holds only part of the catalogue, so a partial
 * list never reads as the whole shop (the ALL-101 rule). Null once complete.
 */
export function walkProgressLabel(shown: number, total: number, walking: boolean): string | null {
  if (!walking || total <= 0 || shown >= total) return null;
  const fmt = (n: number) => n.toLocaleString('en-US');
  return `Loading items: showing ${fmt(shown)} of ${fmt(total)}…`;
}

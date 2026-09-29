/**
 * ALL-53 — regression guards for the July dashboard audit (dashboard-AUDIT.md).
 *
 * Re-running that checklist against `develop` found H2, H3, M3 and M5 already
 * repaired (H2/H3 again after the 2026-09-11 dashboard rebuild moved the code), and M1's component genuinely dead. These tests are here so the two
 * High items cannot quietly come back: both were introduced by ordinary,
 * reasonable-looking edits, and neither shows up in a rendered-output test.
 *
 * They read the source rather than the DOM on purpose. What went wrong in each
 * case was a *shape* — an await inside a loop, a log statement outside a guard —
 * that produces correct output and only misbehaves in production or at scale.
 * A render test would pass in both worlds.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(__dirname, relativePath), 'utf8');

describe('ALL-53 H2: clock statuses are fetched concurrently', () => {
  // develop's dashboard rebuild moved the per-employee clock fetch out of
  // EmployeesTable into useClockStatuses; the table only renders what the hook
  // returns. The property is unchanged, so the pin follows the fetch.
  const hook = read('useClockStatuses.ts');
  const table = read('EmployeesTable.tsx');

  it('uses a settled batch rather than awaiting one employee at a time', () => {
    expect(hook).toContain('Promise.allSettled');
  });

  it('has no await inside a for-loop over employees', () => {
    // The original defect: `for (const employee of employees) { await ... }`,
    // which serialises one round trip per employee and is visibly slow for a
    // shop with 20+ staff.
    const sequentialAwaitLoop = /for\s*\(\s*const[^)]*\)\s*\{[^}]*\bawait\b/s;
    expect(sequentialAwaitLoop.test(hook)).toBe(false);
    expect(sequentialAwaitLoop.test(table)).toBe(false);
  });

  it('tolerates one employee failing without losing the rest', () => {
    // allSettled, not all: a single 404 on one employee's clock status must not
    // blank the whole table.
    expect(hook).not.toMatch(/Promise\.all\s*\(/);
  });

  it('leaves the fetching to the hook', () => {
    expect(table).toContain('useClockStatuses');
    expect(table).not.toMatch(/getCurrentUserClockStatus\s*\(/);
  });
});

describe('ALL-53 H3: AnalyticsSection does not log financial payloads in production', () => {
  // The rebuilt AnalyticsSection has no debug-dump effect at all, which is the
  // strongest form of the fix. What must not come back is a console.log of
  // invoiceAging / balanceSheet / cashFlow reaching a production session, so
  // any log line has to sit behind a development-only guard.
  const source = read('Analytics/AnalyticsSection.tsx');
  const lines = source.split('\n');
  const isGuard = (line: string) =>
    line.includes("process.env.NODE_ENV !== 'development'") || line.includes('import.meta.env.DEV');

  it('has no console.log, console.debug or console.info outside a development guard', () => {
    const guardLine = lines.findIndex(isGuard);
    const unguarded = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => /console\.(log|debug|info)\s*\(/.test(line))
      .filter(({ index }) => guardLine === -1 || index < guardLine);
    expect(unguarded).toEqual([]);
  });

  it('may still report errors', () => {
    // console.error in a catch is legitimate; this pin is about payload dumps.
    expect(source).not.toMatch(/console\.log\s*\(\s*['"`]?(invoiceAging|balanceSheet|cashFlow)/);
  });
});

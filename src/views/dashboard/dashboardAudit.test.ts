/**
 * ALL-53 — regression guards for the July dashboard audit (dashboard-AUDIT.md).
 *
 * Re-running that checklist against `develop` found H2, H3, M3 and M5 already
 * repaired, and M1's component genuinely dead. These tests are here so the two
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

describe('ALL-53 H2: EmployeesTable fetches clock status concurrently', () => {
  const source = read('EmployeesTable.tsx');

  it('uses a settled batch rather than awaiting one employee at a time', () => {
    expect(source).toContain('Promise.allSettled');
  });

  it('has no await inside a for-loop over employees', () => {
    // The original defect: `for (const employee of employees) { await ... }`,
    // which serialises one round trip per employee and is visibly slow for a
    // shop with 20+ staff.
    const sequentialAwaitLoop = /for\s*\(\s*const[^)]*\)\s*\{[^}]*\bawait\b/s;
    expect(sequentialAwaitLoop.test(source)).toBe(false);
  });

  it('tolerates one employee failing without losing the rest', () => {
    // allSettled, not all: a single 404 on one employee's clock status must not
    // blank the whole table.
    expect(source).not.toMatch(/Promise\.all\s*\(/);
  });
});

describe('ALL-53 H3: AnalyticsSection does not log financial payloads in production', () => {
  const source = read('Analytics/AnalyticsSection.tsx');
  const lines = source.split('\n');

  const guardLine = lines.findIndex((line) => line.includes("process.env.NODE_ENV !== 'development'"));

  it('guards the debug effect on the development environment', () => {
    expect(guardLine).toBeGreaterThan(-1);
  });

  it('has no console.log before the guard', () => {
    // Every dump of invoiceAging / balanceSheet / cashFlow and the rest must sit
    // behind the guard. One moved above it and a customer's finances are in the
    // browser console of a production session.
    const before = lines.slice(0, guardLine).filter((line) => line.includes('console.log'));
    expect(before).toEqual([]);
  });

  it('logs nothing but console.error outside that effect', () => {
    // console.error in a catch is legitimate and stays. console.log is not.
    const effectEnd = lines.findIndex((line, index) => index > guardLine && /^\s{2}\}, \[/.test(line));
    expect(effectEnd).toBeGreaterThan(guardLine);
    const after = lines.slice(effectEnd).filter((line) => line.includes('console.log'));
    expect(after).toEqual([]);
  });
});

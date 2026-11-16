import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The browser does no money math (docs/finance-tab-design.md, anti-goals). Only snapshotFormat.ts
// may turn a money string into a number, and only to display it. This fails if any other file
// in this folder converts a string to a number, which is the first step of adding two figures.
// A line that converts something that is not money (a page index) says so with a
// `// not money:` comment, so every exception is visible in review.

const DIR = __dirname;
const FORMATTER = 'snapshotFormat.ts';
const CONVERSIONS = /\bparseFloat\s*\(|\bparseInt\s*\(|\bNumber\s*\(|\bMath\.|\.toFixed\s*\(|\.reduce\s*\(/;

const sources = readdirSync(DIR).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f));

describe('no arithmetic on money under src/views/finance/snapshot', () => {
  it('finds the source files', () => {
    expect(sources).toEqual(expect.arrayContaining(['snapshotView.ts', 'FigureTile.tsx', 'FinanceSnapshot.tsx', FORMATTER]));
  });

  for (const file of sources.filter((f) => f !== FORMATTER)) {
    it(`${file} converts no string to a number and reduces nothing`, () => {
      const offending = readFileSync(join(DIR, file), 'utf8')
        .split('\n')
        .map((line, i) => ({ line: line.trim(), n: i + 1 }))
        .filter(({ line }) => !line.startsWith('//') && !line.startsWith('*') && !line.includes('// not money:') && CONVERSIONS.test(line));
      expect(offending).toEqual([]);
    });
  }

  it('the formatter converts only inside its display functions', () => {
    const src = readFileSync(join(DIR, FORMATTER), 'utf8');
    const exported = [...src.matchAll(/export function (\w+)/g)].map((m) => m[1]);
    expect(exported).toEqual(['formatAmount', 'chartAmount', 'formatSyncedAt', 'formatOrderAmount']);
    expect(src).not.toMatch(/[\w)\]]\s*[-+*/]\s*Number\(|Number\([^)]*\)\s*[-+*/]/);
  });
});

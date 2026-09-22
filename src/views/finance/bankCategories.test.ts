import { describe, it, expect, vi } from 'vitest';

// api/banking pulls in utils/axios, whose mock handlers touch sessionStorage at
// module scope; these tests need the module's constants, not its client.
vi.mock('utils/axios', () => ({ default: {} }));

import { BANK_CATEGORIES, type BankCategory } from 'api/banking';
import { groupedCategories, sourceChipLabel, reviewSnackbarText, coverageLabel } from './bankCategories';

describe('bank category grouping', () => {
  it('offers Expenses, Money movement and Other in that order', () => {
    expect(groupedCategories().map((g) => [g.label, g.options.length])).toEqual([
      ['Expenses', 6],
      ['Money movement', 2],
      ['Other', 4]
    ]);
  });
  it('offers every category exactly once, labelled', () => {
    const values = groupedCategories().flatMap((g) => g.options.map((o) => o.value));
    expect([...values].sort()).toEqual((Object.keys(BANK_CATEGORIES) as BankCategory[]).sort());
    expect(new Set(values).size).toBe(values.length);
    for (const option of groupedCategories().flatMap((g) => g.options)) {
      expect(option.label).toBe(BANK_CATEGORIES[option.value]);
    }
  });
});

describe('source chip label', () => {
  it('names who decided the category', () => {
    expect(sourceChipLabel('rule', true, 'opex')).toBe('Pending');
    expect(sourceChipLabel('owner', false, 'opex')).toBe('You');
    expect(sourceChipLabel('rule', false, 'opex')).toBe('Rule');
    expect(sourceChipLabel('none', false, 'needs_review')).toBe('Needs review');
    expect(sourceChipLabel('dictionary', false, 'opex')).toBe('Suggested');
    expect(sourceChipLabel('provider', false, 'labour')).toBe('Suggested');
  });
  it('lets pending outrank every source', () => {
    expect(sourceChipLabel('owner', true, 'needs_review')).toBe('Pending');
  });
});

describe('review snackbar text', () => {
  it('counts only the other transactions a new rule moved', () => {
    expect(reviewSnackbarText(false, 0, 'Faire')).toBe('Saved.');
    expect(reviewSnackbarText(true, 0, 'Faire')).toBe('Saved.');
    expect(reviewSnackbarText(true, 1, 'Faire')).toBe('Saved. Applied to 1 other transaction from "Faire".');
    expect(reviewSnackbarText(true, 14, 'Faire')).toBe('Saved. Applied to 14 other transactions from "Faire".');
  });
});

describe('coverage label', () => {
  it('reads coverage as a whole percentage, and says so when there is no outflow', () => {
    expect(coverageLabel(null)).toBe('No outflow in range');
    expect(coverageLabel('0.9375')).toBe('Coverage 94%');
    expect(coverageLabel('1.0000')).toBe('Coverage 100%');
    expect(coverageLabel('0.0000')).toBe('Coverage 0%');
  });
});

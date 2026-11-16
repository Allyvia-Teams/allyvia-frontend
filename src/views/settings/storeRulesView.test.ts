import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { StoreRule } from 'api/storeRules.api';

import {
  EMPTY_FORM,
  FORBIDDEN_WORDS,
  STORE_RULES_BLURB,
  authorLine,
  categoryOptions,
  categorySentence,
  formError,
  retireQuestion,
  retiredLine,
  ruleRow,
  serverMessage,
  showStorePicker,
  storeLine,
  storeOptions,
  toPayload
} from './storeRulesView';

const rule = (over: Partial<StoreRule> = {}): StoreRule => ({
  id: 'r1',
  statement: 'We do not reorder jewelry',
  category_key: 'jewelry',
  category_label: 'Jewelry',
  location_id: null,
  location_name: null,
  author_email: 'amanda@mirth.test',
  created_at: '2026-11-15T15:00:00Z',
  status: 'in_force',
  retired_at: null,
  retired_by_email: null,
  ...over
});

describe('a rule as a row', () => {
  it('says what the category does, who wrote it and when', () => {
    expect(ruleRow(rule(), false)).toEqual({
      id: 'r1',
      statement: 'We do not reorder jewelry',
      category: 'Keeps Jewelry out of recommendations',
      store: null,
      author: 'Added by amanda@mirth.test on Nov 15, 2026',
      retired: null,
      canRetire: true
    });
  });

  it('has no category sentence for a rule without one', () => {
    expect(categorySentence(rule({ category_key: null, category_label: null }))).toBeNull();
    expect(ruleRow(rule({ category_key: null, category_label: null }), false).category).toBeNull();
  });

  it('falls back to the key when the store no longer has a label for it', () => {
    expect(categorySentence(rule({ category_label: null }))).toBe('Keeps jewelry out of recommendations');
  });

  it('names the store only when there is more than one, or the rule has a store', () => {
    expect(storeLine(rule(), false)).toBeNull();
    expect(storeLine(rule(), true)).toBe('Every store');
    expect(storeLine(rule({ location_id: 'l1', location_name: 'Uptown' }), true)).toBe('Uptown only');
    expect(storeLine(rule({ location_id: 'l1', location_name: 'Uptown' }), false)).toBe('Uptown only');
  });

  it('says who retired it and offers no Retire on a retired rule', () => {
    const retired = rule({ status: 'retired', retired_at: '2026-11-16T10:00:00Z', retired_by_email: 'boss@mirth.test' });
    expect(retiredLine(retired)).toBe('Retired by boss@mirth.test on Nov 16, 2026');
    expect(ruleRow(retired, false).canRetire).toBe(false);
    expect(retiredLine(rule())).toBeNull();
  });

  it('leaves out an unknown author or date rather than printing a placeholder', () => {
    expect(authorLine({ author_email: null, created_at: null })).toBe('Added');
    expect(authorLine({ author_email: null, created_at: 'nonsense' })).toBe('Added');
  });

  it('asks before retiring, and says the category can come back', () => {
    expect(retireQuestion(rule())).toBe(
      'Retire "We do not reorder jewelry"? Jewelry can come back into your recommendations. The rule stays in your list of retired rules.'
    );
    expect(retireQuestion(rule({ category_key: null, category_label: null }))).toBe(
      'Retire "We do not reorder jewelry"? It stays in your list of retired rules.'
    );
  });
});

describe('the add form', () => {
  it('needs a sentence of at most 300 characters', () => {
    expect(formError(EMPTY_FORM)).toBe('Write the rule in a sentence.');
    expect(formError({ ...EMPTY_FORM, statement: '   ' })).toBe('Write the rule in a sentence.');
    expect(formError({ ...EMPTY_FORM, statement: 'x'.repeat(300) })).toBeNull();
    expect(formError({ ...EMPTY_FORM, statement: 'x'.repeat(301) })).toBe('Keep the rule to 300 characters or fewer.');
  });

  it('sends the trimmed sentence, and a category or store only when chosen', () => {
    expect(toPayload({ statement: '  We   do not reorder jewelry ', categoryKey: '', locationId: '' })).toEqual({
      statement: 'We do not reorder jewelry'
    });
    expect(toPayload({ statement: 'No jewelry', categoryKey: 'jewelry', locationId: 'l1' })).toEqual({
      statement: 'No jewelry',
      category_key: 'jewelry',
      location_id: 'l1'
    });
  });

  it('reads the server refusal in its own words', () => {
    expect(serverMessage({ category_key: ['None of your products are in that category.'] })).toBe(
      'None of your products are in that category.'
    );
    expect(serverMessage({ detail: 'That rule is already retired.' })).toBe('That rule is already retired.');
    expect(serverMessage(undefined)).toBe('Could not save that rule.');
  });

  it('lists categories by name and active stores only, with the store picker for two or more', () => {
    expect(
      categoryOptions([
        { key: 'jewelry', label: 'Jewelry' },
        { key: 'dresses', label: 'Dresses' }
      ]).map((c) => c.key)
    ).toEqual(['dresses', 'jewelry']);
    const stores = storeOptions([
      { id: 'b', name: 'Uptown', is_active: true },
      { id: 'a', name: 'Bloomington', is_active: true },
      { id: 'c', name: 'Closed', is_active: false }
    ]);
    expect(stores.map((s) => s.id)).toEqual(['a', 'b']);
    expect(showStorePicker(stores)).toBe(true);
    expect(showStorePicker(stores.slice(0, 1))).toBe(false);
    expect(storeOptions(undefined)).toEqual([]);
  });
});

describe('store words only', () => {
  const said = [
    STORE_RULES_BLURB,
    ...Object.values(ruleRow(rule({ status: 'retired', retired_by_email: 'x@y.test', location_id: 'l', location_name: 'Uptown' }), true)),
    retireQuestion(rule()),
    retireQuestion(rule({ category_key: null })),
    formError(EMPTY_FORM),
    formError({ ...EMPTY_FORM, statement: 'x'.repeat(301) })
  ]
    .filter((s): s is string => typeof s === 'string')
    .join(' ')
    .toLowerCase();

  it.each(FORBIDDEN_WORDS)('the seam never says "%s"', (word) => {
    expect(said).not.toMatch(new RegExp(`\\b${word}`));
  });

  it.each(FORBIDDEN_WORDS)('the component never says "%s" in its own copy', (word) => {
    // Text between JSX tags and quoted props, comments stripped: what the owner can read.
    const source = readFileSync(resolve(__dirname, 'StoreRulesSettings.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    const visible = [...source.matchAll(/>([^<>{}]+)</g), ...source.matchAll(/(?:label|placeholder|title)="([^"]+)"/g)]
      .map((m) => m[1])
      .join(' ')
      .toLowerCase();
    expect(visible).toContain('store rules');
    expect(visible).not.toMatch(new RegExp(`\\b${word}`));
  });
});

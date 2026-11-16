// What the Store rules tab says and sends (owner trust T6). Pure: the component renders these and nothing else
// decides wording. Store words only: the screen never says "constraint", "fact", "gate" or "learning".

import type { StoreRule, StoreRuleCategory, StoreRulePayload } from 'api/storeRules.api';

export const STORE_RULES_BLURB =
  'Tell Allyvia how your store works, in your own words. A rule that leaves out a category keeps that category out of the recommendations you get. Every other rule is read as context.';

export const MAX_STATEMENT_CHARS = 300;

export interface StoreRuleForm {
  statement: string;
  categoryKey: string; // '' = no category
  locationId: string; // '' = every store
}

export const EMPTY_FORM: StoreRuleForm = { statement: '', categoryKey: '', locationId: '' };

/** "Keeps Jewelry out of recommendations", or null for a rule with no category. */
export const categorySentence = (rule: Pick<StoreRule, 'category_key' | 'category_label'>): string | null => {
  if (!rule.category_key) return null;
  return `Keeps ${rule.category_label || rule.category_key} out of recommendations`;
};

const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** "Nov 15, 2026"; '' for a missing or unreadable date. */
export const dayWords = (iso: string | null): string => {
  if (!iso) return '';
  const when = new Date(iso);
  return Number.isNaN(when.getTime()) ? '' : DATE.format(when);
};

/** "Added by amanda@mirth.com on Nov 15, 2026", with whichever parts are known. */
export const authorLine = (rule: Pick<StoreRule, 'author_email' | 'created_at'>): string => {
  const who = rule.author_email ? ` by ${rule.author_email}` : '';
  const when = dayWords(rule.created_at);
  return `Added${who}${when ? ` on ${when}` : ''}`;
};

/** "Retired by x on Nov 16, 2026" for a retired rule, else null. */
export const retiredLine = (rule: Pick<StoreRule, 'status' | 'retired_by_email' | 'retired_at'>): string | null => {
  if (rule.status !== 'retired') return null;
  const who = rule.retired_by_email ? ` by ${rule.retired_by_email}` : '';
  const when = dayWords(rule.retired_at);
  return `Retired${who}${when ? ` on ${when}` : ''}`;
};

/** "Uptown only" for a store's rule, "Every store" otherwise; null in a one-store company. */
export const storeLine = (rule: Pick<StoreRule, 'location_id' | 'location_name'>, manyStores: boolean): string | null => {
  if (!manyStores && !rule.location_id) return null;
  return rule.location_id ? `${rule.location_name || 'One store'} only` : 'Every store';
};

export interface StoreRuleRow {
  id: string;
  statement: string;
  category: string | null;
  store: string | null;
  author: string;
  retired: string | null;
  canRetire: boolean;
}

export const ruleRow = (rule: StoreRule, manyStores: boolean): StoreRuleRow => ({
  id: rule.id,
  statement: rule.statement,
  category: categorySentence(rule),
  store: storeLine(rule, manyStores),
  author: authorLine(rule),
  retired: retiredLine(rule),
  canRetire: rule.status === 'in_force'
});

/** The confirm dialog's question. */
export const retireQuestion = (rule: Pick<StoreRule, 'statement' | 'category_key' | 'category_label'>): string => {
  const base = `Retire "${rule.statement}"?`;
  return rule.category_key
    ? `${base} ${rule.category_label || rule.category_key} can come back into your recommendations. The rule stays in your list of retired rules.`
    : `${base} It stays in your list of retired rules.`;
};

/** What is wrong with the form, or null when it can be sent. */
export const formError = (form: StoreRuleForm): string | null => {
  const text = form.statement.trim();
  if (!text) return 'Write the rule in a sentence.';
  if (text.length > MAX_STATEMENT_CHARS) return `Keep the rule to ${MAX_STATEMENT_CHARS} characters or fewer.`;
  return null;
};

/** The POST body: trimmed sentence, a category or store only when chosen. */
export const toPayload = (form: StoreRuleForm): StoreRulePayload => {
  const payload: StoreRulePayload = { statement: form.statement.trim().replace(/\s+/g, ' ') };
  if (form.categoryKey) payload.category_key = form.categoryKey;
  if (form.locationId) payload.location_id = form.locationId;
  return payload;
};

/** Categories for the picker, by name. */
export const categoryOptions = (categories: StoreRuleCategory[]): StoreRuleCategory[] =>
  [...categories].sort((a, b) => a.label.localeCompare(b.label) || a.key.localeCompare(b.key));

/** Active stores; the store picker shows only when there is more than one. */
export const storeOptions = <T extends { id: string; name: string; is_active: boolean }>(locations: T[] | undefined): T[] =>
  (locations ?? []).filter((loc) => loc.is_active).sort((a, b) => a.name.localeCompare(b.name));

export const showStorePicker = (stores: unknown[]): boolean => stores.length > 1;

/** The first message a 400 carries, in the server's words; a fallback otherwise. */
export const serverMessage = (data: unknown, fallback = 'Could not save that rule.'): string => {
  if (data && typeof data === 'object') {
    for (const value of Object.values(data as Record<string, unknown>)) {
      if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
      if (typeof value === 'string') return value;
    }
  }
  return fallback;
};

/** Words the owner must never read on this screen. */
export const FORBIDDEN_WORDS = ['constraint', 'fact', 'gate', 'learning'];

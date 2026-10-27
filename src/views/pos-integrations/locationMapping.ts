// The decisions behind the "Your locations" step, kept out of the component so
// they can be tested without a DOM (the repo has no jsdom).
//
// One provider location imports into exactly one Allyvia store, and a store
// holds at most one provider location: the backend keeps the provider id in a
// single column per store. So a store already chosen for one location is not
// offered for another.

import type { HeldCounts, LocationChoice, MappedStore, ProviderLocationRow } from 'api/posIntegrations.api';

export const NEW_STORE = '__new__';
export const SKIP = '__skip__';

/** The select's value for a row: a store id, SKIP, or '' while undecided. */
export const currentChoice = (row: ProviderLocationRow): string => {
  if (row.store) return row.store.id;
  if (row.skipped) return SKIP;
  return '';
};

/** The API body for a select value, or null when nothing should be sent. */
export const choicePayload = (value: string, row: ProviderLocationRow): LocationChoice | null => {
  if (!value || value === currentChoice(row)) return null;
  if (value === NEW_STORE) return { create: true, store_name: row.name };
  if (value === SKIP) return { skip: true };
  return { location_id: value };
};

/** Stores this row may import into: its own, plus any no other location holds. */
export const storesFor = (row: ProviderLocationRow, rows: ProviderLocationRow[], stores: MappedStore[]): MappedStore[] => {
  const taken = new Set(rows.filter((other) => other !== row && other.store).map((other) => other.store!.id));
  return stores.filter((store) => !taken.has(store.id));
};

/** True when a new store would collide with an existing name (the backend refuses it). */
export const newStoreNameTaken = (row: ProviderLocationRow, stores: MappedStore[]): boolean => {
  const wanted = row.name.trim().replace(/\s+/g, ' ').toLowerCase();
  return stores.some((store) => store.name.trim().replace(/\s+/g, ' ').toLowerCase() === wanted);
};

export interface MappingSummary {
  mapped: number;
  skipped: number;
  undecided: number;
}

export const summarize = (rows: ProviderLocationRow[]): MappingSummary => ({
  mapped: rows.filter((row) => row.store).length,
  skipped: rows.filter((row) => row.skipped).length,
  undecided: rows.filter((row) => row.needs_decision).length
});

/** "3 sales and 12 stock levels", or '' when nothing is held. */
export const heldLabel = (held: HeldCounts): string => {
  const parts: string[] = [];
  if (held.order) parts.push(`${held.order} sale${held.order === 1 ? '' : 's'}`);
  if (held.inventory_level) parts.push(`${held.inventory_level} stock level${held.inventory_level === 1 ? '' : 's'}`);
  return parts.join(' and ');
};

/** One line of address for a location, from the provider's metadata. */
export const addressLine = (row: ProviderLocationRow): string => {
  const address = row.meta?.address;
  if (!address) return '';
  return [address.line1, address.city, address.state].filter(Boolean).join(', ');
};

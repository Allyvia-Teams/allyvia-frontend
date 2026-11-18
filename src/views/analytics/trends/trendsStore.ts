// Which store the Trends page reads. Pure.
//
// One active store: that store, no picker, whatever the URL says. A company with one store must never land on
// "All stores" by accident (the all-stores view has no weather and no forecast). Several: the store in
// `?location_id=`, else the company's default store; `?location_id=all` is All stores, and it is offered only to
// a role that can see every store. A role limited to some stores is offered only those.

export const ALL_PARAM = 'all';

export interface StoreLocation {
  id: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
}

export interface StoreChoice {
  id: string;
  name: string;
  isDefault: boolean;
}

/** The stores she can pick between: active ones, the default first, then by name. */
export function storeChoices(locations: ReadonlyArray<StoreLocation> | undefined, granted?: ReadonlySet<string> | null): StoreChoice[] {
  return (locations ?? [])
    .filter((l) => l.is_active && (!granted || granted.has(l.id)))
    .map((l) => ({ id: l.id, name: l.name, isDefault: l.is_default }))
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name));
}

export interface StorePick {
  /** Sent as X-Location-Id; null = no header = all stores. */
  locationId: string | null;
  /** What the picker shows: a store id or ALL_PARAM. Empty when there is no choice to show. */
  selected: string;
  showPicker: boolean;
  /** Whether "All stores" is in the picker. */
  offerAll: boolean;
}

export function pickStore(choices: ReadonlyArray<StoreChoice>, param: string | null, canSeeAll: boolean): StorePick {
  if (choices.length === 0) return { locationId: null, selected: '', showPicker: false, offerAll: false };
  if (choices.length === 1) return { locationId: choices[0].id, selected: choices[0].id, showPicker: false, offerAll: false };
  if (param === ALL_PARAM && canSeeAll) return { locationId: null, selected: ALL_PARAM, showPicker: true, offerAll: true };
  const known = choices.find((c) => c.id === param);
  const chosen = known ?? choices.find((c) => c.isDefault) ?? choices[0];
  return { locationId: chosen.id, selected: chosen.id, showPicker: true, offerAll: canSeeAll };
}

/** The URL for a pick: the default store is the absence of the parameter. */
export function paramFor(selected: string, choices: ReadonlyArray<StoreChoice>): string | null {
  if (selected === ALL_PARAM) return ALL_PARAM;
  const defaultId = (choices.find((c) => c.isDefault) ?? choices[0])?.id;
  return selected && selected !== defaultId ? selected : null;
}

/** What the access probes say. `all` = the no-store read came back as all stores, so every store is hers. */
export type AccessProbe = { kind: 'all' } | { kind: 'some'; granted: string[] };

export const canSeeAllStores = (access: AccessProbe | null | undefined): boolean => access?.kind === 'all';

/** Null means every store; otherwise the ids she was let in to. */
export const grantedSet = (access: AccessProbe | null | undefined): ReadonlySet<string> | null =>
  access?.kind === 'some' ? new Set(access.granted) : null;

/**
 * Which stores a role can read. One no-store read for today: all stores back means every store is hers. A
 * role limited to some stores is scoped to its first one by the server, so each store is tried in turn and the
 * ones that answer are hers. `read` resolves for a store it may read and rejects for one it may not.
 */
export async function probeAccess(
  read: (locationId: string | null) => Promise<{ scope: string }>,
  choices: ReadonlyArray<StoreChoice>
): Promise<AccessProbe> {
  try {
    if ((await read(null)).scope === 'all_stores') return { kind: 'all' };
  } catch {
    // a role with no company view: fall through to the stores
  }
  const results = await Promise.allSettled(choices.map((c) => read(c.id)));
  return { kind: 'some', granted: choices.filter((_, i) => results[i].status === 'fulfilled').map((c) => c.id) };
}

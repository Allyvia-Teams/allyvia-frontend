import type { TierLadder, TierLadderInput, TierLadderLevelInput, TierLadderWindow } from 'api/innerCircle.api';
import { parseApiError, parseRowErrors, statusOf } from 'views/inventory/apiErrors';
import { moveEntry } from 'views/inventory/sizeScales';

/**
 * Everything the Tiers tab computes: the draft model, the reorder, validation,
 * the ONE payload builder, error reading, and the seed suggestion. Axios-free
 * and render-free, so it is the part vitest can actually reach — TiersTab.tsx
 * only renders what this decides.
 *
 * IMPORTS FROM api/innerCircle.api ARE `import type` ONLY, ALWAYS. That module
 * evaluates `new URL(import.meta.env.VITE_APP_API_URL).origin` at load, which
 * throws under the node test environment. Type imports are erased; a value
 * import would turn every test in this file into a collection error.
 *
 * THE TWO RULES THIS MODULE EXISTS TO ENFORCE:
 *
 * 1. THE ID ROUND-TRIP. The PUT replaces the whole ladder. A level sent
 *    WITHOUT its `id` reads as delete-then-create, and the server answers 409
 *    while any member holds it — before the transaction, so the ENTIRE put
 *    becomes a no-op: no rename, no threshold change, no reorder survives.
 *    `LevelDraft.id` is `string | null` and never `undefined`, so "this one is
 *    new" has to be said on purpose rather than happening by omission.
 *
 * 2. GRACE_DAYS IS ALWAYS SENT. The serializer carries default=30, so DRF
 *    injects 30 whenever the key is absent and the view's "preserve existing"
 *    fallback is unreachable. A levels-only edit that omits it silently
 *    rewrites the merchant's grace window — and `grace_days: 0`, a deliberate
 *    "demote immediately", is exactly what a truthiness guard drops.
 */

export const BASE_THRESHOLD = '0.00';
export const MIN_LEVELS = 1;
export const MAX_LEVELS = 10;
export const MAX_NAME_LENGTH = 64;
export const MAX_COLOR_LENGTH = 16;
export const MAX_ICON_LENGTH = 64;
export const MAX_GRACE_DAYS = 365;
export const DEFAULT_GRACE_DAYS = 30;
export const DEFAULT_WINDOW: TierLadderWindow = 'rolling_365';
export const LADDER_WINDOWS: readonly TierLadderWindow[] = ['rolling_90', 'rolling_365', 'lifetime'];
/** The customers endpoint's hard max page_size. The seed cannot see past it. */
export const CUSTOMER_SAMPLE_CAP = 100;

export interface LevelDraft {
  /** The server id, or null for a level the merchant just added. */
  id: string | null;
  /** Stable React key. Never sent, never diffed — index keys on a reorderable
   *  list are the classic wrong answer and jsx-key is an error here. */
  rowKey: string;
  name: string;
  /** Free text exactly as typed; normalised only at the payload boundary. */
  threshold: string;
  color: string;
  icon: string;
}

export interface LadderDraft {
  window: TierLadderWindow;
  graceDays: number;
  levels: LevelDraft[];
}

let rowKeySeq = 0;
const nextRowKey = () => `new-${(rowKeySeq += 1)}`;

/**
 * GET returns `{ladder: …|null}`. Tolerates a bare ladder object too, because
 * the PUT's envelope is not something this client should bet on.
 */
export function unwrapLadder(data: unknown): TierLadder | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  if ('ladder' in record) {
    const ladder = record.ladder;
    return ladder && typeof ladder === 'object' ? (ladder as TierLadder) : null;
  }
  return 'levels' in record && Array.isArray(record.levels) ? (data as TierLadder) : null;
}

export function toLadderDraft(ladder: TierLadder): LadderDraft {
  return {
    window: ladder.window,
    graceDays: ladder.grace_days,
    levels: ladder.levels.map((level) => ({
      id: level.id,
      rowKey: level.id,
      name: level.name,
      threshold: level.threshold,
      color: level.color || '',
      icon: level.icon || ''
    }))
  };
}

/**
 * The unsaved starter behind "Set up a threshold ladder".
 *
 * Named Shopper / Regular / Vault on purpose: a three-rung ladder is the
 * common case, and those names line up 1:1 with the Benefits tab's fixed three
 * rows, so the mismatch that a four-rung ladder creates never surfaces for the
 * merchants who never go past three.
 */
export function starterLadderDraft(): LadderDraft {
  return {
    window: DEFAULT_WINDOW,
    graceDays: DEFAULT_GRACE_DAYS,
    levels: [
      { id: null, rowKey: nextRowKey(), name: 'Shopper', threshold: BASE_THRESHOLD, color: '', icon: '' },
      { id: null, rowKey: nextRowKey(), name: 'Regular', threshold: '', color: '', icon: '' },
      { id: null, rowKey: nextRowKey(), name: 'Vault', threshold: '', color: '', icon: '' }
    ]
  };
}

/** Trim, strip '$' and commas, parse. Null when not a finite number >= 0. */
export function normalizeThreshold(raw: string | number): string | null {
  const text = String(raw ?? '')
    .trim()
    .replace(/[$,]/g, '');
  if (text === '') return null;
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0) return null;
  return value.toFixed(2);
}

/** Normalised comparison, so typing "400" over the server's "400.00" is clean. */
export function thresholdsEqual(a: string, b: string): boolean {
  const left = normalizeThreshold(a);
  const right = normalizeThreshold(b);
  if (left === null || right === null) return String(a).trim() === String(b).trim();
  return left === right;
}

export function setLevel(levels: LevelDraft[], index: number, patch: Partial<LevelDraft>): LevelDraft[] {
  if (index < 0 || index >= levels.length) return levels;
  return levels.map((level, i) => (i === index ? { ...level, ...patch } : level));
}

/** Null at MAX_LEVELS — the caller disables the button, this refuses anyway. */
export function addLevel(levels: LevelDraft[]): LevelDraft[] | null {
  if (levels.length >= MAX_LEVELS) return null;
  return [...levels, { id: null, rowKey: nextRowKey(), name: '', threshold: '', color: '', icon: '' }];
}

export function removeLevel(levels: LevelDraft[], index: number): LevelDraft[] {
  if (index < 0 || index >= levels.length) return levels;
  return levels.filter((_level, i) => i !== index);
}

/**
 * Move a level up or down the ladder.
 *
 * THE IDENTITY MOVES; THE THRESHOLD COLUMN STAYS PINNED TO ITS RUNG. The
 * server derives order from thresholds and enforces strict ascent, so a move
 * that carried its threshold along would always produce an invalid ladder and
 * demand a follow-up numeric edit. Pinned, an adjacent swap is exactly "these
 * two trade places", is always valid, and the base rung's 0.00 can never leave
 * index 0.
 *
 * Built on sizeScales.moveEntry, so the no-op contract is inherited: an inert
 * click returns the SAME reference and re-renders nothing.
 */
export function moveLevel(levels: LevelDraft[], from: number, to: number): LevelDraft[] {
  const moved = moveEntry(levels, from, to);
  if (moved === levels) return levels;
  const thresholds = levels.map((level) => level.threshold);
  return moved.map((level, i) => ({ ...level, threshold: thresholds[i] }));
}

/**
 * Put a removed level back, WITH ITS ID, at the rank it held on the server.
 * The recovery affordance for a 409. Deliberately not re-sorted by threshold:
 * the merchant may have edited the numbers, and silently moving other rungs to
 * make room would change what they mean.
 */
export function restoreLevel(levels: LevelDraft[], baseline: TierLadder, levelId: string): LevelDraft[] | null {
  if (levels.some((level) => level.id === levelId)) return null;
  const original = baseline.levels.find((level) => level.id === levelId);
  if (!original) return null;
  const at = Math.max(0, Math.min(original.rank, levels.length));
  const restored: LevelDraft = {
    id: original.id,
    rowKey: original.id,
    name: original.name,
    threshold: original.threshold,
    color: original.color || '',
    icon: original.icon || ''
  };
  return [...levels.slice(0, at), restored, ...levels.slice(at)];
}

export interface LadderProblems {
  valid: boolean;
  /** Keyed by DRAFT index — meaningful because the client built this list. */
  byIndex: Map<number, string>;
  form: string[];
  /** Advisories that never block Save. */
  warnings: string[];
}

export function validateLadder(draft: LadderDraft): LadderProblems {
  const byIndex = new Map<number, string>();
  const form: string[] = [];
  const warnings: string[] = [];
  const { levels } = draft;

  if (levels.length < MIN_LEVELS) form.push('A ladder needs at least one level.');
  if (levels.length > MAX_LEVELS) form.push(`A ladder can have at most ${MAX_LEVELS} levels.`);
  if (!LADDER_WINDOWS.includes(draft.window)) form.push('Pick a measurement window.');
  if (!Number.isInteger(draft.graceDays) || draft.graceDays < 0 || draft.graceDays > MAX_GRACE_DAYS) {
    form.push(`Grace period must be a whole number of days between 0 and ${MAX_GRACE_DAYS}.`);
  }
  if (levels.length === 1) warnings.push('A one-level ladder puts every member on the same rung.');

  const seenNames = new Set<string>();
  levels.forEach((level, index) => {
    const name = level.name.trim();
    const problem = (message: string) => {
      if (!byIndex.has(index)) byIndex.set(index, message);
    };

    if (!name) problem('Name this level.');
    else if (name.length > MAX_NAME_LENGTH) problem(`Names are at most ${MAX_NAME_LENGTH} characters.`);
    else if (seenNames.has(name.toLowerCase())) {
      problem(`'${name}' is already used by another level (names are compared without case).`);
    }
    seenNames.add(name.toLowerCase());

    const threshold = normalizeThreshold(level.threshold);
    if (threshold === null) {
      problem('Enter a spend amount, e.g. 400.');
    } else if (index === 0 && threshold !== BASE_THRESHOLD) {
      problem('The first level is the floor every member qualifies for — its threshold must be 0.00.');
    } else if (index > 0) {
      const previous = normalizeThreshold(levels[index - 1].threshold);
      if (previous !== null && Number(threshold) <= Number(previous)) {
        problem(`Must be more than $${previous} — the level below it.`);
      }
    }

    if (level.color.length > MAX_COLOR_LENGTH) problem(`Colour is at most ${MAX_COLOR_LENGTH} characters.`);
    if (level.icon.length > MAX_ICON_LENGTH) problem(`Icon is at most ${MAX_ICON_LENGTH} characters.`);
  });

  return { valid: byIndex.size === 0 && form.length === 0, byIndex, form, warnings };
}

/**
 * Structural diff against the fetched payload — not a form-library flag.
 * `fetched === null` is ALWAYS dirty: with no ladder on the server, any draft
 * is a creation.
 */
export function ladderDiffers(fetched: TierLadder | null, draft: LadderDraft): boolean {
  if (!fetched) return true;
  if (fetched.window !== draft.window) return true;
  if (fetched.grace_days !== draft.graceDays) return true;
  if (fetched.levels.length !== draft.levels.length) return true;
  return draft.levels.some((level, index) => {
    const original = fetched.levels[index];
    return (
      original.id !== level.id ||
      original.name.trim() !== level.name.trim() ||
      !thresholdsEqual(original.threshold, level.threshold) ||
      (original.color || '') !== level.color ||
      (original.icon || '') !== level.icon
    );
  });
}

/**
 * THE ONE BUILDER for the PUT. Do not construct this body anywhere else.
 *
 * `id` is emitted for every level that has one; `grace_days` and `window` are
 * emitted unconditionally. `levels[0].threshold` is NOT forced to 0.00 —
 * forcing it would hide a validation failure and save a ladder the merchant
 * did not design. validateLadder gates Save instead.
 */
export function toLadderPutPayload(draft: LadderDraft): TierLadderInput {
  return {
    window: draft.window,
    grace_days: draft.graceDays,
    levels: draft.levels.map((level) => {
      const entry: TierLadderLevelInput = {
        name: level.name.trim(),
        threshold: normalizeThreshold(level.threshold) ?? String(level.threshold).trim()
      };
      if (level.id !== null) entry.id = level.id;
      if (level.color) entry.color = level.color;
      if (level.icon) entry.icon = level.icon;
      return entry;
    })
  };
}

/**
 * Baseline level ids the payload does not carry — by definition the deletions.
 * Drives the pre-flight confirm, and is the assertion that fails the instant
 * any builder drops an id.
 */
export function removedLevelIds(fetched: TierLadder | null, payload: TierLadderInput): string[] {
  if (!fetched) return [];
  const kept = new Set(payload.levels.map((level) => level.id).filter(Boolean));
  return fetched.levels.filter((level) => !kept.has(level.id)).map((level) => level.id);
}

export function describeRemoval(fetched: TierLadder, ids: string[]): string {
  const names = fetched.levels.filter((level) => ids.includes(level.id)).map((level) => level.name);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  return (
    `Removing ${list}. If any member currently holds one of them the whole save is refused ` +
    'and nothing changes — not even your renames or threshold edits. Lowering a level’s ' +
    'threshold is usually the safer edit.'
  );
}

export interface TierLadderBlocker {
  reason: string;
  levelId: string | null;
  name: string | null;
  contactCount: number | null;
  message: string;
}

export interface ParsedLadderError {
  summary: string;
  byIndex: Map<number, string[]>;
  general: string[];
  blockers: TierLadderBlocker[];
  /** True on a 409: the ENTIRE put was refused, before the transaction. */
  noOp: boolean;
  isFallback: boolean;
}

/** "levels[2]: threshold must be…" -> 2. FIRST match wins: the backend names
 *  the offending row first and the row it must exceed second. */
export function levelIndexFromMessage(message: string): number | null {
  const matched = /levels\[(\d+)\]/.exec(message);
  return matched ? Number(matched[1]) : null;
}

function readBlocker(entry: unknown): TierLadderBlocker | null {
  if (!entry || typeof entry !== 'object') return null;
  const record = entry as Record<string, unknown>;
  // The text lives under `message`, not `detail` — parseApiError's blocker
  // reader would render each of these as raw JSON.
  const message = typeof record.message === 'string' ? record.message : '';
  if (!message) return null;
  return {
    reason: typeof record.reason === 'string' ? record.reason : '',
    levelId: typeof record.level_id === 'string' ? record.level_id : null,
    name: typeof record.name === 'string' ? record.name : null,
    contactCount: typeof record.contact_count === 'number' ? record.contact_count : null,
    message
  };
}

/**
 * Read a ladder PUT rejection.
 *
 * parseApiError is delegated to ONLY as a last resort, because it cannot read
 * either `levels` shape: the flat-string form comes back key-prefixed, and the
 * POSITIONAL form (`[{}, {"threshold": [...]}]`) produces nothing at all — it
 * falls through every branch and returns the generic fallback, dropping the
 * one message the merchant needs. parseRowErrors, which is exported from the
 * same module, handles both.
 */
export function parseTierLadderError(err: unknown): ParsedLadderError {
  const body = (err as { response?: { data?: unknown } })?.response?.data;
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  const byIndex = new Map<number, string[]>();
  const general: string[] = [];
  const blockers: TierLadderBlocker[] = [];
  let summary = '';
  const noOp = statusOf(err) === 409;

  const push = (index: number, message: string) => {
    byIndex.set(index, [...(byIndex.get(index) ?? []), message]);
  };

  if (record) {
    if (typeof record.error === 'string') summary = record.error;
    if (Array.isArray(record.detail)) {
      record.detail.forEach((entry) => {
        const blocker = readBlocker(entry);
        if (blocker) blockers.push(blocker);
      });
    } else if (typeof record.detail === 'string') {
      general.push(record.detail);
    }

    if ('levels' in record) {
      const { rows, messages } = parseRowErrors(record.levels);
      rows.forEach((row) => push(row.index, row.message));
      messages.forEach((message) => {
        const index = levelIndexFromMessage(message);
        if (index === null) general.push(message);
        else push(index, message);
      });
    }

    (['window', 'grace_days'] as const).forEach((key) => {
      if (key in record) {
        const label = key === 'window' ? 'Window' : 'Grace period';
        const { messages } = parseRowErrors(record[key]);
        messages.forEach((message) => general.push(`${label}: ${message}`));
      }
    });
  }

  let isFallback = false;
  if (!summary) {
    if (blockers.length) summary = 'Some levels are still held by members.';
    else if (byIndex.size || general.length) summary = 'The ladder could not be saved.';
    else {
      const parsed = parseApiError(err);
      summary = parsed.summary;
      isFallback = parsed.isFallback;
    }
  }

  return { summary, byIndex, general, blockers, noOp, isFallback };
}

/**
 * Matched by level_id, NEVER by array position: the server appends a blocker
 * only for levels that failed, so detail[0] can easily be about the third
 * thing removed. A null id never matches — a level just added cannot be held.
 */
export function blockerForLevel(blockers: TierLadderBlocker[], levelId: string | null): TierLadderBlocker | null {
  if (!levelId) return null;
  return blockers.find((blocker) => blocker.levelId === levelId) ?? null;
}

/** Blockers naming a level no longer in the draft — the ones just removed.
 *  They have no row to paint and get the restore panel instead. */
export function orphanBlockers(blockers: TierLadderBlocker[], levels: LevelDraft[]): TierLadderBlocker[] {
  const present = new Set(levels.map((level) => level.id).filter(Boolean));
  return blockers.filter((blocker) => blocker.levelId && !present.has(blocker.levelId));
}

export interface SpendSample {
  /** Lifetime spend of the sampled members, descending, blanks dropped. */
  values: number[];
  /** The WHOLE member base, which may be far larger than values.length. */
  totalMembers: number;
}

export function toSpendSample(page: { count: number; results: Array<{ ltv: string | null }> }): SpendSample {
  const values = (page.results ?? [])
    .map((row) => Number(row.ltv))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a);
  return { values, totalMembers: page.count ?? values.length };
}

export interface SeedNote {
  index: number;
  name: string;
  threshold: string;
  /** The rank cutoff used: 20 means "the 20th highest spender". Null at base. */
  rank: number | null;
  clamped: boolean;
}

export interface SeedSuggestion {
  levels: LevelDraft[];
  notes: SeedNote[];
  /** The honesty banner. Never empty. */
  caveat: string;
  truncated: boolean;
}

const RUNG_FRACTIONS: Record<number, number[]> = {
  1: [],
  2: [0.1],
  3: [0.25, 0.05],
  4: [0.4, 0.15, 0.05],
  5: [0.5, 0.25, 0.1, 0.03]
};

function fractionsFor(rungCount: number): number[] {
  if (RUNG_FRACTIONS[rungCount]) return RUNG_FRACTIONS[rungCount];
  const count = rungCount - 1;
  return Array.from({ length: count }, (_v, i) => 0.5 * Math.pow(0.55, i));
}

function roundThreshold(value: number): number {
  if (value < 100) return Math.max(10, Math.round(value / 10) * 10);
  if (value < 1000) return Math.round(value / 50) * 50;
  if (value < 10000) return Math.round(value / 100) * 100;
  return Math.round(value / 500) * 500;
}

export function seedCaveat(sample: SpendSample, window: TierLadderWindow): string {
  const truncated = sample.totalMembers > sample.values.length;
  const truncation = truncated
    ? ` Computed from your top ${sample.values.length} members by spend, of ${sample.totalMembers}.`
    : ` Computed from all ${sample.totalMembers} members.`;
  if (window === 'lifetime') {
    return `A starting point from lifetime spend — edit any number before you save.${truncation}`;
  }
  const days = window === 'rolling_90' ? 90 : 365;
  return (
    `Heads up: suggested from LIFETIME spend, because no report exposes rolling-window spend. ` +
    `A ${days}-day ladder measures a shorter period, so these numbers are almost certainly too ` +
    `high — lower them before you save.${truncation}`
  );
}

export function seedNames(rungCount: number): string[] {
  if (rungCount === 3) return ['Shopper', 'Regular', 'Vault'];
  return Array.from({ length: rungCount }, (_v, i) => (i === 0 ? 'Shopper' : `Level ${i + 1}`));
}

/**
 * Suggest a ladder from what members actually spend.
 *
 * RANK CUTOFFS, NOT PERCENTILES. The customers endpoint returns the TOP 100 by
 * spend, not a sample of the base, so percentiles of it are percentiles of the
 * wrong population: on 1,000 members the sample median is roughly the
 * population's 95th percentile, putting a rung ~20x too high — in the same
 * direction as the lifetime-vs-window error, compounding it. A rank cutoff is
 * exactly computable from the same payload and is what a merchant reasons
 * about anyway ("Gold is about my top 20 customers").
 */
export function suggestLadderFromSpend(sample: SpendSample, window: TierLadderWindow, rungCount = 3): SeedSuggestion {
  const count = Math.max(MIN_LEVELS, Math.min(MAX_LEVELS, Math.trunc(rungCount) || 3));
  const names = seedNames(count);
  const fractions = fractionsFor(count);

  const notes: SeedNote[] = [{ index: 0, name: names[0], threshold: BASE_THRESHOLD, rank: null, clamped: false }];
  const thresholds: number[] = [0];

  fractions.forEach((fraction, i) => {
    const rank = Math.max(1, Math.ceil(sample.totalMembers * fraction));
    const clamped = rank > sample.values.length;
    const raw = sample.values.length ? sample.values[Math.min(rank, sample.values.length) - 1] : 0;
    let value = roundThreshold(raw || 10);
    // Rounding must never produce a tie: the server rejects equal thresholds,
    // and a store where the cutoff member has spent nothing would otherwise
    // emit a second 0.00 alongside the base rung.
    const previous = thresholds[thresholds.length - 1];
    if (value <= previous) value = roundThreshold(previous + Math.max(10, previous * 0.25)) || previous + 10;
    if (value <= previous) value = previous + 10;
    thresholds.push(value);
    notes.push({ index: i + 1, name: names[i + 1], threshold: value.toFixed(2), rank, clamped });
  });

  const levels: LevelDraft[] = notes.map((note) => ({
    id: null,
    rowKey: nextRowKey(),
    name: note.name,
    threshold: note.threshold,
    color: '',
    icon: ''
  }));

  return {
    levels,
    notes,
    caveat: seedCaveat(sample, window),
    truncated: sample.totalMembers > sample.values.length
  };
}

export const PROMISE_NOTICE =
  'Customers see these thresholds in the Inner Circle app; changes apply going forward and never demote members during the grace window.';

export const NON_ADMIN_TIER_LADDER_NOTICE = 'You can review the tier ladder, but changing it needs an admin role.';

export const NO_OP_NOTICE = 'Nothing was saved — your renames, threshold changes and reordering are still here, unsaved.';

export const LOWER_INSTEAD_HINT =
  "Lower a level's threshold instead of removing it — members keep a level to belong to, and nobody is expelled from the ladder.";

export const ONE_WAY_NOTICE =
  "Creating a ladder is one-way for now — there's no way to switch back to the built-in tiers from this screen.";

export const LEADERBOARD_MISMATCH_NOTICE =
  'The leaderboard on the Members tab shows lifetime spend, so its order will not always match these levels.';

export const WINDOW_CHANGE_NOTICE =
  'Changing the window re-measures every member against a different period. Some will change level the next time spend is recalculated.';

export const WRONG_BOUTIQUE_HINT =
  'Expecting a ladder you already set up? The ladder shown is the one for your active role’s boutique — check the boutique selector before creating another.';

export function windowLabel(window: TierLadderWindow): string {
  if (window === 'rolling_90') return 'Last 90 days';
  if (window === 'rolling_365') return 'Last 365 days';
  return 'Lifetime';
}

export function windowHelp(window: TierLadderWindow): string {
  if (window === 'lifetime') return 'Levels are earned on all spend, ever. Members never move down for going quiet.';
  const days = window === 'rolling_90' ? 90 : 365;
  return `Levels are earned on spend in the last ${days} days. Members move down when older spend ages out.`;
}

export function graceHelp(days: number): string {
  if (days === 0) return 'No grace period — a member who drops below a level moves down immediately.';
  return `A member who drops below their level keeps it for ${days} day${days === 1 ? '' : 's'} before moving down.`;
}

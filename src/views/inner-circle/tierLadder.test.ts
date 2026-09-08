// Pure-logic tests for the Tiers tab. The five guards, each pinned by a trap
// that states the WRONG answer explicitly, so a regression reads as "you
// brought back the bug" rather than as a broken expectation:
//   1. the id round-trip — every fetched level goes back out with its id, or
//      the PUT reads as delete-then-create and 409s into a total no-op;
//   2. grace_days on EVERY put — omitted, DRF's default silently resets it to
//      30, and a deliberate 0 is exactly what a truthiness guard drops;
//   3. the second-save trap — a new level gets its id only from the PUT
//      response, so the draft must be re-seeded from it;
//   4. the 409 is a no-op, and its blockers match by level_id, never by
//      array position;
//   5. the dual-shape `levels` 400 — a flat array of human strings AND a
//      positional array of dicts, under the same key.
import { describe, expect, it } from 'vitest';

import type { TierLadder } from 'api/innerCircle.api';
import { parseApiError } from 'views/inventory/apiErrors';

import {
  BASE_THRESHOLD,
  blockerForLevel,
  describeRemoval,
  ladderDiffers,
  levelIndexFromMessage,
  moveLevel,
  normalizeThreshold,
  orphanBlockers,
  parseTierLadderError,
  removedLevelIds,
  restoreLevel,
  suggestLadderFromSpend,
  toLadderDraft,
  toLadderPutPayload,
  toSpendSample,
  unwrapLadder,
  validateLadder
} from './tierLadder';

const fetchedLadder: TierLadder = {
  id: 'ladder-1',
  window: 'rolling_365',
  grace_days: 45,
  is_active: true,
  levels: [
    { id: 'lvl-1', name: 'Shopper', rank: 0, threshold: '0.00', color: '', icon: '' },
    { id: 'lvl-2', name: 'Regular', rank: 1, threshold: '400.00', color: '', icon: '' },
    { id: 'lvl-3', name: 'Vault', rank: 2, threshold: '1500.00', color: '', icon: '' }
  ],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
};

const axiosError = (status: number, data: unknown) => ({ response: { status, data } });

describe('the id round-trip', () => {
  it('sends every level back with the id it arrived with', () => {
    const payload = toLadderPutPayload(toLadderDraft(fetchedLadder));

    expect(payload.levels.map((l) => l.id)).toEqual(['lvl-1', 'lvl-2', 'lvl-3']);
  });

  it('an untouched round trip deletes nothing', () => {
    // THE assertion the whole editor rests on. It fails the instant any
    // builder drops an id — and a dropped id is a DELETE to the server,
    // which 409s into a total no-op while anyone holds that level.
    const payload = toLadderPutPayload(toLadderDraft(fetchedLadder));

    expect(removedLevelIds(fetchedLadder, payload)).toEqual([]);
  });

  it('trap: the id-less body is NOT what we build', () => {
    const payload = toLadderPutPayload(toLadderDraft(fetchedLadder));

    expect(payload.levels.every((l) => 'id' in l)).toBe(true);
    expect(payload.levels).not.toEqual([
      { name: 'Shopper', threshold: '0.00' },
      { name: 'Regular', threshold: '400.00' },
      { name: 'Vault', threshold: '1500.00' }
    ]);
  });

  it('a rename keeps the id', () => {
    // The edit most likely to be mis-modelled as delete-then-create.
    const draft = toLadderDraft(fetchedLadder);
    draft.levels[1].name = 'Silver';

    expect(removedLevelIds(fetchedLadder, toLadderPutPayload(draft))).toEqual([]);
  });

  it('a reorder keeps every id attached to its own level', () => {
    const draft = toLadderDraft(fetchedLadder);
    draft.levels = moveLevel(draft.levels, 2, 1);

    const payload = toLadderPutPayload(draft);

    expect(payload.levels.map((l) => l.id)).toEqual(['lvl-1', 'lvl-3', 'lvl-2']);
    expect(removedLevelIds(fetchedLadder, payload)).toEqual([]);
  });

  it('a level the merchant added carries no id key at all', () => {
    const draft = toLadderDraft(fetchedLadder);
    draft.levels.push({ id: null, rowKey: 'new-x', name: 'Obsidian', threshold: '5000', color: '', icon: '' });

    const added = toLadderPutPayload(draft).levels[3];

    expect('id' in added).toBe(false);
  });

  it('names the deletions when a level really is removed', () => {
    const draft = toLadderDraft(fetchedLadder);
    draft.levels = draft.levels.filter((l) => l.id !== 'lvl-2');

    expect(removedLevelIds(fetchedLadder, toLadderPutPayload(draft))).toEqual(['lvl-2']);
    expect(describeRemoval(fetchedLadder, ['lvl-2'])).toContain('nothing changes');
  });
});

describe('grace_days and window are always sent', () => {
  it('a levels-only edit still carries grace_days', () => {
    const draft = toLadderDraft(fetchedLadder);
    draft.levels[1].name = 'Silver';

    expect(toLadderPutPayload(draft).grace_days).toBe(45);
  });

  it('trap: a deliberate 0 survives, because falsy is not absent', () => {
    // `if (draft.graceDays)` would drop this and DRF's default=30 would
    // rewrite "demote immediately" to a month of grace.
    const draft = { ...toLadderDraft(fetchedLadder), graceDays: 0 };

    expect(toLadderPutPayload(draft).grace_days).toBe(0);
  });

  it('sends exactly the three writable keys, and never the read-only ones', () => {
    const payload = toLadderPutPayload(toLadderDraft(fetchedLadder));

    expect(Object.keys(payload).sort()).toEqual(['grace_days', 'levels', 'window']);
    expect(payload.levels[0]).not.toHaveProperty('rank');
    expect(payload.levels[0]).not.toHaveProperty('rowKey');
  });
});

describe('the second-save trap', () => {
  it('a draft re-seeded from the response is clean and complete', () => {
    const saved: TierLadder = {
      ...fetchedLadder,
      levels: [...fetchedLadder.levels, { id: 'lvl-4', name: 'Obsidian', rank: 3, threshold: '5000.00', color: '', icon: '' }]
    };

    expect(toLadderDraft(saved).levels.every((l) => l.id !== null)).toBe(true);
    expect(ladderDiffers(saved, toLadderDraft(saved))).toBe(false);
  });

  it('trap: keeping the pre-save draft deletes the level that was just created', () => {
    // A new level receives its id ONLY in the PUT response. Save again from
    // the old draft and the same level goes out id-less — a create, and a
    // delete of the one the server just made.
    const preSave = toLadderDraft(fetchedLadder);
    preSave.levels.push({ id: null, rowKey: 'new-y', name: 'Obsidian', threshold: '5000', color: '', icon: '' });
    const saved: TierLadder = {
      ...fetchedLadder,
      levels: [...fetchedLadder.levels, { id: 'lvl-4', name: 'Obsidian', rank: 3, threshold: '5000.00', color: '', icon: '' }]
    };

    expect(removedLevelIds(saved, toLadderPutPayload(preSave))).toEqual(['lvl-4']);
  });
});

describe('the base rung and the pinned threshold column', () => {
  it('normalises what a merchant types', () => {
    expect(normalizeThreshold('0')).toBe(BASE_THRESHOLD);
    expect(normalizeThreshold('$1,500')).toBe('1500.00');
    expect(normalizeThreshold('abc')).toBeNull();
    expect(normalizeThreshold('-5')).toBeNull();
  });

  it('refuses a non-zero base rung rather than silently forcing it', () => {
    // Forcing 0.00 would save a ladder the merchant did not design.
    const draft = toLadderDraft(fetchedLadder);
    draft.levels[0].threshold = '50';

    const problems = validateLadder(draft);

    expect(problems.valid).toBe(false);
    expect(problems.byIndex.get(0)).toContain('floor every member qualifies for');
  });

  it('the identity moves and the threshold column stays pinned', () => {
    // Carrying thresholds along would always produce a ladder the server
    // rejects, and could push 0.00 off index 0.
    const moved = moveLevel(toLadderDraft(fetchedLadder).levels, 1, 0);

    expect(moved.map((l) => l.threshold)).toEqual(['0.00', '400.00', '1500.00']);
    expect(moved.map((l) => l.id)).toEqual(['lvl-2', 'lvl-1', 'lvl-3']);
  });

  it('an inert move returns the same reference', () => {
    const levels = toLadderDraft(fetchedLadder).levels;

    expect(moveLevel(levels, 0, -1)).toBe(levels);
    expect(moveLevel(levels, 2, 3)).toBe(levels);
    expect(moveLevel(levels, 1, 1)).toBe(levels);
  });
});

describe('validation', () => {
  it('rejects equal thresholds and blames the later row', () => {
    const draft = toLadderDraft(fetchedLadder);
    draft.levels[2].threshold = '400';

    const problems = validateLadder(draft);

    expect(problems.valid).toBe(false);
    expect(problems.byIndex.has(2)).toBe(true);
    expect(problems.byIndex.has(1)).toBe(false);
  });

  it('rejects duplicate names without case, and blames the later row', () => {
    const draft = toLadderDraft(fetchedLadder);
    draft.levels[2].name = 'regular';

    const problems = validateLadder(draft);

    expect(problems.byIndex.get(2)).toContain('already used');
    expect(problems.byIndex.has(1)).toBe(false);
  });

  it('refuses a blank name, an over-long name and a bad grace period', () => {
    const draft = toLadderDraft(fetchedLadder);
    draft.levels[1].name = '   ';
    expect(validateLadder(draft).byIndex.get(1)).toBe('Name this level.');

    expect(validateLadder({ ...toLadderDraft(fetchedLadder), graceDays: 366 }).valid).toBe(false);
    expect(validateLadder({ ...toLadderDraft(fetchedLadder), graceDays: -1 }).valid).toBe(false);
    expect(validateLadder({ ...toLadderDraft(fetchedLadder), graceDays: 30.5 }).valid).toBe(false);
  });

  it('warns about a one-rung ladder without blocking it', () => {
    const draft = toLadderDraft(fetchedLadder);
    draft.levels = draft.levels.slice(0, 1);

    const problems = validateLadder(draft);

    expect(problems.valid).toBe(true);
    expect(problems.warnings.length).toBe(1);
  });

  it('accepts the ladder as fetched', () => {
    // Positive control: a validator that rejects everything proves nothing.
    expect(validateLadder(toLadderDraft(fetchedLadder)).valid).toBe(true);
  });
});

describe('the dirty diff', () => {
  it('is clean for an untouched draft, and for a cosmetic reformat', () => {
    expect(ladderDiffers(fetchedLadder, toLadderDraft(fetchedLadder))).toBe(false);

    const retyped = toLadderDraft(fetchedLadder);
    retyped.levels[1].threshold = '400';
    expect(ladderDiffers(fetchedLadder, retyped)).toBe(false);
  });

  it('notices every real edit', () => {
    const rename = toLadderDraft(fetchedLadder);
    rename.levels[1].name = 'Silver';
    expect(ladderDiffers(fetchedLadder, rename)).toBe(true);

    const reorder = toLadderDraft(fetchedLadder);
    reorder.levels = moveLevel(reorder.levels, 2, 1);
    expect(ladderDiffers(fetchedLadder, reorder)).toBe(true);

    expect(ladderDiffers(fetchedLadder, { ...toLadderDraft(fetchedLadder), graceDays: 10 })).toBe(true);
    expect(ladderDiffers(fetchedLadder, { ...toLadderDraft(fetchedLadder), window: 'lifetime' })).toBe(true);
  });

  it('is always dirty when there is no ladder yet', () => {
    expect(ladderDiffers(null, toLadderDraft(fetchedLadder))).toBe(true);
  });
});

describe('reading the rejection', () => {
  it('attaches a flat message to the row it names, not the row it mentions', () => {
    // "levels[2]: must be greater than levels[1]'s" is about row 2.
    const parsed = parseTierLadderError(
      axiosError(400, { levels: ["levels[2]: threshold must be strictly greater than levels[1]'s (500.00)."] })
    );

    expect(parsed.byIndex.has(2)).toBe(true);
    expect(parsed.byIndex.has(1)).toBe(false);
    expect(levelIndexFromMessage('levels[2]: x')).toBe(2);
    expect(levelIndexFromMessage('no row here')).toBeNull();
  });

  it('reads the POSITIONAL shape, which the generic reader drops entirely', () => {
    // trap: parseApiError falls through every branch on this body and returns
    // its generic fallback, losing the only message the merchant needs.
    const err = axiosError(400, { levels: [{}, { threshold: ['A valid number is required.'] }] });

    expect(parseApiError(err).isFallback).toBe(true);

    const parsed = parseTierLadderError(err);
    expect(parsed.byIndex.get(1)).toContain('A valid number is required.');
    expect(parsed.byIndex.has(0)).toBe(false);
  });

  it('surfaces a missing role header verbatim', () => {
    const parsed = parseTierLadderError(axiosError(400, { detail: 'No company context. Provide the X-Role-ID header.' }));

    expect(parsed.general).toContain('No company context. Provide the X-Role-ID header.');
  });

  it('labels window and grace-period problems', () => {
    const parsed = parseTierLadderError(axiosError(400, { grace_days: ['Ensure this value is >= 0.'] }));

    expect(parsed.general.some((line) => line.startsWith('Grace period:'))).toBe(true);
  });
});

describe('the 409', () => {
  const blockerBody = {
    error: 'Some levels are still held by members.',
    detail: [
      {
        reason: 'level_in_use',
        level_id: 'lvl-3',
        name: 'Vault',
        contact_count: 12,
        message: "'Vault' is held by 12 member(s). Adjust its threshold instead of removing it."
      }
    ]
  };

  it('reads the blocker text, which lives under message and not detail', () => {
    // trap: the generic reader JSON-stringifies each blocker, so the merchant
    // would be shown a raw object.
    const parsed = parseTierLadderError(axiosError(409, blockerBody));

    expect(parsed.blockers[0].message).toContain("'Vault' is held by 12 member(s)");
    expect(parsed.blockers[0].contactCount).toBe(12);
    expect(parseApiError(axiosError(409, blockerBody)).rows[0]?.message.startsWith('{')).toBe(true);
  });

  it('knows the whole save was refused', () => {
    expect(parseTierLadderError(axiosError(409, blockerBody)).noOp).toBe(true);
    expect(parseTierLadderError(axiosError(400, { levels: ['x'] })).noOp).toBe(false);
  });

  it('matches a blocker by level id, never by position', () => {
    // Two removed, only the second blocked: position 0 of detail[] is about
    // lvl-3, so blaming submitted[0] would paint the wrong row.
    const parsed = parseTierLadderError(axiosError(409, blockerBody));

    expect(blockerForLevel(parsed.blockers, 'lvl-3')?.name).toBe('Vault');
    expect(blockerForLevel(parsed.blockers, 'lvl-2')).toBeNull();
    expect(blockerForLevel(parsed.blockers, null)).toBeNull();
  });

  it('routes a blocker for a removed level to the restore panel', () => {
    const parsed = parseTierLadderError(axiosError(409, blockerBody));
    const remaining = toLadderDraft(fetchedLadder).levels.filter((l) => l.id !== 'lvl-3');

    expect(orphanBlockers(parsed.blockers, remaining).map((b) => b.levelId)).toEqual(['lvl-3']);
  });

  it('restores a blocked level with its id, at the rank it held', () => {
    const remaining = toLadderDraft(fetchedLadder).levels.filter((l) => l.id !== 'lvl-3');

    const restored = restoreLevel(remaining, fetchedLadder, 'lvl-3');

    expect(restored?.map((l) => l.id)).toEqual(['lvl-1', 'lvl-2', 'lvl-3']);
    // And the save is clean again — every other edit survived.
    expect(removedLevelIds(fetchedLadder, toLadderPutPayload({ ...toLadderDraft(fetchedLadder), levels: restored! }))).toEqual([]);
  });

  it('refuses to restore something unknown or already present', () => {
    const levels = toLadderDraft(fetchedLadder).levels;

    expect(restoreLevel(levels, fetchedLadder, 'lvl-3')).toBeNull();
    expect(restoreLevel(levels, fetchedLadder, 'nope')).toBeNull();
  });
});

describe('the seed', () => {
  const sample = (values: number[], totalMembers = values.length) => ({ values, totalMembers });

  it('reads a customers page, dropping blanks', () => {
    const parsed = toSpendSample({
      count: 320,
      results: [{ ltv: '100.00' }, { ltv: null }, { ltv: '900.00' }, { ltv: 'x' }]
    });

    expect(parsed.values).toEqual([900, 100]);
    expect(parsed.totalMembers).toBe(320);
  });

  it('always starts at the floor, and never puts a second rung there', () => {
    // A shop where the cutoff member has spent nothing would otherwise emit
    // two 0.00 rungs, which the server rejects outright.
    const suggestion = suggestLadderFromSpend(sample([0.5, 0.4, 0.3], 3), 'lifetime');

    expect(suggestion.levels[0].threshold).toBe(BASE_THRESHOLD);
    expect(suggestion.levels.slice(1).every((l) => l.threshold !== BASE_THRESHOLD)).toBe(true);
  });

  it('emits strictly ascending thresholds even after rounding collapses them', () => {
    const suggestion = suggestLadderFromSpend(sample([101, 100, 99, 98, 97], 5), 'lifetime');
    const values = suggestion.levels.map((l) => Number(l.threshold));

    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('every seeded level is a creation', () => {
    expect(suggestLadderFromSpend(sample([500, 400, 300], 3), 'lifetime').levels.every((l) => l.id === null)).toBe(true);
  });

  it('says LIFETIME out loud for a rolling ladder, and not for a lifetime one', () => {
    // The seed is systematically too high for a rolling window and the
    // merchant has to be told, not left to discover it.
    expect(suggestLadderFromSpend(sample([500], 1), 'rolling_365').caveat).toContain('LIFETIME');
    expect(suggestLadderFromSpend(sample([500], 1), 'lifetime').caveat).not.toContain('LIFETIME');
  });

  it('admits when it could only see the top of the base', () => {
    const suggestion = suggestLadderFromSpend(sample([900, 800, 700], 5000), 'lifetime');

    expect(suggestion.truncated).toBe(true);
    expect(suggestion.caveat).toContain('top 3');
  });

  it('clamps the rung count into what the server accepts', () => {
    expect(suggestLadderFromSpend(sample([500], 1), 'lifetime', 99).levels.length).toBe(10);
    expect(suggestLadderFromSpend(sample([500], 1), 'lifetime', 0).levels.length).toBe(3);
  });
});

describe('unwrapping the response', () => {
  it('reads the envelope, a null ladder, and a bare ladder', () => {
    expect(unwrapLadder({ ladder: fetchedLadder })).toEqual(fetchedLadder);
    expect(unwrapLadder({ ladder: null })).toBeNull();
    expect(unwrapLadder(fetchedLadder)).toEqual(fetchedLadder);
  });

  it('never throws on junk', () => {
    for (const junk of [undefined, null, [], 'x', {}, 0]) {
      expect(unwrapLadder(junk)).toBeNull();
    }
  });
});

import { describe, expect, it } from 'vitest';

import {
  AdjustmentDraft,
  EM_DASH,
  ItemStock,
  describeAdjustmentError,
  describeAvailability,
  formatDelta,
  formatQuantity,
  formatUnitCost,
  hasLevelDrift,
  movementTone,
  reasonLabel,
  sortLevels,
  stockSeverity,
  toAdjustmentPayload,
  validateAdjustment
} from './stockFormat';

describe('reasonLabel', () => {
  it('reads as what happened, not as a database enum', () => {
    expect(reasonLabel('sale')).toBe('Sold');
    expect(reasonLabel('refund_restock')).toBe('Returned to stock');
    expect(reasonLabel('po_receive')).toBe('Received');
    expect(reasonLabel('transfer_out')).toBe('Sent out');
    expect(reasonLabel('transfer_in')).toBe('Received in');
    expect(reasonLabel('count_adjust')).toBe('Stocktake');
    expect(reasonLabel('manual_adjust')).toBe('Manual adjustment');
    expect(reasonLabel('shrinkage')).toBe('Shrinkage');
    expect(reasonLabel('initial')).toBe('Opening stock');
  });

  it('de-slugs an unknown reason instead of hiding it behind "Unknown"', () => {
    // A reason the backend adds later should still read as something.
    expect(reasonLabel('damage_write_off')).toBe('Damage write off');
    expect(reasonLabel('')).toBe(EM_DASH);
  });
});

describe('movementTone and formatDelta', () => {
  it('classifies by what it did to stock', () => {
    expect(movementTone(3)).toBe('increase');
    expect(movementTone(-3)).toBe('decrease');
    expect(movementTone(0)).toBe('neutral');
  });

  it('always carries the sign so +3 and -3 cannot be confused', () => {
    expect(formatDelta(3)).toBe('+3');
    expect(formatDelta(-3)).toBe('-3');
    expect(formatDelta(0)).toBe('0');
    expect(formatDelta(null)).toBe(EM_DASH);
    expect(formatDelta(undefined)).toBe(EM_DASH);
  });
});

describe('formatQuantity and formatUnitCost', () => {
  it('renders a real zero as 0 but an unknown as an em dash', () => {
    expect(formatQuantity(0)).toBe('0');
    expect(formatQuantity(12)).toBe('12');
    expect(formatQuantity(null)).toBe(EM_DASH);
  });

  it('renders a null unit cost as an em dash, never as 0.00', () => {
    // The backend deliberately records "cost unknown" as null rather than
    // guessing zero; showing 0.00 here would undo that honesty.
    expect(formatUnitCost(null)).toBe(EM_DASH);
    expect(formatUnitCost('')).toBe(EM_DASH);
    expect(formatUnitCost('not-a-number')).toBe(EM_DASH);
    expect(formatUnitCost('22.0000')).toContain('22.00');
    expect(formatUnitCost(0)).toContain('0.00');
  });
});

describe('describeAvailability', () => {
  const stock = (over: Partial<ItemStock> = {}): ItemStock => ({
    total: over.total ?? 8,
    levels_total: over.levels_total ?? over.total ?? 8,
    levels: over.levels ?? [],
    in_transit: over.in_transit,
    on_order: over.on_order
  });

  it('names in-transit and on-order without adding them to on hand', () => {
    // They are on no shelf, but hiding them makes a manager reorder something
    // already moving.
    expect(describeAvailability(stock({ total: 8, in_transit: 6, on_order: 12 }))).toBe('8 on hand, 6 in transit, 12 on order');
  });

  it('omits the extras when there are none', () => {
    expect(describeAvailability(stock({ total: 8 }))).toBe('8 on hand');
    expect(describeAvailability(stock({ total: 8, in_transit: 0, on_order: 0 }))).toBe('8 on hand');
  });
});

describe('hasLevelDrift', () => {
  it('is a tripwire that should always be silent', () => {
    expect(hasLevelDrift({ total: 8, levels_total: 8, levels: [] })).toBe(false);
    expect(hasLevelDrift({ total: 8, levels_total: 7, levels: [] })).toBe(true);
  });
});

describe('sortLevels', () => {
  it('puts the default location first, then alphabetical', () => {
    const sorted = sortLevels([
      { location_id: '3', location_name: 'Warehouse', is_default: false, quantity_on_hand: 1 },
      { location_id: '1', location_name: 'Main', is_default: true, quantity_on_hand: 2 },
      { location_id: '2', location_name: 'Airport', is_default: false, quantity_on_hand: 3 }
    ]);
    expect(sorted.map((row) => row.location_name)).toEqual(['Main', 'Airport', 'Warehouse']);
  });
});

describe('stockSeverity', () => {
  it('flags out-of-stock and low-stock', () => {
    expect(stockSeverity(0, 5)).toBe('out');
    expect(stockSeverity(-1, 5)).toBe('out');
    expect(stockSeverity(5, 5)).toBe('low');
    expect(stockSeverity(6, 5)).toBe('ok');
  });

  it('does not invent a threshold when no reorder point is set', () => {
    // Session 5's suggestions exist to fill this in; guessing here would paint
    // half a catalogue amber on day one.
    expect(stockSeverity(1, null)).toBe('ok');
    expect(stockSeverity(1, undefined)).toBe('ok');
    // But zero is still out, threshold or not.
    expect(stockSeverity(0, null)).toBe('out');
  });
});

describe('validateAdjustment', () => {
  const draft = (over: Partial<AdjustmentDraft> = {}): AdjustmentDraft => ({
    mode: over.mode ?? 'delta',
    value: over.value ?? '-2',
    reason: over.reason ?? 'manual_adjust',
    note: over.note ?? 'two damaged in the stockroom',
    locationId: over.locationId ?? null
  });

  it('accepts a well-formed delta adjustment', () => {
    expect(validateAdjustment(draft()).valid).toBe(true);
  });

  it('REQUIRES a note, because this movement has no external cause to point at', () => {
    const result = validateAdjustment(draft({ note: '   ' }));
    expect(result.valid).toBe(false);
    expect(result.errors.note).toContain('audited');
  });

  it('rejects a blank or non-integer value', () => {
    expect(validateAdjustment(draft({ value: '' })).errors.value).toBeTruthy();
    expect(validateAdjustment(draft({ value: '2.5' })).errors.value).toBe('Whole numbers only');
    expect(validateAdjustment(draft({ value: 'abc' })).errors.value).toBe('Whole numbers only');
  });

  it('rejects a zero delta, which would not change anything', () => {
    expect(validateAdjustment(draft({ value: '0' })).errors.value).toContain('would not adjust');
  });

  it('allows zero as a counted TARGET — a shelf really can be empty', () => {
    expect(validateAdjustment(draft({ mode: 'target', value: '0' })).valid).toBe(true);
  });

  it('rejects a negative counted target', () => {
    const result = validateAdjustment(draft({ mode: 'target', value: '-1' }));
    expect(result.errors.value).toContain('cannot be negative');
  });

  it('allows a negative delta, which is the common case', () => {
    expect(validateAdjustment(draft({ mode: 'delta', value: '-7' })).valid).toBe(true);
  });
});

describe('toAdjustmentPayload', () => {
  it('sends delta or target, never both', () => {
    const deltaPayload = toAdjustmentPayload({
      mode: 'delta',
      value: '-2',
      reason: 'shrinkage',
      note: ' scuffed ',
      locationId: null
    });
    expect(deltaPayload).toEqual({ delta: -2, reason: 'shrinkage', note: 'scuffed' });
    expect(deltaPayload).not.toHaveProperty('target');

    const targetPayload = toAdjustmentPayload({
      mode: 'target',
      value: '12',
      reason: 'manual_adjust',
      note: 'stocktake',
      locationId: 'loc-1'
    });
    expect(targetPayload).toEqual({
      target: 12,
      reason: 'manual_adjust',
      note: 'stocktake',
      location_id: 'loc-1'
    });
    expect(targetPayload).not.toHaveProperty('delta');
  });
});

describe('describeAdjustmentError', () => {
  it('surfaces the numbers from a 409, because they are the actionable part', () => {
    const message = describeAdjustmentError({
      response: {
        status: 409,
        data: {
          detail: 'Insufficient stock for Linen Shirt at Downtown: requested 99, only 12 available.',
          requested: 99,
          available: 12
        }
      }
    });
    expect(message).toContain('requested 99');
    expect(message).toContain('available 12');
  });

  it('falls back to a detail string, then a field error, then a generic message', () => {
    expect(describeAdjustmentError({ response: { status: 400, data: { detail: 'Nope' } } })).toBe('Nope');
    expect(describeAdjustmentError({ response: { status: 400, data: { note: ['This field is required.'] } } })).toBe(
      'This field is required.'
    );
    expect(describeAdjustmentError(new Error('network'))).toContain('Could not adjust stock');
  });
});

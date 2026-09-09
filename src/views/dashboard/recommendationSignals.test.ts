import { describe, expect, it } from 'vitest';
import { drivenByLine, impactKind, impactLabel, savingsGateView, signalLabel, signalRows } from './recommendationSignals';

describe('drivenByLine', () => {
  it('is null for an unattributed recommendation', () => {
    expect(drivenByLine([])).toBeNull();
    expect(drivenByLine(undefined)).toBeNull();
  });
  it('names the registry values and survives an unknown one', () => {
    expect(drivenByLine(['weather_learned', 'overstock'])).toBe('Driven by: weather (learned from your shop), overstock');
    expect(signalLabel('brand_new_signal')).toBe('brand new signal');
  });
});

describe('impactKind / impactLabel', () => {
  it('labels a model estimate as one and a grounded figure plainly', () => {
    expect(impactKind('llm_estimate', '450.00')).toBe('model_estimate');
    expect(impactKind('overstock_markdown_recovery', '450.00')).toBe('grounded');
    expect(impactKind('none', null)).toBe('none');
    expect(impactKind('llm_estimate', '0.00')).toBe('none');
    expect(impactLabel('450.00', 'grounded')).toBe('$450 estimated impact');
    expect(impactLabel('450.00', 'model_estimate')).toBe('$450 model estimate — not yet grounded');
    expect(impactLabel('450.00', 'none')).toBeNull();
  });
});

describe('savingsGateView', () => {
  it('hides the total and reports progress while the gate is not met', () => {
    expect(savingsGateView({ realized_total_dollars: '500.00', gate: { met: false, verified_recommendations: 1, required: 3 } })).toEqual({
      showTotal: false,
      progress: '1 of 3 recommendations verified'
    });
  });
  it('shows the total once met, and never a zero', () => {
    expect(savingsGateView({ realized_total_dollars: '500.00', gate: { met: true, verified_recommendations: 3, required: 3 } })).toEqual({
      showTotal: true,
      progress: null
    });
    expect(
      savingsGateView({ realized_total_dollars: '0.00', gate: { met: true, verified_recommendations: 3, required: 3 } }).showTotal
    ).toBe(false);
  });
  it('treats an older backend without a gate as before', () => {
    expect(savingsGateView({ realized_total_dollars: '12.00' })).toEqual({ showTotal: true, progress: null });
  });
});

describe('signalRows', () => {
  it('lists positive rows largest first with labels', () => {
    expect(signalRows({ weather_learned: '200.00', inventory_status: '100.00', staffing: '0.00' })).toEqual([
      ['weather (learned from your shop)', '200.00'],
      ['stock levels', '100.00']
    ]);
    expect(signalRows(undefined)).toEqual([]);
  });
});

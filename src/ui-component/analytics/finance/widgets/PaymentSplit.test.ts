import { describe, expect, it } from 'vitest';

export function extractPaymentMethodLabels(methods: any[]): string[] {
  return methods.map((item: any) => item.provider || 'Unknown');
}

export function extractPaymentMethodDonutPoints(methods: any[]): Array<{ x: string; y: number }> {
  return methods.map((item: any) => ({
    x: item.provider || 'Unknown',
    y: Number(item.amount) || 0
  }));
}

describe('Payment Split (ALL-141 FIX 3)', () => {
  it('extracts payment method labels and data points from provider field', () => {
    const rawBackendData = [
      { provider: 'Credit Card', amount: '1250.00', count: 15 },
      { provider: 'Cash', amount: '350.00', count: 5 },
      { provider: 'Square POS', amount: '890.50', count: 12 }
    ];

    const labels = extractPaymentMethodLabels(rawBackendData);
    expect(labels).toEqual(['Credit Card', 'Cash', 'Square POS']);

    const points = extractPaymentMethodDonutPoints(rawBackendData);
    expect(points).toEqual([
      { x: 'Credit Card', y: 1250 },
      { x: 'Cash', y: 350 },
      { x: 'Square POS', y: 890.5 }
    ]);
  });

  it('falls back to Unknown when provider is absent', () => {
    const rawData = [{ amount: '100' }];
    expect(extractPaymentMethodLabels(rawData)).toEqual(['Unknown']);
  });
});

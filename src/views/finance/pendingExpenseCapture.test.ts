import { describe, expect, it } from 'vitest';
import { beginCapture, completeCapture, failCapture, recoverCapture } from './pendingExpenseCapture';
const storage = () => {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
};
describe('durable expense capture', () => {
  it.each(['manual', 'recurring'] as const)('restores the exact %s request after a lost response and remount', (kind) => {
    const disk = storage();
    const payload = { amount: '4500.00', source_id: 'manual-one', request_id: 'recurring-one', payee: 'Landlord' };
    const first = beginCapture(disk, 'company-a', kind, payload);
    failCapture(disk, first);
    expect(recoverCapture(disk, 'company-a', kind)).toEqual(payload);
    expect(recoverCapture(disk, 'company-b', kind)).toBeNull();
    expect(() => beginCapture(disk, 'company-a', kind, { ...payload, amount: '9000.00' })).toThrow('unconfirmed');
    const reopened = beginCapture(disk, 'company-a', kind, recoverCapture(disk, 'company-a', kind)!);
    expect(reopened.recovered).toBe(true);
    failCapture(disk, reopened, 403);
    expect(recoverCapture(disk, 'company-a', kind)).toEqual(payload);
    completeCapture(disk, reopened);
    expect(recoverCapture(disk, 'company-a', kind)).toBeNull();
  });
  it('allows correction after a definitive first validation rejection', () => {
    const disk = storage();
    const capture = beginCapture(disk, 'company-a', 'manual', { amount: 'invalid' });
    failCapture(disk, capture, 400);
    expect(recoverCapture(disk, 'company-a', 'manual')).toBeNull();
  });
});

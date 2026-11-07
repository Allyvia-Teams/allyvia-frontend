import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ACTION_FLOWS, actOnRecommendation, COMING_SOON_MESSAGE, runPrimaryAction, type ActionFlow } from './actions';
import { INSIGHTS_MOCK } from './mock/insights.mock';
import { memoryStorage } from './testing/memoryStorage';
import type { PrimaryActionKind } from './types';
import { readVisitRecord } from './visitRecord';

const rec = (kind: PrimaryActionKind) => INSIGHTS_MOCK.recommendations.find((r) => r.primaryAction.kind === kind)!;
const deps = () => ({ navigate: vi.fn(), notify: vi.fn() });
const REFRESHED = INSIGHTS_MOCK.refreshedAt;

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe('runPrimaryAction', () => {
  // What S5 found each flow accepts (data-spec.md, "Primary actions"): none takes a prefill.
  const expected: [PrimaryActionKind, string][] = [
    ['purchase_order', '/inventory/purchase-orders/new'],
    ['markdown', '/inventory?tab=reports&view=markdown-candidates'],
    ['shift', '/scheduling'],
    ['invite', '/inner-circle?tab=outreach'],
    ['payment', '/expense/bills']
  ];

  it.each(expected)('%s navigates to %s', async (kind, route) => {
    const d = deps();
    const result = await runPrimaryAction(rec(kind), d);
    expect(result).toMatchObject({ kind, outcome: 'navigated' });
    expect(result.detail).toContain(route);
    expect(d.navigate).toHaveBeenCalledWith(route);
    expect(d.notify).not.toHaveBeenCalled();
  });

  it('every mock card carries a payload, and the navigation logs it as not sent', async () => {
    for (const r of INSIGHTS_MOCK.recommendations) expect(r.actionPayload).toBeDefined();
    const info = vi.mocked(console.info);
    await runPrimaryAction(rec('purchase_order'), deps());
    expect(info).toHaveBeenCalledWith(expect.stringContaining('runPrimaryAction(rec-mara-reorder)'), {
      notSent: rec('purchase_order').actionPayload
    });
  });

  it('live cards (no payload) still navigate', async () => {
    const d = deps();
    const { actionPayload: _unused, ...live } = rec('shift');
    expect((await runPrimaryAction(live, d)).outcome).toBe('navigated');
    expect(d.navigate).toHaveBeenCalledWith('/scheduling');
  });

  it('reports prefilled when a flow takes the payload, and navigates when it declines', async () => {
    const open = vi.fn(() => true);
    const flows = { ...ACTION_FLOWS, shift: { ...(ACTION_FLOWS.shift as ActionFlow), open } };
    const d = deps();
    expect((await runPrimaryAction(rec('shift'), d, flows)).outcome).toBe('prefilled');
    expect(open).toHaveBeenCalledWith(rec('shift').actionPayload);
    expect(d.navigate).not.toHaveBeenCalled();

    open.mockReturnValue(false);
    expect((await runPrimaryAction(rec('shift'), d, flows)).outcome).toBe('navigated');
    expect(d.navigate).toHaveBeenCalledWith('/scheduling');
  });

  it('a kind with no flow shows the coming-soon toast and goes nowhere', async () => {
    const d = deps();
    const result = await runPrimaryAction(rec('payment'), d, { ...ACTION_FLOWS, payment: null });
    expect(result).toMatchObject({ kind: 'payment', outcome: 'coming_soon' });
    expect(d.notify).toHaveBeenCalledWith(COMING_SOON_MESSAGE);
    expect(COMING_SOON_MESSAGE).toBe('This action is coming soon');
    expect(d.navigate).not.toHaveBeenCalled();
  });
});

describe('actOnRecommendation', () => {
  it('marks the card acted on and writes it to the visit record', async () => {
    const storage = memoryStorage();
    const onActed = vi.fn();
    const d = deps();
    await actOnRecommendation(rec('shift'), { ...d, storage, refreshedAt: REFRESHED, onActed });
    expect(onActed).toHaveBeenCalledWith('rec-saturday-shift');
    expect(readVisitRecord(storage, REFRESHED).acted.map((e) => e.id)).toEqual(['rec-saturday-shift']);
  });

  it('coming_soon does not mark the card or touch the record', async () => {
    const storage = memoryStorage();
    const onActed = vi.fn();
    const d = deps();
    const result = await actOnRecommendation(rec('shift'), {
      ...d,
      storage,
      refreshedAt: REFRESHED,
      onActed,
      flows: { ...ACTION_FLOWS, shift: null }
    });
    expect(result.outcome).toBe('coming_soon');
    expect(d.notify).toHaveBeenCalledWith(COMING_SOON_MESSAGE);
    expect(onActed).not.toHaveBeenCalled();
    expect(storage.data.size).toBe(0);
  });

  it('"Open again" reruns the same flow and keeps one record entry with the first time', async () => {
    const storage = memoryStorage();
    const d = deps();
    const options = { ...d, storage, refreshedAt: REFRESHED, onActed: vi.fn() };
    await actOnRecommendation(rec('purchase_order'), options);
    const first = readVisitRecord(storage, REFRESHED).acted[0].at;
    await actOnRecommendation(rec('purchase_order'), options);
    expect(d.navigate).toHaveBeenCalledTimes(2);
    expect(d.navigate).toHaveBeenNthCalledWith(2, '/inventory/purchase-orders/new');
    expect(options.onActed).toHaveBeenCalledTimes(2);
    const { acted } = readVisitRecord(storage, REFRESHED);
    expect(acted).toHaveLength(1);
    expect(acted[0].at).toBe(first);
  });
});

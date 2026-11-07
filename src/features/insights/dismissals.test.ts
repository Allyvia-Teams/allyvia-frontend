import { describe, expect, it, vi } from 'vitest';

import { DISMISS_REASONS, INITIAL_DISMISS_STATE, reduceDismissal, runDismissAction, type DismissAction } from './dismissals';
import { categoryChips, insightsSubtitle, visibleRecommendations } from './insightsView';
import { INSIGHTS_MOCK } from './mock/insights.mock';
import { FEEDBACK_REASON_CODES } from 'api/agentFeedback';

const recs = INSIGHTS_MOCK.recommendations;
const rec = (id: string) => recs.find((r) => r.id === id)!;
const shift = rec('rec-saturday-shift');
const mara = rec('rec-mara-reorder');

const run = (actions: DismissAction[], send = vi.fn()) => ({
  state: actions.reduce((state, action) => runDismissAction(state, action, send), INITIAL_DISMISS_STATE),
  send
});

describe('dismiss reasons', () => {
  it('maps the three chips to codes the backend already accepts', () => {
    expect(DISMISS_REASONS.map((r) => `${r.label}=${r.code}`)).toEqual([
      'Not relevant=not_relevant',
      'Already did this=already_doing_it',
      'Numbers look wrong=data_looks_wrong'
    ]);
    for (const { code } of DISMISS_REASONS) expect(FEEDBACK_REASON_CODES).toContain(code);
  });
});

describe('reduceDismissal', () => {
  it('takes the card off at once, updates the counts in the same state, and sends nothing yet', () => {
    const { state, send } = run([{ type: 'dismiss', rec: shift }]);
    expect(state.dismissedIds).toEqual(['rec-saturday-shift']);
    expect(state.pending).toEqual({ id: 'rec-saturday-shift', title: shift.title, reason: null, focusUndo: false });
    expect(send).not.toHaveBeenCalled();

    const visible = visibleRecommendations(recs, state.dismissedIds);
    const chips = categoryChips(recs, visible);
    expect(chips.find((c) => c.key === 'all')?.count).toBe(4);
    expect(chips.find((c) => c.key === 'staffing')?.count).toBe(0);
    expect(insightsSubtitle(visible.length, '')).toBe('4 recommendations for this week');
  });

  it('puts the card back on Undo and sends nothing', () => {
    const { state, send } = run([{ type: 'dismiss', rec: shift }, { type: 'reason', reason: 'not_relevant' }, { type: 'undo' }]);
    expect(state).toEqual(INITIAL_DISMISS_STATE);
    expect(send).not.toHaveBeenCalled();
  });

  it('sends the pending dismissal with its reason on timeout, once', () => {
    const { state, send } = run([
      { type: 'dismiss', rec: shift },
      { type: 'reason', reason: 'already_doing_it' },
      { type: 'commit', id: shift.id },
      { type: 'commit', id: shift.id }
    ]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ id: 'rec-saturday-shift', reason: 'already_doing_it' });
    expect(state).toEqual({ dismissedIds: ['rec-saturday-shift'], pending: null });
  });

  it('lets a reason be changed or cleared before the timeout', () => {
    const { send } = run([
      { type: 'dismiss', rec: shift },
      { type: 'reason', reason: 'not_relevant' },
      { type: 'reason', reason: null },
      { type: 'commit', id: shift.id }
    ]);
    expect(send).toHaveBeenCalledWith({ id: 'rec-saturday-shift', reason: null });
  });

  it('commits the first dismissal immediately when a second card is dismissed', () => {
    const { state, send } = run([
      { type: 'dismiss', rec: shift },
      { type: 'reason', reason: 'data_looks_wrong' },
      { type: 'dismiss', rec: mara, focusUndo: true }
    ]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ id: 'rec-saturday-shift', reason: 'data_looks_wrong' });
    expect(state.dismissedIds).toEqual(['rec-saturday-shift', 'rec-mara-reorder']);
    expect(state.pending).toMatchObject({ id: 'rec-mara-reorder', reason: null, focusUndo: true });

    // Undo now only brings back the second card.
    const undone = reduceDismissal(state, { type: 'undo' }).state;
    expect(undone.dismissedIds).toEqual(['rec-saturday-shift']);
  });

  it('ignores a late timeout for a dismissal that is no longer pending', () => {
    const { send } = run([
      { type: 'dismiss', rec: shift },
      { type: 'dismiss', rec: mara },
      { type: 'commit', id: shift.id }
    ]);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('does nothing for reason, undo or commit with no toast open', () => {
    for (const action of [{ type: 'reason', reason: 'not_relevant' }, { type: 'undo' }, { type: 'commit', id: 'x' }] as DismissAction[]) {
      expect(reduceDismissal(INITIAL_DISMISS_STATE, action)).toEqual({ state: INITIAL_DISMISS_STATE, send: [] });
    }
  });

  it('dismisses every card down to an empty list', () => {
    const { state } = run(recs.map((r) => ({ type: 'dismiss', rec: r }) as DismissAction));
    expect(visibleRecommendations(recs, state.dismissedIds)).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';

import { historyRows, outcomeLabel } from './history';
import { INSIGHTS_MOCK } from './mock/insights.mock';

const AT = INSIGHTS_MOCK.refreshedAt;

describe('historyRows', () => {
  it('resolves the record against the payload, newest first, dropping ids the payload lacks', () => {
    const rows = historyRows(
      {
        refreshedAt: AT,
        acted: [
          { id: 'rec-saturday-shift', at: 100 },
          { id: 'rec-gone', at: 400 }
        ],
        dismissed: [{ id: 'rec-linen-markdown', reason: 'not_relevant', at: 200 }]
      },
      INSIGHTS_MOCK.recommendations
    );
    expect(rows).toEqual([
      {
        id: 'rec-linen-markdown',
        at: 200,
        category: 'Pricing',
        title: 'Mark down 42 summer linen dresses by 30%',
        impact: '+$2,050 cash freed',
        outcome: 'Dismissed · Not relevant'
      },
      {
        id: 'rec-saturday-shift',
        at: 100,
        category: 'Staffing',
        title: 'Add a second associate Saturday, 11 AM to 3 PM',
        impact: '+$620 est. sales captured',
        outcome: 'Acted on'
      }
    ]);
  });

  it('is empty for an empty record', () => {
    expect(historyRows({ refreshedAt: AT, acted: [], dismissed: [] }, INSIGHTS_MOCK.recommendations)).toEqual([]);
  });

  it('names the outcome', () => {
    expect(outcomeLabel(true, undefined)).toBe('Acted on');
    expect(outcomeLabel(false, { reason: null })).toBe('Dismissed');
    expect(outcomeLabel(false, { reason: 'data_looks_wrong' })).toBe('Dismissed · Numbers look wrong');
    expect(outcomeLabel(true, { reason: 'already_doing_it' })).toBe('Acted on, then dismissed · Already did this');
  });
});

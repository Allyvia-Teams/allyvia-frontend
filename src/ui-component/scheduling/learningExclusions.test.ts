import { describe, it, expect } from 'vitest';

import type { CalendarException, LearningAnomalyPrompt } from 'types/scheduling';
import {
  clashMessage,
  daysBetween,
  groupExclusions,
  isRangeDraftValid,
  MAX_RANGE_DAYS,
  parseIsoDate,
  payloadFromRangeDraft,
  promptActions,
  promptHeadline,
  promptOutcome,
  promptPanelTitle,
  rangeDraftErrors,
  rangeSummary,
  removalConsequence,
  weekdayOf
} from './learningExclusions';

const exception = (over: Partial<CalendarException> = {}): CalendarException => ({
  id: 1,
  date: '2026-03-06',
  location_id: '',
  kind: 'disruption',
  demand_effect: 'neutral',
  multiplier: null,
  effective_multiplier: 1,
  staff_headcount: null,
  note: '',
  source: 'manual',
  group_id: null,
  created_by_email: 'owner@merths.com',
  created_at: null,
  updated_at: null,
  ...over
});

const prompt = (over: Partial<LearningAnomalyPrompt> = {}): LearningAnomalyPrompt => ({
  id: 'p1',
  date: '2026-03-06',
  location_id: '',
  expected_sales: '1000.00',
  actual_sales: '600.00',
  deviation_pct: '-40.00',
  direction: 'under',
  status: 'pending',
  responded_at: null,
  responded_by_email: '',
  resulting_exception: null,
  created_at: null,
  ...over
});

describe('parsing an ISO date as a calendar date', () => {
  it('reads the weekday without a timezone shifting it', () => {
    // 2026-03-06 is a Friday. `new Date('2026-03-06').getDay()` is midnight
    // UTC, which reads as Thursday anywhere west of Greenwich — so the card
    // would say "Thursday ran 40% under" about a Friday.
    expect(weekdayOf('2026-03-06')).toBe('Friday');
    expect(weekdayOf('2026-01-01')).toBe('Thursday');
  });

  it('refuses anything that is not an ISO date', () => {
    expect(parseIsoDate('06/03/2026')).toBeNull();
    expect(parseIsoDate('2026-13-01')).toBeNull();
    expect(parseIsoDate('')).toBeNull();
  });

  it('counts an inclusive span', () => {
    expect(daysBetween('2026-03-02', '2026-03-10')).toBe(9);
    expect(daysBetween('2026-03-06', '2026-03-06')).toBe(1);
    expect(daysBetween('2026-03-10', '2026-03-02')).toBe(-7);
  });

  it('counts across a month and a leap day', () => {
    expect(daysBetween('2026-02-26', '2026-03-02')).toBe(5);
    expect(daysBetween('2028-02-27', '2028-03-01')).toBe(4);
  });
});

describe('the agent prompt card', () => {
  it('names the weekday AND the date, and rounds the miss to whole percent', () => {
    expect(promptHeadline(prompt({ deviation_pct: '-39.62' }))).toBe('Friday 6 March ran 40% under what I expected.');
  });

  it('tells two pending Fridays apart', () => {
    // Prompts stay pending until answered and the detector looks back a week,
    // so two Fridays can sit on the dashboard together. Without the date they
    // are two identical cards for a question whose entire answer depends on
    // which day is being asked about.
    expect(promptHeadline(prompt({ date: '2026-03-06' }))).not.toBe(promptHeadline(prompt({ date: '2026-03-13' })));
  });

  it('reads the same way for a day that ran over', () => {
    expect(promptHeadline(prompt({ deviation_pct: '80.00', direction: 'over' }))).toBe('Friday 6 March ran 80% over what I expected.');
  });

  it('fixes the order and the emphasis of the two answers', () => {
    // "Yes, ignore it" leads because it is the answer only the owner can give
    // — Allyvia cannot find out about a road closure any other way. Emphasis
    // is stated, never derived, so it cannot drift into meaning "most picked".
    const actions = promptActions();
    expect(actions.map((a) => a.key)).toEqual(['exclude', 'keep']);
    expect(actions[0].emphasis).toBe('primary');
    expect(actions[1].emphasis).toBe('plain');
  });

  it('says what happened once answered', () => {
    expect(promptOutcome(prompt({ status: 'excluded' }))).toContain('left out');
    expect(promptOutcome(prompt({ status: 'kept' }))).toContain('normal day');
    expect(promptOutcome(prompt({ status: 'pending' }))).toBe('');
  });
});

describe('the flag-a-day range draft', () => {
  const draft = (over = {}) => ({
    start_date: '2026-03-02',
    end_date: '2026-03-10',
    location_id: '',
    kind: 'disruption' as const,
    note: '',
    ...over
  });

  it('accepts a normal span', () => {
    expect(rangeDraftErrors(draft())).toEqual({});
    expect(isRangeDraftValid(draft())).toBe(true);
  });

  it('refuses an end before the start', () => {
    expect(rangeDraftErrors(draft({ end_date: '2026-03-01' })).end_date).toBeTruthy();
  });

  it('refuses a span past the backend maximum, and says to check the year', () => {
    const errors = rangeDraftErrors(draft({ end_date: '2126-03-02' }));
    expect(errors.end_date).toContain('Check the year');
  });

  it('accepts exactly the maximum span', () => {
    // Guards the boundary in the direction that matters: a legitimate
    // year-long renovation must not be refused by an off-by-one.
    const start = '2026-01-01';
    const end = '2027-01-01'; // 366 days inclusive in a non-leap year span
    expect(daysBetween(start, end)).toBe(MAX_RANGE_DAYS);
    expect(rangeDraftErrors(draft({ start_date: start, end_date: end }))).toEqual({});
  });

  it('summarises a span, and a single day without a count', () => {
    expect(rangeSummary('2026-03-02', '2026-03-10')).toBe('9 days · 2 March – 10 March');
    expect(rangeSummary('2026-03-06', '2026-03-06')).toBe('6 March');
  });

  it('posts the single-date shape for one day and the range shape for a span', () => {
    // A one-day range would work on the wire, but it would stamp a group_id on
    // a lone day and the settings list would offer "remove these 1 days".
    expect(payloadFromRangeDraft(draft({ start_date: '2026-03-06', end_date: '2026-03-06' }))).toEqual({
      date: '2026-03-06',
      kind: 'disruption',
      location_id: '',
      note: ''
    });
    expect(payloadFromRangeDraft(draft())).toEqual({
      start_date: '2026-03-02',
      end_date: '2026-03-10',
      kind: 'disruption',
      location_id: '',
      note: ''
    });
  });

  it('trims the note so a stray space is not stored as a note', () => {
    expect(payloadFromRangeDraft(draft({ note: '  Road closed  ' })).note).toBe('Road closed');
  });
});

describe('the clash message', () => {
  it('names the day that clashed, and says nothing was changed', () => {
    // A 409 that does not say WHICH day is a dead end: the owner cannot tell
    // whether to shorten the range or edit what is already there.
    expect(clashMessage(['2026-03-04'])).toBe('4 March is already flagged. Nothing was changed.');
  });

  it('names the first few and counts the rest', () => {
    const message = clashMessage(['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05']);
    expect(message).toContain('1 March, 2 March, 3 March');
    expect(message).toContain('and 2 more');
  });

  it('still says something useful when the backend sends no dates', () => {
    expect(clashMessage(undefined)).toBeTruthy();
    expect(clashMessage([])).toBeTruthy();
  });
});

describe('grouping the settings list', () => {
  it('collapses a declared range into one entry', () => {
    const rows = ['2026-03-02', '2026-03-03', '2026-03-04'].map((date, i) =>
      exception({ id: i + 1, date, group_id: 'g1', note: 'Road closed' })
    );
    const groups = groupExclusions(rows);

    expect(groups).toHaveLength(1);
    expect(groups[0].days).toBe(3);
    expect(groups[0].start).toBe('2026-03-02');
    expect(groups[0].end).toBe('2026-03-04');
    expect(groups[0].ids).toEqual([1, 2, 3]);
  });

  it('keeps separately declared days separate', () => {
    // Both have group_id null. Keying on that alone would merge two unrelated
    // days into one entry the owner could not remove independently.
    const groups = groupExclusions([exception({ id: 1, date: '2026-03-02' }), exception({ id: 2, date: '2026-05-20' })]);
    expect(groups).toHaveLength(2);
  });

  it('orders newest first', () => {
    const groups = groupExclusions([exception({ id: 1, date: '2026-01-05' }), exception({ id: 2, date: '2026-09-09' })]);
    expect(groups.map((g) => g.start)).toEqual(['2026-09-09', '2026-01-05']);
  });

  it('reports a range whatever order the rows arrive in', () => {
    const groups = groupExclusions([
      exception({ id: 3, date: '2026-03-04', group_id: 'g1' }),
      exception({ id: 1, date: '2026-03-02', group_id: 'g1' }),
      exception({ id: 2, date: '2026-03-03', group_id: 'g1' })
    ]);
    expect(groups[0].start).toBe('2026-03-02');
    expect(groups[0].end).toBe('2026-03-04');
    expect(groups[0].ids).toEqual([1, 2, 3]);
  });

  it('carries the source so the owner can tell the two apart', () => {
    const groups = groupExclusions([exception({ id: 1, source: 'agent_prompted' })]);
    expect(groups[0].source).toBe('agent_prompted');
  });
});

describe('the prompt panel title', () => {
  it('counts, so one day does not read as several', () => {
    expect(promptPanelTitle(1)).toBe('A day that looked unusual');
    expect(promptPanelTitle(3)).toBe('3 days that looked unusual');
  });
});

describe('what else removing an entry does', () => {
  const group = (over = {}) => ({
    key: 'g',
    groupId: null,
    start: '2026-03-06',
    end: '2026-03-06',
    days: 1,
    kind: 'disruption' as const,
    demand_effect: 'neutral' as const,
    note: '',
    source: 'manual' as const,
    created_by_email: '',
    ids: [1],
    ...over
  });

  it('says nothing for a plain learning exclusion', () => {
    // The common case must stay quiet, or the warning becomes furniture.
    expect(removalConsequence(group())).toBe('');
  });

  it('warns that removing a closure re-opens the store', () => {
    // excluded_dates covers EVERY kind, so a closure declared in Scheduling >
    // Calendar — zero demand, a count crew instead of normal staffing — is
    // listed here beside an ordinary road closure. Removing it from a page
    // whose copy only mentions learning would silently restore staffing.
    expect(removalConsequence(group({ demand_effect: 'zero' }))).toContain('re-opens the store');
  });

  it('warns about a demand adjustment too', () => {
    expect(removalConsequence(group({ demand_effect: 'dampen' }))).toContain('demand adjustment');
    expect(removalConsequence(group({ demand_effect: 'boost' }))).toContain('demand adjustment');
  });
});

describe('a range with days removed from the middle', () => {
  it('reports the days still flagged, not the span', () => {
    // The Calendar tab offers a per-row Remove on a day belonging to a group,
    // so a nine-day closure can become seven flagged days between the same two
    // endpoints. Reporting the span would tell the owner nine days are
    // excluded when two of them are back in the model.
    expect(rangeSummary('2026-03-02', '2026-03-10', 7)).toBe('7 of 9 days · 2 March – 10 March');
  });

  it('says it plainly when the range is intact', () => {
    expect(rangeSummary('2026-03-02', '2026-03-10', 9)).toBe('9 days · 2 March – 10 March');
  });

  it('is unchanged when no count is supplied', () => {
    expect(rangeSummary('2026-03-02', '2026-03-10')).toBe('9 days · 2 March – 10 March');
  });
});

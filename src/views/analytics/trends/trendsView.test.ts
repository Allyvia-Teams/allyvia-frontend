import { describe, expect, it } from 'vitest';

import {
  ALL,
  ALL_STORES,
  CHANGED,
  GATE_FAILED,
  NO_SALES,
  PAST,
  SENTENCES,
  STORE_NOT_PROVEN,
  STORE_OK,
  TODAY,
  WITH_EVENT,
  payload
} from './trendsFixtures';
import {
  DEFAULT_LINES,
  STORAGE_KEY,
  availability,
  buildChart,
  dayPanel,
  eventMarks,
  extremeWords,
  forecastNote,
  hasNoSales,
  hasNothing,
  lineColours,
  readLines,
  showsChange,
  stepDay,
  toggleLine,
  visibleLines,
  writeLines
} from './trendsView';

const texts = (day: Parameters<typeof dayPanel>[0], p: Parameters<typeof dayPanel>[1]) => dayPanel(day, p).lines.map((l) => l.text);

describe('the chart series', () => {
  it('draws a day with no sales data as a gap, never a zero', () => {
    const chart = buildChart(STORE_OK, DEFAULT_LINES);
    expect(chart.dates[0]).toBe('2026-11-08');
    expect(chart.sales[0]).toBeNull();
    expect(chart.sales[1]).toBe(459.86);
  });

  it('draws an observed 0.00 as a zero point', () => {
    const chart = buildChart(payload({ days: [{ ...PAST, revenue: '0.00' }, { ...NO_SALES }] }), DEFAULT_LINES);
    expect(chart.sales).toEqual([0, null]);
  });

  it('keeps the gap between two observed days (the neighbours are not joined by a value)', () => {
    const days = [
      { ...PAST, date: '2026-11-05' },
      { ...NO_SALES, date: '2026-11-06' },
      { ...PAST, date: '2026-11-07' }
    ];
    expect(buildChart(payload({ days }), DEFAULT_LINES).sales).toEqual([459.86, null, 459.86]);
  });

  it('starts the expected range at today and only when the forecast is proven', () => {
    const chart = buildChart(STORE_OK, DEFAULT_LINES);
    expect(chart.range).not.toBeNull();
    expect(chart.range?.map((r) => r.expected)).toEqual([null, null, 533.9, 533.9, 313.45]);
    expect(chart.range?.[2]).toEqual({ low: 478.32, high: 589.49, expected: 533.9 });
    expect(chart.todayIndex).toBe(2);
  });

  it('never draws a range before today, even if a day before it carried a band', () => {
    const early = payload({ days: [{ ...PAST, band: { expected: '1.00', low: '0.50', high: '2.00' } }, TODAY] });
    expect(buildChart(early, DEFAULT_LINES).range?.[0]).toEqual({ low: null, high: null, expected: null });
  });

  it.each(['not_proven_yet', 'not_enough_history', 'pick_a_store'] as const)(
    'draws no range when the status is %s, and passes the sentence on unchanged',
    (status) => {
      const p = payload({
        band_status: status,
        band_sentence: SENTENCES[status],
        days: [PAST, TODAY, CHANGED] // even a day that carries a band is not drawn
      });
      expect(buildChart(p, DEFAULT_LINES).range).toBeNull();
      expect(availability(p).range.available).toBe(false);
      expect(forecastNote(p)).toBe(SENTENCES[status]);
    }
  );

  it('prints no forecast sentence when the forecast is proven, or when the range ends before today', () => {
    expect(forecastNote(STORE_OK)).toBeNull();
    expect(forecastNote({ ...STORE_NOT_PROVEN, end: '2026-11-10' })).toBeNull();
    expect(forecastNote(STORE_NOT_PROVEN)).toBe(SENTENCES.not_proven_yet);
  });

  it('for all stores has no weather series and no range, and marks both unavailable', () => {
    const chart = buildChart(ALL, DEFAULT_LINES);
    expect(chart.weather).toBeNull();
    expect(chart.range).toBeNull();
    const a = availability(ALL);
    expect(a.weather).toEqual({ available: false, reason: expect.stringContaining('per store') });
    expect(a.range.available).toBe(false);
    expect(a.range.reason).toMatch(/pick a store/i);
    expect(a.sales.available).toBe(true);
    expect(visibleLines(DEFAULT_LINES, ALL)).toEqual(['sales', 'lastYear', 'events']);
  });

  it('draws the weather on its own series for a store, and leaves a day with no score a gap', () => {
    const p = payload({ days: [PAST, { ...PAST, date: '2026-11-18', weather: null }] });
    expect(buildChart(p, DEFAULT_LINES).weather).toEqual([4.3, null]);
  });

  it('drops a line she switched off, but sales stays on', () => {
    const chart = buildChart(STORE_OK, ['lastYear']);
    expect(chart.lines).toEqual(['sales', 'lastYear']);
    expect(chart.range).toBeNull();
    expect(chart.weather).toBeNull();
    expect(chart.events).toEqual([]);
  });

  it('reads an empty range as having no sales', () => {
    expect(hasNoSales(payload({ days: [NO_SALES] }))).toBe(true);
    expect(hasNoSales(STORE_OK)).toBe(false);
  });

  it('has nothing to draw only when no line has a value', () => {
    expect(hasNothing(buildChart(payload({ days: [{ ...NO_SALES, revenue_last_year: null, weather: null }] }), DEFAULT_LINES))).toBe(true);
    // a range ahead with no sales yet still has a forecast and weather to show
    expect(hasNothing(buildChart(payload({ days: [TODAY] }), DEFAULT_LINES))).toBe(false);
    expect(
      hasNothing(
        buildChart(
          payload({
            days: [
              WITH_EVENT,
              { ...WITH_EVENT, date: '2026-11-11', revenue: null, revenue_last_year: null, weather: null, events: [] }
            ].slice(1)
          }),
          DEFAULT_LINES
        )
      )
    ).toBe(true);
  });
});

describe('event marks', () => {
  const day = (date: string, ...names: string[]) => ({
    date,
    events: names.map((name) => ({ name, kind: 'spend_window', source: 'spend_window' as const }))
  });

  it('draws a three-day spend window as one span', () => {
    const marks = eventMarks([
      day('2026-11-26', 'Black Friday'),
      day('2026-11-27', 'Black Friday'),
      day('2026-11-28', 'Black Friday'),
      day('2026-11-29')
    ]);
    expect(marks).toEqual([{ kind: 'span', start: '2026-11-26', end: '2026-11-28', name: 'Black Friday' }]);
  });

  it('draws two events on one day as one marker with both names', () => {
    expect(eventMarks([day('2026-11-26', 'Thanksgiving', 'Pie sale')])).toEqual([
      { kind: 'marker', date: '2026-11-26', names: ['Thanksgiving', 'Pie sale'] }
    ]);
  });

  it('does not join the same event on two days with a day between', () => {
    const marks = eventMarks([day('2026-11-01', 'Sale'), day('2026-11-02'), day('2026-11-03', 'Sale')]);
    expect(marks).toEqual([
      { kind: 'marker', date: '2026-11-01', names: ['Sale'] },
      { kind: 'marker', date: '2026-11-03', names: ['Sale'] }
    ]);
  });

  it('keeps a span and a one-day event on the same date apart', () => {
    const marks = eventMarks([day('2026-11-26', 'Black Friday', 'Pie sale'), day('2026-11-27', 'Black Friday')]);
    expect(marks).toEqual([
      { kind: 'span', start: '2026-11-26', end: '2026-11-27', name: 'Black Friday' },
      { kind: 'marker', date: '2026-11-26', names: ['Pie sale'] }
    ]);
  });
});

describe('the day panel', () => {
  const store = STORE_OK;

  it('a past day: what it took and the same weekday last year, then weather', () => {
    expect(texts(PAST, store)).toEqual([
      'Took $459.86.',
      'Same weekday last year: $459.75.',
      'Weather: 4.3 out of 10 for this time of year.'
    ]);
  });

  it('a day with no sales data says so, and never says it took nothing', () => {
    const lines = texts(NO_SALES, store);
    expect(lines[0]).toBe('No sales data for this day.');
    expect(lines.join(' ')).not.toMatch(/took/i);
    expect(lines.join(' ')).not.toMatch(/\$0/);
  });

  it('an observed zero says it took $0.00', () => {
    expect(texts({ ...PAST, revenue: '0.00' }, store)[0]).toBe('Took $0.00.');
  });

  it('today: no sales yet, last year, the forecast weather and the expected range', () => {
    expect(texts(TODAY, store)).toEqual([
      'No sales recorded yet today.',
      'Same weekday last year: $578.34.',
      'Forecast weather: 6.0 out of 10 for this time of year.',
      'Expected about $534, between $478 and $589.'
    ]);
  });

  it('a changed day for weather names the weather; for the calendar, the calendar', () => {
    expect(texts(CHANGED, store).slice(-2)).toEqual([
      'Expected about $313, between $302 and $324.',
      'Yesterday we expected about $448. Now about $313, because the weather forecast changed.'
    ]);
    const calendar = { ...CHANGED, changed: { ...CHANGED.changed!, because: 'calendar' as const } };
    expect(texts(calendar, store).at(-1)).toBe('Yesterday we expected about $448. Now about $313, because of a change in the calendar.');
  });

  it('a change because of history makes no sentence', () => {
    const history = { ...CHANGED, changed: { ...CHANGED.changed!, because: 'history' as const } };
    const lines = texts(history, store);
    expect(lines.join(' ')).not.toMatch(/Yesterday we expected/);
    expect(lines.join(' ')).toMatch(/Expected about \$313/);
    expect(showsChange(history.changed)).toBe(false);
    expect(showsChange(CHANGED.changed)).toBe(true);
    expect(showsChange(null)).toBe(false);
  });

  it('a day ahead when the gate failed shows no expectation and no change', () => {
    const lines = texts(GATE_FAILED, STORE_NOT_PROVEN);
    expect(lines.join(' ')).not.toMatch(/Expected|Yesterday/);
    expect(lines[0]).toMatch(/Same weekday last year/);
  });

  it('never shows an expected figure when the status is not ok, even on a day that carries one', () => {
    const lines = texts(TODAY, { ...STORE_NOT_PROVEN, today: '2026-11-18' });
    expect(lines.join(' ')).not.toMatch(/Expected/);
  });

  it('for all stores: revenue, last year and nothing about weather', () => {
    expect(texts(ALL_STORES, ALL)).toEqual(['Took $1,450.97.', 'Same weekday last year: $1,300.00.']);
  });

  it('a day with an event names it', () => {
    expect(texts(WITH_EVENT, store)).toContain('Event: Back to school.');
    const two = { ...WITH_EVENT, events: [...WITH_EVENT.events, { name: 'Pie sale', kind: 'owner', source: 'owner' as const }] };
    expect(texts(two, store)).toContain('Events: Back to school and Pie sale.');
  });

  it('a band with no low and high says only the expected figure', () => {
    const open = { ...TODAY, band: { expected: '533.90', low: null, high: null } };
    expect(texts(open, store).at(-1)).toBe('Expected about $534.');
  });

  it("each sentence names the line it is about, so the panel wears that line's colour", () => {
    expect(dayPanel(CHANGED, store).lines.map((l) => l.line)).toEqual(['lastYear', 'weather', 'range', 'range']);
    expect(dayPanel(PAST, store).lines.map((l) => l.line)).toEqual(['sales', 'lastYear', 'weather']);
  });

  it('heads the panel with the weekday and date', () => {
    expect(dayPanel(PAST, store).heading).toBe('Tuesday, November 17, 2026');
  });

  it('a currency other than dollars prints in it', () => {
    expect(texts(PAST, { ...store, currency: 'GBP' })[0]).toBe('Took £459.86.');
  });
});

describe('extremes in words', () => {
  it.each([
    ['thunderstorm', 'thunderstorm'],
    ['winter_storm', 'winter storm'],
    ['heavy_rain', 'heavy rain'],
    ['extreme_heat', 'extreme heat'],
    ['extreme_cold', 'extreme cold']
  ])('%s reads %s', (key, words) => {
    expect(extremeWords([key])).toEqual([words]);
    const day = { ...PAST, weather: { score: '4.3', extremes: [key], forecast: false } };
    expect(texts(day, STORE_OK)).toContain(`Extreme weather: ${words}.`);
  });

  it('says two in a sentence, and a forecast one as expected', () => {
    const day = { ...TODAY, weather: { score: '6.0', extremes: ['thunderstorm', 'heavy_rain'], forecast: true } };
    expect(texts(day, STORE_OK)).toContain('Extreme weather expected: thunderstorm and heavy rain.');
  });

  it('an empty list and null add nothing', () => {
    expect(extremeWords([])).toEqual([]);
    expect(extremeWords(null)).toEqual([]);
    for (const extremes of [[], null]) {
      const lines = texts({ ...PAST, weather: { score: '4.3', extremes, forecast: false } }, STORE_OK);
      expect(lines.join(' ')).not.toMatch(/extreme/i);
    }
  });

  it('a score that could not be given adds no weather sentence', () => {
    const lines = texts({ ...PAST, weather: { score: null, extremes: null, forecast: false } }, STORE_OK);
    expect(lines.join(' ')).not.toMatch(/Weather/);
  });

  it('never prints a code name for a key it does not know', () => {
    expect(extremeWords(['volcanic_ash'])).toEqual(['volcanic ash']);
  });
});

describe('the words on screen', () => {
  it('uses none of the banned words in what it composes', () => {
    const all = [PAST, NO_SALES, TODAY, CHANGED, GATE_FAILED, WITH_EVENT].flatMap((d) => texts(d, STORE_OK));
    const menu = Object.values(availability(ALL)).map((a) => a.reason ?? '');
    for (const text of [...all, ...menu]) expect(text).not.toMatch(/\b(band|vintage|gate|precedent|signal|score)\b/i);
  });
});

describe('colours', () => {
  const theme = {
    palette: {
      primary: { main: '#111' },
      secondary: { main: '#222' },
      info: { main: '#333' },
      grey: { 500: '#555', 700: '#777' }
    }
  };

  it('gives every line its own colour, defined once', () => {
    const colours = lineColours(theme);
    expect(Object.keys(colours).sort()).toEqual(['events', 'lastYear', 'range', 'sales', 'weather']);
    expect(new Set(Object.values(colours)).size).toBe(5);
    expect(lineColours(theme)).toEqual(colours);
  });
});

describe('remembered lines', () => {
  const memory = () => {
    const data = new Map<string, string>();
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
  };

  it('gives the defaults with nothing saved', () => {
    expect(readLines(memory())).toEqual([...DEFAULT_LINES]);
    expect(readLines(null)).toEqual([...DEFAULT_LINES]);
  });

  it('round-trips her choice, sales always included', () => {
    const storage = memory();
    writeLines(['weather'], storage);
    expect(readLines(storage)).toEqual(['sales', 'weather']);
  });

  it('survives a blocked storage and a damaged value', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      }
    };
    expect(readLines(blocked)).toEqual([...DEFAULT_LINES]);
    expect(() => writeLines(['events'], blocked)).not.toThrow();
    const storage = memory();
    storage.setItem(STORAGE_KEY, '{not json');
    expect(readLines(storage)).toEqual([...DEFAULT_LINES]);
    storage.setItem(STORAGE_KEY, JSON.stringify(['events', 'bogus']));
    expect(readLines(storage)).toEqual(['sales', 'events']);
  });

  it('toggles a line, and sales cannot be switched off', () => {
    expect(toggleLine(DEFAULT_LINES, 'weather')).not.toContain('weather');
    expect(toggleLine(['sales'], 'weather')).toEqual(['sales', 'weather']);
    expect(toggleLine(['sales'], 'sales')).toEqual(['sales']);
  });
});

describe('keyboard selection', () => {
  it('walks the days and stays inside the range', () => {
    expect(stepDay(null, 5, 'ArrowRight')).toBe(0);
    expect(stepDay(null, 5, 'ArrowLeft')).toBe(4);
    expect(stepDay(0, 5, 'ArrowLeft')).toBe(0);
    expect(stepDay(4, 5, 'ArrowRight')).toBe(4);
    expect(stepDay(2, 5, 'ArrowRight')).toBe(3);
    expect(stepDay(2, 30, 'PageDown')).toBe(9);
    expect(stepDay(2, 30, 'Home')).toBe(0);
    expect(stepDay(2, 30, 'End')).toBe(29);
  });

  it('ignores other keys and an empty range', () => {
    expect(stepDay(2, 5, 'a')).toBeNull();
    expect(stepDay(null, 0, 'ArrowRight')).toBeNull();
  });
});

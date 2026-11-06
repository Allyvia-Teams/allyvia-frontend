import { describe, expect, it } from 'vitest';

import type { VersionEntry } from 'api/buying.api';

import { DRESS } from './planFixtures';
import { chipText, diffLines, versionRows, whenText } from './versions';

const NY = 'America/New_York';
const NOW = new Date('2027-03-02T15:00:00Z'); // 10:00 in New York

describe("versionRows: the plan's history, newest first as the server sends it", () => {
  const entries: VersionEntry[] = [
    { at: '2027-03-02T12:10:00Z', kind: 'decision', sentence: 'Wrap Dress: you set 48 units by o@x.test.', line_id: DRESS },
    { at: '2027-03-01T12:00:00Z', kind: 'revision', sentence: 'Wrap Dress: 40 → 46.', line_id: DRESS, revision: 4 },
    { at: '2027-02-28T15:00:00Z', kind: 'revision', sentence: 'Wrap Dress: first sized at 40 units.', line_id: DRESS, revision: 1 },
    { at: '2027-02-28T15:00:00Z', kind: 'months', sentence: 'The months moved.', revision: 2 },
    { at: '2027-02-27T09:00:00Z', kind: 'frozen', sentence: 'The plan froze.' }
  ];

  it('renders a decision and a revision differently', () => {
    const rows = versionRows(entries, NOW, NY);
    expect(rows[0]).toMatchObject({ kindLabel: 'Your decision', tone: 'owner' });
    expect(rows[1]).toMatchObject({ kindLabel: 'Re-sized', tone: 'planner' });
    expect(rows[0].sentence).toBe('Wrap Dress: you set 48 units by o@x.test.');
  });

  it("offers a diff only for a line's revision above the first (a months entry has no line)", () => {
    const rows = versionRows(entries, NOW, NY);
    expect(rows.map((r) => r.diff)).toEqual([null, { line: DRESS, revision: 4 }, null, null, null]);
  });

  it("keeps the server's order and gives each row a key", () => {
    const rows = versionRows(entries, NOW, NY);
    expect(rows.map((r) => r.kind)).toEqual(['decision', 'revision', 'revision', 'months', 'frozen']);
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
  });
});

describe("time words, in the store's browser zone", () => {
  it('says today, yesterday, then the date', () => {
    expect(whenText('2027-03-02T12:10:00Z', NOW, NY)).toBe('Today 7:10 am');
    expect(whenText('2027-03-01T12:00:00Z', NOW, NY)).toBe('Yesterday 7:00 am');
    expect(whenText('2027-02-27T09:00:00Z', NOW, NY)).toBe('Sat, Feb 27 4:00 am');
  });
});

describe('the version chip and the diff', () => {
  it('counts the changes and names the newest', () => {
    expect(
      chipText({ entries: [{ at: '2027-03-02T12:10:00Z', kind: 'decision', sentence: '' }], page: 1, pages: 1, count: 12 }, NOW, NY)
    ).toBe('12 changes · Today 7:10 am');
    expect(chipText({ entries: [], page: 1, pages: 1, count: 0 }, NOW, NY)).toBe('No changes yet');
    expect(
      chipText({ entries: [{ at: '2027-03-02T12:10:00Z', kind: 'frozen', sentence: '' }], page: 1, pages: 1, count: 1 }, NOW, NY)
    ).toBe('1 change · Today 7:10 am');
  });

  it('formats a revision diff as its own lines', () => {
    expect(
      diffLines({
        changed: [{ key: 'line.qty', field: 'amount', before: '40', after: '46' }],
        added: ['line.flag.wide'],
        removed: ['line.cap']
      })
    ).toEqual(['line.qty amount: 40 → 46', 'line.flag.wide added', 'line.cap removed']);
    expect(diffLines(null)).toEqual([]);
  });
});

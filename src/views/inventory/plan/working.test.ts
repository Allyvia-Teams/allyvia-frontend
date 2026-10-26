import { describe, expect, it } from 'vitest';

import { DRESS, DRESS_TRACE, intakeFile, line, planDetail, revision, run, TOP } from './planFixtures';
import { banner, countWords, fileIssues, pageState, readCounts, slowRun, steps, STEP_LABELS } from './working';

describe('pageState: one page, five states', () => {
  it('is empty with no lines and no files', () => {
    expect(pageState(planDetail({ lines: [], files: [] }))).toBe('empty');
  });

  it('is working while a run is queued or running and no line has a number yet', () => {
    const fresh = [line(DRESS, 'Wrap Dress')];
    expect(pageState(planDetail({ lines: fresh, run: run('queued') }))).toBe('working');
    expect(pageState(planDetail({ lines: [], files: [intakeFile({ status: 'pending' })], run: run('running', 'reading_catalog') }))).toBe(
      'working'
    );
  });

  it('needs sizing when a live plan has lines (or files waiting) and no run is going: styles added from the catalogue, a failed queue', () => {
    expect(pageState(planDetail({ lines: [line(DRESS, 'Wrap Dress')], run: run('idle') }))).toBe('needs_sizing');
    expect(pageState(planDetail({ lines: [line(DRESS, 'Wrap Dress')], run: run('stale') }))).toBe('needs_sizing');
    expect(pageState(planDetail({ lines: [], files: [intakeFile({ status: 'pending' })], run: run('idle') }))).toBe('needs_sizing');
  });

  it('is failed when the first run failed', () => {
    expect(pageState(planDetail({ lines: [line(DRESS, 'Wrap Dress')], run: { ...run('failed'), error: 'The band is missing.' } }))).toBe(
      'failed'
    );
  });

  it('shows the memo once any line has a number, whatever the run is doing (the chat stays mounted)', () => {
    expect(pageState(planDetail())).toBe('memo');
    expect(pageState(planDetail({ run: run('running', 'sizing') }))).toBe('memo');
    expect(pageState(planDetail({ run: run('stale') }))).toBe('memo');
    expect(pageState(planDetail({ run: run('failed') }))).toBe('memo');
    // One sized line is enough: another still waiting for a price does not hide the memo.
    expect(pageState(planDetail({ lines: [planDetail().lines[0], line(TOP, 'Silk Cami', { needs_price: true })] }))).toBe('memo');
  });

  it('shows the memo for a frozen plan with no numbers rather than asking to size it', () => {
    expect(pageState(planDetail({ status: 'frozen', lines: [line(DRESS, 'Wrap Dress')], run: run('idle') }))).toBe('memo');
  });
});

describe('banner: what sits above the memo', () => {
  it('says the step while a re-size runs', () => {
    expect(banner(planDetail({ run: run('running', 'sizing') }))).toMatchObject({ kind: 'working', resize: false });
  });

  it("offers Re-size on a stale live plan, and says the server's error on a failed one", () => {
    expect(banner(planDetail({ run: run('stale') }))).toMatchObject({ kind: 'stale', resize: true });
    const failed = banner(planDetail({ run: { ...run('failed'), error: 'No forecast covers this window.' } }));
    expect(failed).toMatchObject({ kind: 'failed', resize: true, text: 'No forecast covers this window.' });
  });

  it("says a done run's own error sentence", () => {
    expect(banner(planDetail({ run: { ...run('done'), error: '2 lines could not be sized.' } }))).toMatchObject({
      kind: 'note',
      text: '2 lines could not be sized.'
    });
  });

  it('is nothing on a done run with no error, and never offers Re-size on a frozen plan', () => {
    expect(banner(planDetail())).toBeNull();
    expect(banner(planDetail({ status: 'frozen', run: run('stale') }))).toBeNull();
  });
});

describe("steps: the run's words", () => {
  it('names each step, marks the one running, and those before it done', () => {
    const s = steps(run('running', 'matching'), 'Apr 5 – Jun 27');
    expect(s.map((x) => x.state)).toEqual(['done', 'done', 'now', 'todo', 'todo', 'todo']);
    expect(s[0].label).toBe(STEP_LABELS.reading_catalog);
    expect(s[4].label).toBe('Sizing for Apr 5 – Jun 27');
  });

  it('says waiting while queued, before any step', () => {
    const s = steps(run('queued'), 'Apr 5 – Jun 27');
    expect(s.every((x) => x.state === 'todo')).toBe(true);
    expect(STEP_LABELS.queued).toBe('Waiting to start');
  });

  it('flags a run silent past ten minutes', () => {
    const r = { ...run('running', 'sizing'), started_at: '2027-02-28T15:00:00Z' };
    expect(slowRun(r, new Date('2027-02-28T15:09:59Z'))).toBe(false);
    expect(slowRun(r, new Date('2027-02-28T15:10:01Z'))).toBe(true);
    expect(slowRun(run('done'), new Date('2027-03-01T00:00:00Z'))).toBe(false);
  });
});

describe('counts and issues: only what the files say', () => {
  it('counts items, files and pictures from the read files only', () => {
    const files = [
      intakeFile({ id: 'a', lines_created: 9, images_attached: 0 }),
      intakeFile({ id: 'b', filename: 'sheet.pdf', format: 'pdf', lines_created: 0, lines_merged: 9, images_attached: 9 }),
      intakeFile({ id: 'c', filename: 'x.jpg', status: 'pending', lines_created: 0 }),
      intakeFile({ id: 'd', filename: 'late.csv', status: 'pending', reason: 'The plan closed before this file was read.' })
    ];
    expect(readCounts(files)).toEqual({ items: 9, merged: 9, files: 2, pictures: 9, pending: 1 });
    expect(countWords(readCounts(files))).toBe('9 items from 2 files, 9 matched to items already here, 9 with pictures');
    expect(countWords({ items: 0, merged: 9, files: 1, pictures: 0, pending: 0 })).toBe(
      '0 items from 1 file, 9 matched to items already here'
    );
  });

  it('a file left pending with a reason is said, not counted as waiting', () => {
    const issues = fileIssues(
      [intakeFile({ id: 'd', filename: 'late.csv', status: 'pending', reason: 'The plan closed before this file was read.' })],
      []
    );
    expect(issues.waiting).toEqual([{ filename: 'late.csv', sentence: 'The plan closed before this file was read.' }]);
  });

  it('lists refusals from the drop response (never stored as files) and refused or failed files, each with its sentence', () => {
    const issues = fileIssues(
      [
        intakeFile({ id: 'r', filename: 'scan.tiff', status: 'refused', reason: 'scan.tiff is not a spreadsheet, a PDF or a photo.' }),
        intakeFile({ id: 'p', filename: 'sheet.pdf', format: 'pdf', parked: [{ page: 4, reason: 'no prices on this page' }] }),
        intakeFile({ id: 'a', filename: 'sheet.csv', ambiguous_price_column: 'Price' })
      ],
      [{ file: 'huge.pdf', reason: 'huge.pdf is over 20 MB.' }]
    );
    expect(issues.refused).toEqual([
      { filename: 'huge.pdf', sentence: 'huge.pdf is over 20 MB.' },
      { filename: 'scan.tiff', sentence: 'scan.tiff is not a spreadsheet, a PDF or a photo.' }
    ]);
    expect(issues.parked).toEqual([{ filename: 'sheet.pdf', page: 4, reason: 'no prices on this page' }]);
    expect(issues.askPrice).toEqual([{ fileId: 'a', filename: 'sheet.csv', column: 'Price' }]);
  });

  it('asks about a price column only until it is answered', () => {
    expect(fileIssues([intakeFile({ ambiguous_price_column: 'Price', price_means: 'retail' })], []).askPrice).toEqual([]);
  });

  it('a line with a revision is sized', () => {
    expect(
      pageState(planDetail({ lines: [line(DRESS, 'Wrap Dress', { revision: revision(DRESS_TRACE, null, { status: 'insufficient' }) })] }))
    ).toBe('memo');
  });
});

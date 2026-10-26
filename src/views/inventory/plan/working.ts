// The plan page's state machine (Inventory › Plan, buy planner B9; design §10's three states, made five by what
// the backend can be in).
//
// - empty: nothing dropped, nothing added;
// - needs_sizing: a live plan with lines (or files waiting) and no run going: styles added from the catalogue,
//   a price filled in, an exclusion, a queue that failed: the page offers Re-size (the backend marks the plan
//   stale and runs nothing);
// - working: a run queued or running before any line has a number;
// - failed: the first run failed (its own sentence);
// - memo: any line has a number. From then on a re-size shows as a banner above the memo, so the memo and the
//   chat stay mounted (a conversation is not restored on reload).
//
// Counts come only from the files' own fields; nothing is estimated.

import type { IntakeFile, PlanDetail, Run, RunStep } from 'api/buying.api';

export type PageState = 'empty' | 'needs_sizing' | 'working' | 'failed' | 'memo';

const LIVE = new Set(['draft', 'open']);
const GOING = new Set(['queued', 'running']);

const sized = (plan: PlanDetail) => plan.lines.some((line) => line.revision !== null);

export const pageState = (plan: PlanDetail): PageState => {
  if (sized(plan)) return 'memo';
  const live = LIVE.has(plan.status);
  const pending = plan.files.some((file) => file.status === 'pending');
  if (GOING.has(plan.run.status)) return 'working';
  if (plan.lines.length === 0 && plan.files.length === 0) return 'empty';
  if (!live) return 'memo';
  if (plan.run.status === 'failed') return 'failed';
  if (plan.lines.length > 0 || pending) return 'needs_sizing';
  return 'empty';
};

export const STEP_ORDER: Exclude<RunStep, ''>[] = ['reading_catalog', 'encoding', 'matching', 'carrying', 'sizing', 'composing'];

export const STEP_LABELS: Record<Exclude<RunStep, ''> | 'queued', string> = {
  queued: 'Waiting to start',
  reading_catalog: 'Reading your catalog',
  encoding: 'Encoding each item',
  matching: 'Matching against last year',
  carrying: 'Carrying forward what already sells',
  sizing: 'Sizing for the window',
  composing: 'Writing the memo'
};

export interface StepView {
  key: Exclude<RunStep, ''>;
  label: string;
  state: 'done' | 'now' | 'todo';
}

export const steps = (run: Run, windowWords: string): StepView[] => {
  const at = run.status === 'running' && run.step ? STEP_ORDER.indexOf(run.step as Exclude<RunStep, ''>) : -1;
  return STEP_ORDER.map((key, index) => ({
    key,
    label: key === 'sizing' && windowWords ? `Sizing for ${windowWords}` : STEP_LABELS[key],
    state: at < 0 ? 'todo' : index < at ? 'done' : index === at ? 'now' : 'todo'
  }));
};

/** The words for where a run is now. */
export const runWords = (run: Run, windowWords: string): string => {
  if (run.status === 'queued' || (run.status === 'running' && !run.step)) return STEP_LABELS.queued;
  const now = steps(run, windowWords).find((s) => s.state === 'now');
  return now ? now.label : '';
};

const SLOW_MS = 10 * 60 * 1000;

/** A run going for more than ten minutes (the page says so; the server re-claims a run silent for an hour). */
export const slowRun = (run: Run, now: Date): boolean => {
  if (!GOING.has(run.status) || !run.started_at) return false;
  const started = Date.parse(run.started_at);
  return Number.isFinite(started) && now.getTime() - started > SLOW_MS;
};

export type BannerKind = 'working' | 'stale' | 'failed' | 'note';

export interface BannerView {
  kind: BannerKind;
  text: string;
  resize: boolean;
}

/** What sits above the memo once it exists; null when nothing needs saying. */
export const banner = (plan: PlanDetail, windowWords = ''): BannerView | null => {
  const live = LIVE.has(plan.status);
  const run = plan.run;
  if (GOING.has(run.status)) return { kind: 'working', text: `${runWords(run, windowWords)}…`, resize: false };
  if (!live) return null;
  if (run.status === 'stale') {
    return {
      kind: 'stale',
      text: 'You changed this plan since it was last sized. Re-size it to bring the numbers up to date.',
      resize: true
    };
  }
  if (run.status === 'failed') return { kind: 'failed', text: run.error || 'The last re-size failed.', resize: true };
  if (run.error) return { kind: 'note', text: run.error, resize: false };
  return null;
};

export interface ReadCounts {
  items: number;
  files: number;
  pictures: number;
  pending: number;
}

/** Items read, from the files read: never an estimate. */
export const readCounts = (files: IntakeFile[]): ReadCounts => {
  const read = files.filter((file) => file.status === 'read');
  return {
    items: read.reduce((sum, file) => sum + (file.lines_created || 0), 0),
    files: read.length,
    pictures: read.reduce((sum, file) => sum + (file.images_attached || 0), 0),
    pending: files.filter((file) => file.status === 'pending').length
  };
};

export const countWords = (counts: ReadCounts): string => {
  if (counts.files === 0) return '';
  const items = `${counts.items} item${counts.items === 1 ? '' : 's'}`;
  const files = `${counts.files} file${counts.files === 1 ? '' : 's'}`;
  const pictures = counts.pictures ? `, ${counts.pictures} with pictures` : '';
  return `${items} from ${files}${pictures}`;
};

export interface FileIssues {
  refused: { filename: string; sentence: string }[];
  parked: { filename: string; page: number; reason: string }[];
  askPrice: { fileId: string; filename: string; column: string }[];
}

/** What the drop could not use, each with the server's sentence; refusals never stored as files come first. */
export const fileIssues = (files: IntakeFile[], refusedOnDrop: { file: string; reason: string }[]): FileIssues => ({
  refused: [
    ...refusedOnDrop.map((r) => ({ filename: r.file, sentence: r.reason })),
    ...files
      .filter((file) => file.status === 'refused' || file.status === 'failed')
      .map((file) => ({ filename: file.filename, sentence: file.reason || `${file.filename} could not be read.` }))
  ],
  parked: files.flatMap((file) => (file.parked || []).map((p) => ({ filename: file.filename, page: p.page, reason: p.reason }))),
  askPrice: files
    .filter((file) => file.ambiguous_price_column && !file.price_means)
    .map((file) => ({ fileId: file.id, filename: file.filename, column: file.ambiguous_price_column as string }))
});

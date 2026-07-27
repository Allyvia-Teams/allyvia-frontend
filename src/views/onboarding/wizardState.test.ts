import { describe, expect, it } from 'vitest';

import type { IngestPhase, IngestionJob, OnboardingSource, OnboardingState, SourceLastExport } from 'api/onboarding.api';
import type { CompanyBusinessInfo } from 'types/settings';
import {
  canRetryNormalize,
  deriveStepFromBackend,
  hasFreshPendingIntegrationSource,
  hasFreshPendingSource,
  integrationImportStatus,
  isProfileComplete,
  isStepReachable,
  jobErrorPresentation,
  jobsForSource,
  parseStepParam,
  resolveStep,
  shouldAutoTriggerNormalize,
  shouldPollState,
  sourceDisplayName,
  sourceKind,
  stepCompletion,
  tableDisplayName
} from './wizardState';

const NOW = new Date('2026-07-24T12:00:00Z');

const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60 * 1000).toISOString();

const makeSource = (over: Partial<OnboardingSource> = {}): OnboardingSource => ({
  id: 'src-1',
  kind: 'upload',
  status: 'pending',
  config: { filename: 'sales.csv' },
  created_at: minutesAgo(1),
  updated_at: minutesAgo(1),
  ...over
});

const makeJob = (phase: IngestPhase, over: Partial<IngestionJob> = {}): IngestionJob => ({
  id: `job-${phase}`,
  source: 'src-1',
  phase,
  bq_load_job_id: '',
  dataform_run_id: '',
  stats: {},
  error: null,
  created_at: minutesAgo(2),
  updated_at: minutesAgo(1),
  ...over
});

const makeState = (jobs: IngestionJob[] = [], sources: OnboardingSource[] = []): OnboardingState => ({
  sources,
  jobs,
  phases: { landed: 0, ingesting: 0, await_map: 0, mapping_confirmed: 0, normalizing: 0, done: 0, failed: 0 }
});

// Integration source (square by default) with an export fresh 1 minute ago.
const makeIntegrationSource = (over: Partial<OnboardingSource> = {}, lastExport?: Partial<SourceLastExport> | null): OnboardingSource => ({
  id: 'src-int-1',
  kind: 'square',
  status: 'pending',
  config: {
    entity: 'product',
    ...(lastExport === null ? {} : { last_export: { state: 'succeeded', at: minutesAgo(1), ...lastExport } as SourceLastExport })
  },
  created_at: minutesAgo(1),
  updated_at: minutesAgo(1),
  ...over
});

const completeProfile = { industry: 'Retail', address_line1: '1 Main St' } as CompanyBusinessInfo;
const emptyProfile = { industry: null, address_line1: null } as CompanyBusinessInfo;

describe('parseStepParam', () => {
  it('accepts 1 through 6', () => {
    for (const value of ['1', '2', '3', '4', '5', '6']) {
      expect(parseStepParam(value)).toBe(Number(value));
    }
  });

  it('rejects null and junk', () => {
    for (const value of [null, '', '0', '7', '3.5', 'abc']) {
      expect(parseStepParam(value)).toBeNull();
    }
  });
});

describe('isProfileComplete', () => {
  it('requires both industry and address_line1', () => {
    expect(isProfileComplete(undefined)).toBe(false);
    expect(isProfileComplete({ industry: 'Retail', address_line1: null } as CompanyBusinessInfo)).toBe(false);
    expect(isProfileComplete({ industry: null, address_line1: '1 Main St' } as CompanyBusinessInfo)).toBe(false);
    expect(isProfileComplete(completeProfile)).toBe(true);
  });
});

describe('hasFreshPendingSource', () => {
  it('true for a pending jobless upload source aged 1 minute', () => {
    expect(hasFreshPendingSource(makeState([], [makeSource()]), NOW)).toBe(true);
  });

  it('false when the source is 20 minutes old', () => {
    expect(hasFreshPendingSource(makeState([], [makeSource({ created_at: minutesAgo(20) })]), NOW)).toBe(false);
  });

  it('false once a job references the source', () => {
    expect(hasFreshPendingSource(makeState([makeJob('landed')], [makeSource()]), NOW)).toBe(false);
  });

  it('false for non-pending status and non-upload kind', () => {
    expect(hasFreshPendingSource(makeState([], [makeSource({ status: 'active' })]), NOW)).toBe(false);
    expect(hasFreshPendingSource(makeState([], [makeSource({ kind: 'square' })]), NOW)).toBe(false);
  });
});

describe('hasFreshPendingIntegrationSource', () => {
  it('true for a pending jobless integration source with a fresh export', () => {
    expect(hasFreshPendingIntegrationSource(makeState([], [makeIntegrationSource()]), NOW)).toBe(true);
  });

  it('true while the export is still running (claimed_at anchor)', () => {
    const source = makeIntegrationSource({}, { state: 'running', at: undefined, claimed_at: minutesAgo(1) });
    expect(hasFreshPendingIntegrationSource(makeState([], [source]), NOW)).toBe(true);
  });

  it('true with no last_export at all (falls back to created_at)', () => {
    expect(hasFreshPendingIntegrationSource(makeState([], [makeIntegrationSource({}, null)]), NOW)).toBe(true);
  });

  it('false for a failed export, a stale export, and non-pending status', () => {
    expect(hasFreshPendingIntegrationSource(makeState([], [makeIntegrationSource({}, { state: 'failed' })]), NOW)).toBe(false);
    expect(hasFreshPendingIntegrationSource(makeState([], [makeIntegrationSource({}, { at: minutesAgo(20) })]), NOW)).toBe(false);
    expect(hasFreshPendingIntegrationSource(makeState([], [makeIntegrationSource({ status: 'error' })]), NOW)).toBe(false);
    expect(hasFreshPendingIntegrationSource(makeState([], [makeIntegrationSource({ status: 'active' })]), NOW)).toBe(false);
  });

  it('false once a job references the source, and for upload sources', () => {
    const state = makeState([makeJob('landed', { source: 'src-int-1' })], [makeIntegrationSource()]);
    expect(hasFreshPendingIntegrationSource(state, NOW)).toBe(false);
    expect(hasFreshPendingIntegrationSource(makeState([], [makeSource()]), NOW)).toBe(false);
  });
});

describe('deriveStepFromBackend', () => {
  it('rule 0: undefined state → 1', () => {
    expect(deriveStepFromBackend(undefined, completeProfile, NOW)).toBe(1);
  });

  it('empty state with no/incomplete profile → 1', () => {
    expect(deriveStepFromBackend(makeState(), undefined, NOW)).toBe(1);
    expect(deriveStepFromBackend(makeState(), emptyProfile, NOW)).toBe(1);
  });

  it('empty state with complete profile → 2', () => {
    expect(deriveStepFromBackend(makeState(), completeProfile, NOW)).toBe(2);
  });

  it('stale jobless source → 3; fresh pending source → 3', () => {
    expect(deriveStepFromBackend(makeState([], [makeSource({ created_at: minutesAgo(60) })]), completeProfile, NOW)).toBe(3);
    expect(deriveStepFromBackend(makeState([], [makeSource()]), completeProfile, NOW)).toBe(3);
  });

  it('each active phase → 5', () => {
    for (const phase of ['landed', 'ingesting', 'mapping_confirmed', 'normalizing'] as IngestPhase[]) {
      expect(deriveStepFromBackend(makeState([makeJob(phase)]), completeProfile, NOW)).toBe(5);
    }
  });

  it('failed only → 5; await_map only → 4; done only → 6', () => {
    expect(deriveStepFromBackend(makeState([makeJob('failed')]), completeProfile, NOW)).toBe(5);
    expect(deriveStepFromBackend(makeState([makeJob('await_map')]), completeProfile, NOW)).toBe(4);
    expect(deriveStepFromBackend(makeState([makeJob('done')]), completeProfile, NOW)).toBe(6);
  });

  it('precedence: await_map beats normalizing, failed, and done', () => {
    const jobs = [makeJob('normalizing'), makeJob('failed'), makeJob('done'), makeJob('await_map')];
    expect(deriveStepFromBackend(makeState(jobs), completeProfile, NOW)).toBe(4);
  });

  it('precedence: active beats failed', () => {
    expect(deriveStepFromBackend(makeState([makeJob('failed'), makeJob('ingesting')]), completeProfile, NOW)).toBe(5);
  });

  it('precedence: fresh pending source beats done', () => {
    const state = makeState([makeJob('done', { source: 'src-old' })], [makeSource()]);
    expect(deriveStepFromBackend(state, completeProfile, NOW)).toBe(3);
  });

  it('precedence: done beats a stale jobless source', () => {
    const state = makeState([makeJob('done', { source: 'src-old' })], [makeSource({ created_at: minutesAgo(60) })]);
    expect(deriveStepFromBackend(state, completeProfile, NOW)).toBe(6);
  });

  it('rule 4.5: fresh pending integration source → 2', () => {
    expect(deriveStepFromBackend(makeState([], [makeIntegrationSource()]), completeProfile, NOW)).toBe(2);
  });

  it('rule 4.5 precedence: beats done, loses to a fresh pending upload source', () => {
    const beatsDone = makeState([makeJob('done', { source: 'src-old' })], [makeIntegrationSource()]);
    expect(deriveStepFromBackend(beatsDone, completeProfile, NOW)).toBe(2);
    const uploadWins = makeState([], [makeIntegrationSource(), makeSource()]);
    expect(deriveStepFromBackend(uploadWins, completeProfile, NOW)).toBe(3);
  });

  it('rule 4.5 precedence: await_map, active, and failed jobs all beat it', () => {
    for (const [phase, step] of [
      ['await_map', 4],
      ['normalizing', 5],
      ['failed', 5]
    ] as Array<[IngestPhase, number]>) {
      const state = makeState([makeJob(phase, { source: 'src-old' })], [makeIntegrationSource()]);
      expect(deriveStepFromBackend(state, completeProfile, NOW)).toBe(step);
    }
  });

  it('stale jobless integration source falls through to rule 6 → 3', () => {
    const state = makeState([], [makeIntegrationSource({ status: 'error' }, { state: 'failed', at: minutesAgo(1) })]);
    expect(deriveStepFromBackend(state, completeProfile, NOW)).toBe(3);
  });
});

describe('isStepReachable', () => {
  it('steps 1-3 are always reachable, even with undefined state', () => {
    for (const step of [1, 2, 3] as const) {
      expect(isStepReachable(step, undefined)).toBe(true);
      expect(isStepReachable(step, makeState())).toBe(true);
    }
  });

  it('step 4 requires a proposal-bearing phase', () => {
    expect(isStepReachable(4, makeState([makeJob('landed')]))).toBe(false);
    for (const phase of ['await_map', 'mapping_confirmed', 'normalizing', 'done'] as IngestPhase[]) {
      expect(isStepReachable(4, makeState([makeJob(phase)]))).toBe(true);
    }
  });

  it('step 5 requires any job; step 6 requires a done job', () => {
    expect(isStepReachable(5, makeState())).toBe(false);
    expect(isStepReachable(5, makeState([makeJob('landed')]))).toBe(true);
    expect(isStepReachable(6, makeState([makeJob('normalizing')]))).toBe(false);
    expect(isStepReachable(6, makeState([makeJob('done')]))).toBe(true);
  });
});

describe('resolveStep', () => {
  it('null param → derived', () => {
    expect(resolveStep(null, makeState(), completeProfile, NOW)).toBe(2);
  });

  it('reachable explicit param is respected', () => {
    expect(resolveStep('2', makeState([makeJob('await_map')]), completeProfile, NOW)).toBe(2);
  });

  it('unreachable param falls back to derived', () => {
    expect(resolveStep('6', makeState([makeJob('await_map')]), completeProfile, NOW)).toBe(4);
  });
});

describe('stepCompletion', () => {
  it('fresh tenant: nothing complete', () => {
    expect(stepCompletion(makeState(), emptyProfile, false)).toEqual({
      1: false,
      2: false,
      3: false,
      4: false,
      5: false,
      6: false
    });
  });

  it('mid-pipeline: uploads exist, mapping pending', () => {
    const state = makeState([makeJob('await_map'), makeJob('normalizing')]);
    expect(stepCompletion(state, completeProfile, true)).toEqual({
      1: true,
      2: true,
      3: true,
      4: false, // an await_map job blocks step-4 completion
      5: false,
      6: false
    });
  });

  it('all done', () => {
    expect(stepCompletion(makeState([makeJob('done')]), completeProfile, false)).toEqual({
      1: true,
      2: false,
      3: true,
      4: true,
      5: true,
      6: true
    });
  });

  it('step 2 completes via an integration-backed job even when statuses read disconnected', () => {
    const state = makeState([makeJob('done', { source: 'src-int-1' })], [makeIntegrationSource({ status: 'active' })]);
    expect(stepCompletion(state, completeProfile, false)[2]).toBe(true);
    // Upload-backed jobs (or jobs whose source is unknown) do not count.
    expect(stepCompletion(makeState([makeJob('done')], [makeSource()]), completeProfile, false)[2]).toBe(false);
  });
});

describe('shouldPollState', () => {
  it('true for each active phase and for a fresh pending source', () => {
    for (const phase of ['landed', 'ingesting', 'mapping_confirmed', 'normalizing'] as IngestPhase[]) {
      expect(shouldPollState(makeState([makeJob(phase)]), NOW)).toBe(true);
    }
    expect(shouldPollState(makeState([], [makeSource()]), NOW)).toBe(true);
  });

  it('true for a fresh pending integration source; false once it fails', () => {
    expect(shouldPollState(makeState([], [makeIntegrationSource()]), NOW)).toBe(true);
    expect(shouldPollState(makeState([], [makeIntegrationSource({ status: 'error' }, { state: 'failed' })]), NOW)).toBe(false);
  });

  it('false for await_map-only, failed-only, done-only, and empty', () => {
    expect(shouldPollState(makeState([makeJob('await_map')]), NOW)).toBe(false);
    expect(shouldPollState(makeState([makeJob('failed')]), NOW)).toBe(false);
    expect(shouldPollState(makeState([makeJob('done')]), NOW)).toBe(false);
    expect(shouldPollState(makeState(), NOW)).toBe(false);
    expect(shouldPollState(undefined, NOW)).toBe(false);
  });
});

describe('joins', () => {
  it('jobsForSource filters by source id', () => {
    const state = makeState([makeJob('landed'), makeJob('done', { id: 'job-x', source: 'src-2' })]);
    expect(jobsForSource(state, 'src-2').map((j) => j.id)).toEqual(['job-x']);
    expect(jobsForSource(state, 'src-none')).toEqual([]);
  });

  it('sourceKind joins the id to a kind and returns null for unknown ids', () => {
    const state = makeState([], [makeSource(), makeIntegrationSource()]);
    expect(sourceKind(state, 'src-1')).toBe('upload');
    expect(sourceKind(state, 'src-int-1')).toBe('square');
    expect(sourceKind(state, 'src-none')).toBeNull();
  });

  it('sourceDisplayName uses config.filename for uploads and falls back to a short id', () => {
    const state = makeState([], [makeSource({ id: 'abcdef12-3456-7890-abcd-ef1234567890' })]);
    expect(sourceDisplayName(state, 'abcdef12-3456-7890-abcd-ef1234567890')).toBe('sales.csv');
    expect(sourceDisplayName(state, 'ffffffff-0000-0000-0000-000000000000')).toBe('Upload ffffffff');
  });

  it('sourceDisplayName renders "<Kind> — <entity>" for integration sources', () => {
    const state = makeState(
      [],
      [
        makeIntegrationSource(),
        makeIntegrationSource({ id: 'src-int-2', kind: 'quickbooks', config: { entity: 'customer' } }),
        makeIntegrationSource({ id: 'src-int-3', kind: 'stripe', config: {} })
      ]
    );
    expect(sourceDisplayName(state, 'src-int-1')).toBe('Square — product');
    expect(sourceDisplayName(state, 'src-int-2')).toBe('QuickBooks — customer');
    // No entity recorded → bare kind label.
    expect(sourceDisplayName(state, 'src-int-3')).toBe('Stripe');
  });

  it('sourceDisplayName uses the picked file name for Drive sources', () => {
    const state = makeState(
      [],
      [
        makeIntegrationSource({ id: 'src-drive', kind: 'google_drive', config: { file_id: 'f1', name: 'Q3 inventory.xlsx' } }),
        makeIntegrationSource({ id: 'src-drive-2', kind: 'google_drive', config: { file_id: 'f2' } })
      ]
    );
    expect(sourceDisplayName(state, 'src-drive')).toBe('Q3 inventory.xlsx');
    expect(sourceDisplayName(state, 'src-drive-2')).toBe('Google Drive');
  });

  it('tableDisplayName appends the sheet name when the ingest stats carry one', () => {
    const state = makeState([], [makeSource()]);
    const job = makeJob('await_map', {
      stats: {
        tables: [
          { bq_table_id: 'p.d.t1', sheet: 'Sheet2' },
          { bq_table_id: 'p.d.t2', sheet: null }
        ]
      }
    });
    expect(tableDisplayName(state, job, { bq_table_id: 'p.d.t1' })).toBe('sales.csv — Sheet2');
    expect(tableDisplayName(state, job, { bq_table_id: 'p.d.t2' })).toBe('sales.csv');
    expect(tableDisplayName(state, job, { bq_table_id: 'p.d.other' })).toBe('sales.csv');
  });
});

describe('canRetryNormalize', () => {
  it('mirrors the backend precondition', () => {
    expect(canRetryNormalize({ phase: 'mapping_confirmed', error: null })).toBe(true);
    expect(canRetryNormalize({ phase: 'failed', error: { kind: 'dataform', message: 'x' } })).toBe(true);
    expect(canRetryNormalize({ phase: 'failed', error: { kind: 'load', message: 'x' } })).toBe(false);
    expect(canRetryNormalize({ phase: 'normalizing', error: null })).toBe(false);
    expect(canRetryNormalize({ phase: 'done', error: null })).toBe(false);
  });
});

describe('jobErrorPresentation', () => {
  it('maps every kind to the expected title and action', () => {
    const expectations: Array<[string, string, string | null]> = [
      ['auth', 'Connection expired', 'reupload'],
      ['validation', 'File rejected', 'reupload'],
      ['convert', "Couldn't read this file", 'reupload'],
      ['load', 'Load failed', 'reupload'],
      ['dataform', 'Normalization failed', 'retry-normalize'],
      ['assertion', 'Data-quality checks failed', 'support'],
      ['internal', 'Something went wrong', 'support']
    ];
    for (const [kind, title, action] of expectations) {
      const presentation = jobErrorPresentation({ kind: kind as never, message: 'server says hi' });
      expect(presentation?.title).toBe(title);
      expect(presentation?.action).toBe(action);
    }
  });

  it('null error → null; unknown kind → internal fallback', () => {
    expect(jobErrorPresentation(null)).toBeNull();
    const unknown = jobErrorPresentation({ kind: 'weird' as never, message: 'x' });
    expect(unknown?.title).toBe('Something went wrong');
    expect(unknown?.action).toBe('support');
  });

  it('validation and dataform include the server message', () => {
    expect(jobErrorPresentation({ kind: 'validation', message: 'Bad extension.' })?.description).toContain('Bad extension.');
    expect(jobErrorPresentation({ kind: 'dataform', message: 'Run failed.' })?.description).toContain('Run failed.');
  });
});

describe('integrationImportStatus', () => {
  it('null status when the kind has no sources (other kinds do not leak in)', () => {
    const state = makeState([], [makeSource(), makeIntegrationSource()]);
    const rollup = integrationImportStatus(state, 'quickbooks');
    expect(rollup).toEqual({ status: null, total: 0, importing: 0, attention: 0, imported: 0, failed: 0, message: null });
  });

  it('importing: fresh export with no job yet, running export, and active job phases', () => {
    expect(integrationImportStatus(makeState([], [makeIntegrationSource()]), 'square').status).toBe('importing');
    const running = makeIntegrationSource({}, { state: 'running', at: undefined, claimed_at: minutesAgo(1) });
    expect(integrationImportStatus(makeState([], [running]), 'square').status).toBe('importing');
    for (const phase of ['landed', 'ingesting', 'mapping_confirmed', 'normalizing'] as IngestPhase[]) {
      const state = makeState([makeJob(phase, { source: 'src-int-1', created_at: minutesAgo(0) })], [makeIntegrationSource()]);
      expect(integrationImportStatus(state, 'square').status).toBe('importing');
    }
  });

  it('attention for await_map, imported for done', () => {
    const attention = makeState([makeJob('await_map', { source: 'src-int-1', created_at: minutesAgo(0) })], [makeIntegrationSource()]);
    expect(integrationImportStatus(attention, 'square').status).toBe('attention');
    const imported = makeState([makeJob('done', { source: 'src-int-1', created_at: minutesAgo(0) })], [makeIntegrationSource()]);
    expect(integrationImportStatus(imported, 'square').status).toBe('imported');
  });

  it('failed: pre-job export failure carries last_export.message; job failure carries error.message', () => {
    const exportFailed = makeState([], [makeIntegrationSource({ status: 'error' }, { state: 'failed', message: 'Square token expired' })]);
    expect(integrationImportStatus(exportFailed, 'square')).toMatchObject({ status: 'failed', failed: 1, message: 'Square token expired' });

    const jobFailed = makeState(
      [makeJob('failed', { source: 'src-int-1', created_at: minutesAgo(0), error: { kind: 'load', message: 'BQ load error' } })],
      [makeIntegrationSource({ status: 'active' })]
    );
    expect(integrationImportStatus(jobFailed, 'square')).toMatchObject({ status: 'failed', message: 'BQ load error' });
  });

  it('a re-export newer than the newest job flips a done source back to importing', () => {
    const source = makeIntegrationSource({ status: 'active' }, { state: 'succeeded', at: minutesAgo(1) });
    const state = makeState([makeJob('done', { source: 'src-int-1', created_at: minutesAgo(10) })], [source]);
    expect(integrationImportStatus(state, 'square').status).toBe('importing');
  });

  it('rollup precedence and counts across a 4-source kind: importing > failed > attention > imported', () => {
    const sources = [
      makeIntegrationSource({ id: 's-a', status: 'active', config: { entity: 'product' } }), // done job
      makeIntegrationSource({ id: 's-b', status: 'active', config: { entity: 'customer' } }), // await_map job
      makeIntegrationSource({
        id: 's-c',
        status: 'error',
        config: { entity: 'vendor', last_export: { state: 'failed', at: minutesAgo(1), message: 'boom' } }
      }),
      makeIntegrationSource({ id: 's-d', config: { entity: 'sale', last_export: { state: 'succeeded', at: minutesAgo(1) } } }) // no job yet
    ];
    const jobs = [
      makeJob('done', { id: 'j-a', source: 's-a', created_at: minutesAgo(0) }),
      makeJob('await_map', { id: 'j-b', source: 's-b', created_at: minutesAgo(0) })
    ];
    const withImporting = integrationImportStatus(makeState(jobs, sources), 'square');
    expect(withImporting).toMatchObject({
      status: 'importing',
      total: 4,
      importing: 1,
      attention: 1,
      imported: 1,
      failed: 1,
      message: 'boom'
    });

    // Drop the in-flight source: failed outranks attention and imported.
    const settled = integrationImportStatus(makeState(jobs, sources.slice(0, 3)), 'square');
    expect(settled.status).toBe('failed');
    // Drop the failed source too: attention outranks imported.
    const reviewable = integrationImportStatus(makeState(jobs, sources.slice(0, 2)), 'square');
    expect(reviewable.status).toBe('attention');
  });
});

describe('shouldAutoTriggerNormalize', () => {
  const confirmed = (over: Partial<IngestionJob> = {}) => makeJob('mapping_confirmed', over);

  it('fires only for integration jobs at mapping_confirmed with no dataform run', () => {
    expect(shouldAutoTriggerNormalize(confirmed(), 'square')).toBe(true);
    expect(shouldAutoTriggerNormalize(confirmed(), 'quickbooks')).toBe(true);
    expect(shouldAutoTriggerNormalize(confirmed(), 'stripe')).toBe(true);
    expect(shouldAutoTriggerNormalize(confirmed(), 'google_drive')).toBe(true);
  });

  it('never fires for uploads or unknown sources', () => {
    expect(shouldAutoTriggerNormalize(confirmed(), 'upload')).toBe(false);
    expect(shouldAutoTriggerNormalize(confirmed(), null)).toBe(false);
  });

  it('never fires once a dataform run id exists or outside mapping_confirmed', () => {
    expect(shouldAutoTriggerNormalize(confirmed({ dataform_run_id: 'run-1' }), 'square')).toBe(false);
    for (const phase of ['landed', 'ingesting', 'await_map', 'normalizing', 'done', 'failed'] as IngestPhase[]) {
      expect(shouldAutoTriggerNormalize(makeJob(phase), 'square')).toBe(false);
    }
  });

  it("respects the server's 120s 'triggering' claim; trigger_failed may re-fire on a fresh mount", () => {
    expect(shouldAutoTriggerNormalize(confirmed({ stats: { normalize: { state: 'triggering' } } }), 'square')).toBe(false);
    expect(shouldAutoTriggerNormalize(confirmed({ stats: { normalize: { state: 'trigger_failed' } } }), 'square')).toBe(true);
  });
});

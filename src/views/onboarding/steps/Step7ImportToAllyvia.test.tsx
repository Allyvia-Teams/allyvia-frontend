import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { CommitStateName, OnboardingState } from 'api/onboarding.api';
import type { ReconciliationReport } from 'api/posIntegrations.api';

const approveMutate = vi.fn();
const panelState: { runStatus: string; report: Partial<ReconciliationReport> } = { runStatus: 'awaiting_approval', report: {} };

// Importing anything under api/ pulls utils/axios, whose mock layer touches
// sessionStorage at import time — absent in this environment.
vi.mock('utils/axios', () => ({ default: {} }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('views/pos-integrations/hooks/usePosIntegrations', () => ({
  useRunPolling: () => ({ data: { status: panelState.runStatus, error: {} } }),
  useReport: () => ({ data: panelState.report, isLoading: false }),
  useApproveRun: () => ({ mutate: approveMutate, isPending: false }),
  useResolveDuplicates: () => ({ mutate: vi.fn(), isPending: false }),
  useSkipInvalid: () => ({ mutate: vi.fn(), isPending: false })
}));

// Imported after the mocks so the panel picks them up.
const { default: Step7ImportToAllyvia } = await import('./Step7ImportToAllyvia');

const report = (over: Partial<ReconciliationReport> = {}): Partial<ReconciliationReport> => ({
  totals: [
    {
      entity: 'customer',
      source: 3,
      source_derived: false,
      staged: 3,
      valid: 3,
      invalid: 0,
      skipped: 0,
      committed: 0,
      status: 'ok',
      note: ''
    }
  ],
  gross_sales: [],
  monthly_sales: [],
  inventory: [],
  issues: [],
  duplicates: [],
  sample_audit: {},
  notes: [],
  blocker_count: 0,
  warning_count: 0,
  can_approve: true,
  ...over
});

const state = (name: CommitStateName, run: Record<string, unknown> | null): OnboardingState => ({
  sources: [],
  jobs: [
    {
      id: 'j1',
      source: 's1',
      phase: 'done',
      bq_load_job_id: '',
      dataform_run_id: '',
      stats: {},
      error: null,
      created_at: '2026-09-22T10:00:00Z',
      updated_at: '2026-09-22T10:05:00Z'
    }
  ] as OnboardingState['jobs'],
  phases: { landed: 0, ingesting: 0, await_map: 0, mapping_confirmed: 0, normalizing: 0, done: 1, failed: 0 },
  commit: {
    state: name,
    connection_id: 'c1',
    normalized_at: '2026-09-22T10:05:00Z',
    run: run as NonNullable<OnboardingState['commit']>['run']
  }
});

const render = (s: OnboardingState) => renderToStaticMarkup(<Step7ImportToAllyvia state={s} goToStep={vi.fn()} />);

describe('Step 7 — Import to Allyvia', () => {
  it('ANALYZED: says the data is not in Allyvia yet and shows no import button', () => {
    const html = render(state('analyzed', null));
    expect(html).toContain('data-import-stage="Analyzed"');
    expect(html).toContain('Analyzed — not in Allyvia yet');
    expect(html).toContain('Preparing your import summary');
    expect(html).not.toContain('Put this data into Allyvia');
  });

  it('READY TO IMPORT: shows the shared report and ONE primary action', () => {
    panelState.runStatus = 'awaiting_approval';
    panelState.report = report();
    const html = render(state('ready_to_import', { id: 'r1', status: 'awaiting_approval', can_approve: true }));
    expect(html).toContain('data-import-stage="Ready to import"');
    expect(html).toContain('Ready to import — nothing added yet');
    expect(html).toContain('Put this data into Allyvia');
    expect(html.match(/Put this data into Allyvia/g)?.length).toBe(1);
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*>Put this data into Allyvia/);
  });

  it('READY TO IMPORT with a blocker: the button is disabled, not just coloured', () => {
    panelState.runStatus = 'awaiting_approval';
    panelState.report = report({ can_approve: false, blocker_count: 1 });
    const html = render(state('ready_to_import', { id: 'r1', status: 'awaiting_approval', can_approve: false, blocker_count: 1 }));
    expect(html).toContain('Almost ready — a few things to sort out first');
    expect(html).toContain('1 thing to sort out first');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Put this data into Allyvia/);
  });

  it('IMPORTED: the only state that says the data is in Allyvia', () => {
    panelState.runStatus = 'completed';
    panelState.report = report({ post_commit: { checked_at: '', rows: [], ok: true, mismatched_entities: 0 } });
    const html = render(state('imported', { id: 'r1', status: 'completed' }));
    expect(html).toContain('data-import-stage="Imported"');
    expect(html).toContain('Imported — your data is in Allyvia');
    expect(html).not.toContain('Put this data into Allyvia');
    expect(html).toContain('Upload more data');
  });
});

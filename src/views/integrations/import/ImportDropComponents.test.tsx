// Static renders of the Import data table and blocker list (no DOM here; the
// repo's precedent is renderToStaticMarkup — see ReportTables.test.tsx).

import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { BulkDrop, DropFile } from 'api/importDrops.api';
import type { ReconciliationReport } from 'api/posIntegrations.api';

import BlockerList from './BlockerList';
import ClassificationTable from './ClassificationTable';
import { InnerCircleSummary } from './DropReportPanel';
import EntityQuestions from './EntityQuestions';
import HowImportsWork from './HowImportsWork';

// DropReportPanel reaches api/posIntegrations.api, which imports utils/axios.
vi.mock('utils/axios', () => ({ default: {} }));

function file(overrides: Partial<DropFile>): DropFile {
  return {
    id: 'f',
    name: 'orders.csv',
    member: '',
    size: 1,
    lane: 'integrations',
    entity: 'order',
    confidence: 0.9,
    reason: 'order rows, recognised from its column names',
    ambiguous_dates: false,
    overridden: false,
    status: 'staged',
    onboarding: null,
    entity_choices: [],
    needs_date_order: false,
    ...overrides
  };
}

function drop(overrides: Partial<BulkDrop>): BulkDrop {
  return {
    id: 'd',
    status: 'awaiting_approval',
    created_at: '2026-09-30T12:00:00Z',
    created_by_email: '',
    default_location_id: null,
    timezone: '',
    connection_id: 'c',
    run_id: 'r',
    waiting: '',
    lanes: { integrations: 1, onboarding: 1 },
    lane_state: { direct: 'ready', onboarding: 'none', onboarding_reason: '' },
    can_approve: true,
    files: [],
    report: { direct: null, onboarding: null, also_in_onboarding_run: [] },
    held_locations: [],
    onboarding_available: true,
    ...overrides
  };
}

describe('ClassificationTable', () => {
  it('shows every file with its lane, what it holds and the sentence that says why', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ClassificationTable
          drop={drop({
            files: [
              file({ id: '1', name: 'till-1.csv' }),
              file({
                id: '2',
                name: 'vendors.csv',
                lane: 'onboarding',
                entity: 'vendor',
                status: 'sent',
                reason: 'reads as a vendor list, which imports through the onboarding lane',
                onboarding: { source_id: 'src-9', job_id: 'j', phase: 'await_map', needs_mapping: true }
              })
            ]
          })}
        />
      </MemoryRouter>
    );
    expect(html).toContain('till-1.csv');
    expect(html).toContain('Direct import');
    expect(html).toContain('Orders');
    expect(html).toContain('reads as a vendor list, which imports through the onboarding lane');
    // The file that needs mapping links to ITS OWN mapping tab.
    expect(html).toContain('href="/settings?tab=onboarding&amp;step=4&amp;source=src-9"');
    expect(html).toContain('Needs mapping');
  });
});

describe('BlockerList', () => {
  it('renders the server-derived sentences, and nothing when approvable', () => {
    const blocked = renderToStaticMarkup(
      <BlockerList
        drop={drop({
          can_approve: false,
          lane_state: { direct: 'ready', onboarding: 'waiting', onboarding_reason: 'the onboarding lane is still reading these files' }
        })}
      />
    );
    expect(blocked).toContain('Not ready to approve yet');
    expect(blocked).toContain('the onboarding lane is still reading these files');
    expect(renderToStaticMarkup(<BlockerList drop={drop({})} />)).toBe('');
  });
});

describe('EntityQuestions', () => {
  const waiting = (overrides: Partial<DropFile> = {}) =>
    drop({
      can_approve: false,
      files: [
        file({
          id: 'q',
          name: 'export.csv',
          entity: '',
          status: 'needs_entity',
          reason: 'could be sales history or products',
          entity_choices: [
            { entity: 'order', label: 'Sales history' },
            { entity: 'product', label: 'Products' }
          ],
          ...overrides
        })
      ]
    });

  it('shows the reason, the choices, Leave this file out, and that the drop waits', () => {
    const html = renderToStaticMarkup(<EntityQuestions drop={waiting()} onAnswer={() => undefined} />);
    expect(html).toContain('export.csv');
    expect(html).toContain('could be sales history or products');
    expect(html).toContain('Sales history');
    expect(html).toContain('Products');
    expect(html).toContain('Leave this file out');
    expect(html).toContain('This import waits until you answer');
    expect(html).not.toContain('Month first');
  });

  it('adds the date order question when the dates read either way', () => {
    const html = renderToStaticMarkup(<EntityQuestions drop={waiting({ needs_date_order: true })} onAnswer={() => undefined} />);
    expect(html).toContain('Month first (03/04 is March 4)');
    expect(html).toContain('Day first (03/04 is 3 April)');
  });

  it('renders nothing when no file needs an answer', () => {
    expect(renderToStaticMarkup(<EntityQuestions drop={drop({ files: [file({})] })} />)).toBe('');
  });
});

describe('HowImportsWork', () => {
  it('links the three templates from the API base, and says stock is never added twice', () => {
    const html = renderToStaticMarkup(<HowImportsWork apiBase="https://api.example.test/api/v1/" />);
    expect(html).toContain('href="https://api.example.test/api/v1/integrations/templates/products.csv"');
    expect(html).toContain('href="https://api.example.test/api/v1/integrations/templates/customers.csv"');
    expect(html).toContain('href="https://api.example.test/api/v1/integrations/templates/orders.csv"');
    expect(html).toContain('Sales history</a>');
    expect(html).toContain('never adds stock twice');
  });
});

describe('InnerCircleSummary', () => {
  it('renders what Inner Circle did, and nothing when it did not run', () => {
    const report = {
      inner_circle: { contacts_updated: 4, duplicates_merged: 2, ladder_created: true, enrolled: 3, skipped: 0 }
    } as unknown as ReconciliationReport;
    const html = renderToStaticMarkup(<InnerCircleSummary report={report} />);
    expect(html).toContain('4 customers updated.');
    expect(html).toContain('2 duplicates merged.');
    expect(html).toContain('A default ladder was created');
    expect(html).toContain('3 members enrolled.');
    expect(renderToStaticMarkup(<InnerCircleSummary report={{} as ReconciliationReport} />)).toBe('');
  });
});

describe('ClassificationTable with onboarding switched off', () => {
  it('shows the status without a mapping link', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ClassificationTable
          drop={drop({
            onboarding_available: false,
            files: [
              file({
                id: '2',
                lane: 'onboarding',
                status: 'sent',
                onboarding: { source_id: 'src-9', job_id: 'j', phase: 'await_map', needs_mapping: true }
              })
            ]
          })}
        />
      </MemoryRouter>
    );
    expect(html).toContain('Needs mapping');
    expect(html).not.toContain('tab=onboarding');
  });
});

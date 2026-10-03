// Static renders of the Import data table and blocker list (no DOM here; the
// repo's precedent is renderToStaticMarkup — see ReportTables.test.tsx).

import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { BulkDrop, DropFile } from 'api/importDrops.api';

import BlockerList from './BlockerList';
import ClassificationTable from './ClassificationTable';

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

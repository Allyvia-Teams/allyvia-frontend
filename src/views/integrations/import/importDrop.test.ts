import { describe, expect, it } from 'vitest';

import type { BulkDrop, DropFile } from 'api/importDrops.api';

import {
  blockersFor,
  canApprove,
  canRetry,
  dropStatusLabel,
  entityAnswer,
  entityQuestions,
  formatDropSize,
  headlineCounts,
  innerCircleView,
  laneCounts,
  LEAVE_OUT_VALUE,
  mappingLink,
  onboardingLaneNote,
  pollDelay,
  reclassifyOptions,
  rowsFor,
  statusSentence,
  templateUrl
} from './importDrop';

function file(overrides: Partial<DropFile> = {}): DropFile {
  return {
    id: 'f1',
    name: 'orders.csv',
    member: '',
    size: 100,
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

function drop(overrides: Partial<BulkDrop> = {}): BulkDrop {
  return {
    id: 'd1',
    status: 'awaiting_approval',
    created_at: '2026-09-30T12:00:00Z',
    created_by_email: 'owner@example.test',
    default_location_id: null,
    timezone: '',
    connection_id: 'c1',
    run_id: 'r1',
    waiting: '',
    lanes: { integrations: 1, onboarding: 0 },
    lane_state: { direct: 'ready', onboarding: 'none', onboarding_reason: '' },
    can_approve: true,
    files: [file()],
    report: { direct: null, onboarding: null, also_in_onboarding_run: [] },
    held_locations: [],
    onboarding_available: true,
    ...overrides
  };
}

describe('rowsFor', () => {
  it('orders direct files, then onboarding, then refused, each by name', () => {
    const rows = rowsFor(
      drop({
        files: [
          file({ id: 'a', name: 'zeta.csv', lane: 'onboarding', status: 'parked', entity: 'vendor' }),
          file({ id: 'b', name: 'notes.txt', lane: 'onboarding', status: 'refused', entity: '' }),
          file({ id: 'c', name: 'b-orders.csv' }),
          file({ id: 'd', name: 'a-orders.csv' })
        ]
      })
    );
    expect(rows.map((r) => r.id)).toEqual(['d', 'c', 'a', 'b']);
  });

  it('names a zip member or sheet rather than the archive', () => {
    const [row] = rowsFor(drop({ files: [file({ name: 'export.zip', member: 'tills/till-1.csv' })] }));
    expect(row.displayName).toBe('tills/till-1.csv');
    expect(row.containerName).toBe('export.zip');
  });

  it('labels lanes, entities and statuses in plain words', () => {
    const [direct, sent, refused] = rowsFor(
      drop({
        files: [
          file({ id: '1', name: 'a.csv', entity: 'inventory_level', status: 'committed' }),
          file({
            id: '2',
            name: 'b.csv',
            lane: 'onboarding',
            entity: 'expense',
            status: 'sent',
            onboarding: { source_id: 's1', job_id: 'j1', phase: 'await_map', needs_mapping: true }
          }),
          file({ id: '3', name: 'c.txt', lane: 'onboarding', entity: '', status: 'refused' })
        ]
      })
    );
    expect([direct.laneLabel, direct.entityLabel, direct.statusLabel]).toEqual(['Direct import', 'Stock levels', 'Imported']);
    expect([sent.laneLabel, sent.entityLabel, sent.statusLabel]).toEqual(['Onboarding', 'Expenses', 'Needs mapping']);
    expect([refused.tone, refused.entityLabel, refused.statusLabel]).toEqual(['refused', '—', 'Refused']);
  });

  it('links a file that needs mapping to its own mapping step, and no other', () => {
    const rows = rowsFor(
      drop({
        files: [
          file({
            id: '1',
            lane: 'onboarding',
            status: 'sent',
            onboarding: { source_id: 'src-1', job_id: 'j', phase: 'await_map', needs_mapping: true }
          }),
          file({
            id: '2',
            lane: 'onboarding',
            status: 'sent',
            onboarding: { source_id: 'src-2', job_id: 'j', phase: 'done', needs_mapping: false }
          })
        ]
      })
    );
    expect(rows.find((r) => r.id === '1')?.mappingLink).toBe('/settings?tab=onboarding&step=4&source=src-1');
    expect(rows.find((r) => r.id === '2')?.mappingLink).toBeNull();
  });

  it('shows confidence only where the classifier gave one', () => {
    const [scored, unscored] = rowsFor(
      drop({ files: [file({ id: '1', name: 'a.csv', confidence: 0.72 }), file({ id: '2', name: 'b.csv', confidence: null })] })
    );
    expect(scored.confidenceLabel).toBe('72%');
    expect(unscored.confidenceLabel).toBe('—');
  });
});

describe('laneCounts', () => {
  it('counts refused files apart from the lane they were recorded in', () => {
    expect(
      laneCounts(
        drop({
          files: [
            file({ id: '1' }),
            file({ id: '2', lane: 'onboarding', status: 'parked' }),
            file({ id: '3', lane: 'onboarding', status: 'refused' })
          ]
        })
      )
    ).toEqual({ choose: 0, direct: 1, onboarding: 1, refused: 1 });
  });
});

describe('canApprove', () => {
  it('is exactly what the server says — never recomputed here', () => {
    expect(canApprove(drop({ can_approve: true }))).toBe(true);
    // Every lane looks ready from here, but the server said no: the server wins.
    expect(canApprove(drop({ can_approve: false }))).toBe(false);
    expect(canApprove(undefined)).toBe(false);
  });
});

describe('blockersFor', () => {
  it('is empty when the drop can be approved', () => {
    expect(blockersFor(drop())).toEqual([]);
  });

  it('names a busy connection, direct blockers, the onboarding reason and unmapped files', () => {
    const sentences = blockersFor(
      drop({
        can_approve: false,
        waiting: 'another import (run r9) is still in progress',
        lane_state: { direct: 'blocked', onboarding: 'waiting', onboarding_reason: 'the onboarding lane is still reading these files' },
        report: {
          direct: { blocker_count: 3 } as BulkDrop['report']['direct'],
          onboarding: null,
          also_in_onboarding_run: []
        },
        files: [
          file({
            id: '2',
            lane: 'onboarding',
            status: 'sent',
            onboarding: { source_id: 's', job_id: 'j', phase: 'await_map', needs_mapping: true }
          })
        ]
      })
    );
    expect(sentences).toEqual([
      'another import (run r9) is still in progress',
      'The direct import has 3 blockers to resolve in its report below.',
      'the onboarding lane is still reading these files',
      '1 file needs its columns confirmed in onboarding.'
    ]);
  });

  it('says the direct import is still being checked, and that it failed', () => {
    expect(blockersFor(drop({ can_approve: false, lane_state: { direct: 'waiting', onboarding: 'none', onboarding_reason: '' } }))).toEqual(
      ['The direct import is still being checked.']
    );
    expect(blockersFor(drop({ can_approve: false, lane_state: { direct: 'failed', onboarding: 'none', onboarding_reason: '' } }))).toEqual([
      'The direct import failed; see its report below.'
    ]);
  });

  it('says nothing is left to approve once the drop has imported', () => {
    expect(
      blockersFor(
        drop({ status: 'completed', can_approve: false, lane_state: { direct: 'imported', onboarding: 'none', onboarding_reason: '' } })
      )
    ).toEqual([]);
  });
});

describe('onboardingLaneNote', () => {
  const UNAVAILABLE =
    'Onboarding imports are not available on this server: the GCP onboarding pipeline is switched off (ONBOARDING_GCP_ENABLED=False).';

  it("says why a 'none' lane takes nothing, even while the direct import can be approved", () => {
    const note = onboardingLaneNote(drop({ lane_state: { direct: 'ready', onboarding: 'none', onboarding_reason: UNAVAILABLE } }));
    expect(note).toBe(UNAVAILABLE);
    // Not a blocker: the direct import still goes ahead.
    expect(blockersFor(drop({ lane_state: { direct: 'ready', onboarding: 'none', onboarding_reason: UNAVAILABLE } }))).toEqual([]);
  });

  it('says it when nothing else can be approved either', () => {
    const lonely = drop({ can_approve: false, lane_state: { direct: 'none', onboarding: 'none', onboarding_reason: UNAVAILABLE } });
    expect(onboardingLaneNote(lonely)).toBe(UNAVAILABLE);
  });

  it('is null for a lane with no onboarding files, and for a lane that is not none (blockersFor names those)', () => {
    expect(onboardingLaneNote(drop())).toBeNull();
    expect(
      onboardingLaneNote(drop({ can_approve: false, lane_state: { direct: 'ready', onboarding: 'waiting', onboarding_reason: 'x' } }))
    ).toBeNull();
  });
});

describe('reclassifyOptions', () => {
  it('offers the other direct entities and the onboarding lane for a direct file', () => {
    const labels = reclassifyOptions(drop(), file({ entity: 'order' })).map((o) => o.label);
    expect(labels).toEqual([
      'Import as Customers',
      'Import as Products',
      'Import as Stock levels',
      'Send to onboarding for a person to map',
      'Leave this file out'
    ]);
  });

  it('offers every direct entity for an onboarding file that has not been sent', () => {
    const options = reclassifyOptions(drop(), file({ lane: 'onboarding', status: 'parked', entity: 'vendor' }));
    expect(options.map((o) => o.entity)).toEqual(['customer', 'product', 'inventory_level', 'order', undefined]);
    // A file stuck waiting for the onboarding lane can always be left out, so it
    // never holds the drop (or, through the one CSV connection, later drops).
    expect(options[options.length - 1]).toEqual({ label: 'Leave this file out', exclude: true });
  });

  it('offers nothing once a file is in the onboarding lane, refused, or the drop is importing', () => {
    expect(reclassifyOptions(drop(), file({ lane: 'onboarding', status: 'sent' }))).toEqual([]);
    expect(reclassifyOptions(drop(), file({ status: 'refused' }))).toEqual([]);
    expect(reclassifyOptions(drop({ status: 'committing' }), file())).toEqual([]);
    expect(reclassifyOptions(drop({ status: 'completed' }), file())).toEqual([]);
  });
});

describe('pollDelay', () => {
  it('polls quickly while a run moves, slowly while onboarding is mapping, and not at all when settled', () => {
    expect(pollDelay(drop({ status: 'staging' }))).toBe(2500);
    expect(pollDelay(drop({ status: 'committing' }))).toBe(2500);
    expect(
      pollDelay(
        drop({
          status: 'awaiting_approval',
          files: [
            file({
              lane: 'onboarding',
              status: 'sent',
              onboarding: { source_id: 's', job_id: 'j', phase: 'await_map', needs_mapping: true }
            })
          ]
        })
      )
    ).toBe(10000);
    expect(pollDelay(drop({ status: 'awaiting_approval' }))).toBeNull();
    expect(pollDelay(drop({ status: 'completed' }))).toBeNull();
    expect(pollDelay(undefined)).toBeNull();
  });
});

describe('mappingLink', () => {
  it('is the onboarding mapping step for that source', () => {
    expect(mappingLink('abc')).toBe('/settings?tab=onboarding&step=4&source=abc');
  });
});

describe('formatDropSize', () => {
  it('names the size in the largest whole unit', () => {
    expect(formatDropSize(512)).toBe('512 bytes');
    expect(formatDropSize(2048)).toBe('2 KB');
    expect(formatDropSize(5 * 1024 ** 2)).toBe('5.0 MB');
    expect(formatDropSize(3 * 1024 ** 3)).toBe('3.0 GB');
  });
});

describe('statusSentence', () => {
  it('says what the drop is waiting on, not a generic "checking"', () => {
    expect(statusSentence(drop({ status: 'staging', lane_state: { direct: 'ready', onboarding: 'waiting', onboarding_reason: '' } }))).toBe(
      'Direct import checked — waiting for the onboarding lane'
    );
    expect(statusSentence(drop({ status: 'staging', lane_state: { direct: 'waiting', onboarding: 'none', onboarding_reason: '' } }))).toBe(
      'Checking the files'
    );
    expect(statusSentence(drop({ status: 'awaiting_approval' }))).toBe('Ready for your review');
    expect(statusSentence(drop({ status: 'completed' }))).toBe('Imported');
    expect(statusSentence(drop({ status: 'classified' }))).toBe('Read — waiting to start');
  });
});

describe('dropStatusLabel', () => {
  it('words every status for the recent-drops list', () => {
    expect(dropStatusLabel('completed')).toBe('Imported');
    expect(dropStatusLabel('staging')).toBe('Checking the files');
  });
});

// --- needs_entity, onboarding_available, Inner Circle, templates ---------------

const CHOICES = [
  { entity: 'order', label: 'Sales history' },
  { entity: 'product', label: 'Products' }
];

function needsEntity(overrides: Partial<DropFile> = {}): DropFile {
  return file({
    id: 'q1',
    name: 'export.csv',
    entity: '',
    confidence: null,
    status: 'needs_entity',
    reason: 'could be sales history or products',
    entity_choices: CHOICES,
    ...overrides
  });
}

describe('files waiting for an answer', () => {
  it('sorts them first, says they wait for the merchant, and offers no Change menu', () => {
    const waiting = drop({ can_approve: false, files: [file({ id: 'a', name: 'a.csv' }), needsEntity()] });
    const [first, second] = rowsFor(waiting);
    expect(first.id).toBe('q1');
    expect([first.tone, first.laneLabel, first.statusLabel]).toEqual(['choose', 'Waiting for you', 'Needs your answer']);
    expect(second.id).toBe('a');
    expect(reclassifyOptions(waiting, needsEntity())).toEqual([]);
    expect(laneCounts(waiting)).toEqual({ choose: 1, direct: 1, onboarding: 0, refused: 0 });
  });

  it('asks one question per file, with the server choices and then Leave this file out', () => {
    const [question] = entityQuestions(drop({ files: [file({ id: 'a' }), needsEntity({ needs_date_order: true })] }));
    expect(question.fileId).toBe('q1');
    expect(question.reason).toBe('could be sales history or products');
    expect(question.choices).toEqual([
      { value: 'order', label: 'Sales history' },
      { value: 'product', label: 'Products' },
      { value: LEAVE_OUT_VALUE, label: 'Leave this file out' }
    ]);
    expect(question.needsDateOrder).toBe(true);
  });

  it('asks nothing for a date flag outside needs_entity, or once the drop is importing', () => {
    expect(entityQuestions(drop({ files: [file({ needs_date_order: true })] }))).toEqual([]);
    expect(entityQuestions(drop({ status: 'committing', files: [needsEntity()] }))).toEqual([]);
  });

  it('builds the reclassify body only once the answer is complete', () => {
    const [plain] = entityQuestions(drop({ files: [needsEntity()] }));
    expect(entityAnswer(plain, '', '')).toBeNull();
    expect(entityAnswer(plain, 'vendor', '')).toBeNull();
    expect(entityAnswer(plain, 'order', '')).toEqual({ entity: 'order' });
    expect(entityAnswer(plain, LEAVE_OUT_VALUE, '')).toEqual({ exclude: true });

    const [dated] = entityQuestions(drop({ files: [needsEntity({ needs_date_order: true })] }));
    expect(entityAnswer(dated, 'order', '')).toBeNull();
    expect(entityAnswer(dated, 'order', 'dmy')).toEqual({ entity: 'order', date_order: 'dmy' });
    // Leaving the file out never needs the date order.
    expect(entityAnswer(dated, LEAVE_OUT_VALUE, '')).toEqual({ exclude: true });
  });

  it('asks only the date order when the server offers no entity choices', () => {
    const [question] = entityQuestions(drop({ files: [needsEntity({ entity: 'order', entity_choices: [], needs_date_order: true })] }));
    expect(question.choices).toEqual([]);
    expect(entityAnswer(question, '', 'mdy')).toEqual({ entity: 'order', date_order: 'mdy' });
  });

  it('counts them in the headline and hides Try again, which cannot answer for the merchant', () => {
    const waiting = drop({ can_approve: false, waiting: 'Waiting for you to say what 1 file holds.', files: [needsEntity()] });
    expect(headlineCounts(waiting)).toBe('0 to import directly · 0 through onboarding · 1 file needs your answer');
    expect(canRetry(waiting)).toBe(false);
    expect(blockersFor(waiting)).toEqual(['Waiting for you to say what 1 file holds.']);
    expect(canRetry(drop({ waiting: 'another import (run r9) is still in progress' }))).toBe(true);
    expect(canRetry(drop({ files: [file({ lane: 'onboarding', status: 'parked' })] }))).toBe(true);
    expect(canRetry(drop())).toBe(false);
  });
});

describe('with onboarding switched off (onboarding_available false)', () => {
  const off = (overrides: Partial<BulkDrop> = {}) => drop({ onboarding_available: false, ...overrides });
  const sentFile = file({
    id: 's',
    lane: 'onboarding',
    status: 'sent',
    onboarding: { source_id: 'src-1', job_id: 'j', phase: 'await_map', needs_mapping: true }
  });

  it('links no file to the mapping step and names no unmapped files', () => {
    expect(rowsFor(off({ files: [sentFile] }))[0].mappingLink).toBeNull();
    expect(blockersFor(off({ can_approve: false, files: [sentFile] }))).toEqual([]);
  });

  it('offers no "Send to onboarding"', () => {
    const labels = reclassifyOptions(off(), file()).map((o) => o.label);
    expect(labels).not.toContain('Send to onboarding for a person to map');
    expect(labels[labels.length - 1]).toBe('Leave this file out');
  });

  it('drops the onboarding count and note unless a file is still in that lane', () => {
    const reason = 'Onboarding imports are not available on this server.';
    expect(headlineCounts(off())).toBe('1 to import directly');
    expect(onboardingLaneNote(off({ lane_state: { direct: 'ready', onboarding: 'none', onboarding_reason: reason } }))).toBeNull();
    const stuck = off({
      files: [file(), file({ id: 'p', lane: 'onboarding', status: 'parked' })],
      lane_state: { direct: 'ready', onboarding: 'none', onboarding_reason: reason }
    });
    expect(headlineCounts(stuck)).toBe('1 to import directly · 1 through onboarding');
    expect(onboardingLaneNote(stuck)).toBe(reason);
  });

  it('treats a payload without the field as available', () => {
    const legacy = drop();
    delete (legacy as Partial<BulkDrop>).onboarding_available;
    expect(headlineCounts(legacy)).toBe('1 to import directly · 0 through onboarding');
  });
});

describe('innerCircleView', () => {
  it('is null when Inner Circle did not run', () => {
    expect(innerCircleView(undefined)).toBeNull();
  });

  it('says what changed', () => {
    expect(innerCircleView({ contacts_updated: 12, duplicates_merged: 1, ladder_created: true, enrolled: 9, skipped: 0 })).toEqual({
      severity: 'success',
      title: 'Inner Circle',
      lines: ['12 customers updated.', '1 duplicate merged.', 'A default ladder was created, since you had none.', '9 members enrolled.']
    });
  });

  it('gives a skipped reason, a skipped count, and an error', () => {
    expect(
      innerCircleView({
        contacts_updated: 0,
        duplicates_merged: 0,
        ladder_created: false,
        enrolled: 0,
        skipped: 'no customers were imported'
      })
    ).toEqual({ severity: 'info', title: 'Inner Circle', lines: ['Skipped: no customers were imported'] });
    expect(innerCircleView({ contacts_updated: 3, duplicates_merged: 0, ladder_created: false, enrolled: 2, skipped: 1 })?.lines).toContain(
      '1 customer was skipped.'
    );
    const failed = innerCircleView({
      contacts_updated: 3,
      duplicates_merged: 0,
      ladder_created: false,
      enrolled: 0,
      skipped: 0,
      error: 'Enrolment failed.'
    });
    expect(failed?.severity).toBe('warning');
    expect(failed?.title).toBe('Inner Circle setup did not finish');
    expect(failed?.lines).toEqual(['3 customers updated.', 'Enrolment failed.']);
  });
});

describe('templateUrl', () => {
  it('builds an absolute URL from the API base, with or without its trailing slash', () => {
    expect(templateUrl('https://api.example.test/api/v1/', 'products.csv')).toBe(
      'https://api.example.test/api/v1/integrations/templates/products.csv'
    );
    expect(templateUrl('https://api.example.test/api/v1', 'orders.csv')).toBe(
      'https://api.example.test/api/v1/integrations/templates/orders.csv'
    );
  });
});

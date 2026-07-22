import { describe, expect, it } from 'vitest';

import type { Note, Task } from 'types/crm';

import { forContact, mergeActivity } from './activity';

function makeNote(overrides: Partial<Note>): Note {
  return {
    id: 'n1',
    contact: 'c1',
    title: 'A note',
    note_type: 'General',
    created_by: 'tester',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides
  };
}

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 't1',
    contact: 'c1',
    subject: 'A task',
    activity_type: 'Call',
    status: 'Pending',
    priority: 'Medium',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides
  };
}

describe('mergeActivity', () => {
  it('interleaves notes and tasks newest-first by created_at', () => {
    const notes = [makeNote({ id: 'n1', created_at: '2026-07-01T00:00:00Z' }), makeNote({ id: 'n2', created_at: '2026-07-03T00:00:00Z' })];
    const tasks = [makeTask({ id: 't1', created_at: '2026-07-02T00:00:00Z' })];
    const timeline = mergeActivity(notes, tasks);
    expect(timeline.map((entry) => (entry.kind === 'note' ? entry.note.id : entry.task.id))).toEqual(['n2', 't1', 'n1']);
  });

  it('handles empty inputs', () => {
    expect(mergeActivity([], [])).toEqual([]);
  });
});

describe('forContact', () => {
  it('keeps only rows whose contact matches exactly', () => {
    const rows = [makeNote({ id: 'n1', contact: 'c1' }), makeNote({ id: 'n2', contact: 'c2' })];
    expect(forContact(rows, 'c1').map((r) => r.id)).toEqual(['n1']);
  });
});

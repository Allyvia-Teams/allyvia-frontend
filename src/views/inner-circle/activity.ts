import type { Note, Task } from 'types/crm';

export type ActivityEntry = { kind: 'note'; timestamp: string; note: Note } | { kind: 'task'; timestamp: string; task: Task };

// Merge a customer's notes and tasks into one newest-first timeline.
export function mergeActivity(notes: Note[], tasks: Task[]): ActivityEntry[] {
  const entries: ActivityEntry[] = [
    ...notes.map((note) => ({ kind: 'note' as const, timestamp: note.created_at, note })),
    ...tasks.map((task) => ({ kind: 'task' as const, timestamp: task.created_at, task }))
  ];
  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// The CRM list endpoints can't filter by contact id server-side (DRF
// SearchFilter only), so callers narrow with ?search=<name> and this
// enforces exactness on the client.
export function forContact<T extends { contact: string }>(rows: T[], contactId: string): T[] {
  return rows.filter((row) => row.contact === contactId);
}

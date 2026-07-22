# CRM → Inner Circle Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fold CRM (contacts/leads/deals/tasks/notes) into Inner Circle, remove the CRM sidebar entry, and keep every legacy `/crm` deep link working via redirects.

**Architecture:** Behavior-preserving component moves from `views/crm/` into `ui-component/inner-circle/`, plus three additive UI features (Members view toggle, Pipeline section, CustomerDrawer Activity tab), URL-param section sync on `InnerCirclePage`, and a `CrmRedirect` route. The CRM data layer (`api/crm.ts`, `hooks/useContacts.ts`, `types/crm.ts`) does not move or change semantics — only two optional list params and one optional form prop are added.

**Tech Stack:** React 19, MUI v7 (Berry), Emotion, React Query v5, react-router-dom v7, react-hook-form, notistack, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-21-crm-inner-circle-merge-design.md`

## Global Constraints

- Branch: `innercirclecrmmerge` — never create a new branch.
- Backend: **zero changes**. Frontend keeps calling `/api/crm/*` and `/api/inner-circle/*` as-is.
- TypeScript strict — no `any` escapes.
- MUI v7 + Emotion conventions; React Query patterns as in existing hooks; no Tailwind.
- Preserve legacy `?tab=&recordId=` semantics (the merged page uses `?tab=`).
- `src/ui-component/analytics/crm/*` and `src/views/analytics/tabs/CRMAnalytics.tsx` must not be touched.
- Small commits, one per task below. Every commit must typecheck (`npm run typecheck`) — the tree is never left broken.
- Working dir for all commands: `/Users/nigelfernando/Documents/Allyvia/allyvia-frontend`.
- Test runner: `npx vitest run <file>` (bare `npm test` starts watch mode — don't use it in automation).

## Verified facts the plan relies on

- `CRMMain.tsx` passes `deepLinkRecordId` ONLY to Contacts/Leads/Deals tabs. `TasksTab`/`NotesTab` never receive it — legacy `/crm?tab=tasks|notes&recordId=` links have always ignored `recordId`. Task/note ids also cannot be resolved client-side (`api/crm.ts` has no `getTask`/`getNote`). Therefore the redirect drops `recordId` for `tasks|notes` (no behavior regression).
- Backend `NoteViewSet`/`TaskViewSet` (`backend/app/crm/views.py`) support only `SearchFilter` (`contact__name` among `search_fields`) — **no `?contact=` filter**. The Activity tab narrows server-side with `search=<customer name>` and enforces exactness client-side by `row.contact === customerId`.
- `useUpdateNote`/`useUpdateTask` mutationFn signatures are `({ id, data })`.
- `NoteForm`/`TaskForm` share `type Props = { open; onClose; initial?; onSubmit; isSubmitting?; serverErrors? }` and default `contact: ''` in two places each (useForm `defaultValues` + `reset` effect).
- `ContactsTab`/`LeadsTab`/`DealsTab` props: `{ deepLinkRecordId?: string | null; onDeepLinkHandled?: () => void }`.
- Sibling imports inside `ui-component/inner-circle/` use relative `'./X'` style.
- Sole importer of `views/crm` is `src/routes/MainRoutes.tsx:19`.
- No existing tests under views/crm or views/inner-circle; repo test pattern is colocated `*.test.ts` (pure logic, no @testing-library).

## File Structure (end state)

```
src/ui-component/inner-circle/
  ContactsTab.tsx      (moved from views/crm/tabs/)
  LeadsTab.tsx         (moved)
  DealsTab.tsx         (moved)
  ContactForm.tsx      (moved from views/crm/components/)
  LeadForm.tsx         (moved)
  DealForm.tsx         (moved)
  TaskForm.tsx         (moved; + defaultContactId prop)
  NoteForm.tsx         (moved; + defaultContactId prop)
  PipelineTab.tsx      (new — Leads|Deals sub-toggle)
  index.ts             (barrel: + ContactsTab, LeadsTab, DealsTab, PipelineTab)
src/views/inner-circle/
  navigation.ts        (new — SectionTab parsing + /crm redirect target builder)
  navigation.test.ts   (new)
  activity.ts          (new — timeline merge + contact filter helpers)
  activity.test.ts     (new)
  CustomerActivity.tsx (new — drawer Activity tab body)
  InnerCirclePage.tsx  (modified — URL sync, Pipeline, Members toggle, tasks in Action Queue)
  CustomerDrawer.tsx   (modified — Overview|Activity tabs)
src/routes/
  CrmRedirect.tsx      (new)
  MainRoutes.tsx       (modified — /crm → CrmRedirect)
src/menu-items/pages.ts (modified — crm entry removed)
UNCHANGED: src/api/crm.ts, src/hooks/useContacts.ts, src/types/crm.ts (GetNotesParams/GetTasksParams already expose `search` — no data-layer edits)
DELETED: src/views/crm/  (CRMMain.tsx, index.tsx, tabs/TasksTab.tsx, tabs/NotesTab.tsx, tabs/DocumentsTab.tsx)
```

> Note: `TasksTab.tsx` / `NotesTab.tsx` are **deleted, not moved** — after the merge no surface renders a standalone all-tasks/all-notes table (per the mission: "No standalone Notes tab"; tasks "same treatment"). Their forms move and stay in use.

---

### Task 1: Move reusable CRM components into `ui-component/inner-circle/`

**Files:**
- Move (git mv): `src/views/crm/tabs/{ContactsTab,LeadsTab,DealsTab}.tsx` → `src/ui-component/inner-circle/`
- Move (git mv): `src/views/crm/components/{ContactForm,LeadForm,DealForm,TaskForm,NoteForm}.tsx` → `src/ui-component/inner-circle/`
- Modify: moved `ContactsTab.tsx`, `LeadsTab.tsx`, `DealsTab.tsx` (one import line each)
- Modify: `src/views/crm/CRMMain.tsx:12-16` (import paths)
- Modify: `src/views/crm/tabs/TasksTab.tsx`, `src/views/crm/tabs/NotesTab.tsx` (form import paths — these files still compile until deleted in Task 7)
- Modify: `src/ui-component/inner-circle/index.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `ContactsTab`, `LeadsTab`, `DealsTab` importable from `'ui-component/inner-circle'` (barrel) with unchanged props `{ deepLinkRecordId?: string | null; onDeepLinkHandled?: () => void }`; `NoteForm`/`TaskForm`/`ContactForm`/`LeadForm`/`DealForm` importable via direct path `'ui-component/inner-circle/<Name>'`.

- [ ] **Step 1: git mv the eight files**

```bash
git mv src/views/crm/tabs/ContactsTab.tsx src/ui-component/inner-circle/ContactsTab.tsx
git mv src/views/crm/tabs/LeadsTab.tsx src/ui-component/inner-circle/LeadsTab.tsx
git mv src/views/crm/tabs/DealsTab.tsx src/ui-component/inner-circle/DealsTab.tsx
git mv src/views/crm/components/ContactForm.tsx src/ui-component/inner-circle/ContactForm.tsx
git mv src/views/crm/components/LeadForm.tsx src/ui-component/inner-circle/LeadForm.tsx
git mv src/views/crm/components/DealForm.tsx src/ui-component/inner-circle/DealForm.tsx
git mv src/views/crm/components/TaskForm.tsx src/ui-component/inner-circle/TaskForm.tsx
git mv src/views/crm/components/NoteForm.tsx src/ui-component/inner-circle/NoteForm.tsx
```

- [ ] **Step 2: Fix relative form imports inside the three moved tabs**

In `src/ui-component/inner-circle/ContactsTab.tsx` (line ~35):
```ts
// before
import ContactForm from '../components/ContactForm';
// after
import ContactForm from './ContactForm';
```
Same one-line change in `LeadsTab.tsx` (`'../components/LeadForm'` → `'./LeadForm'`) and `DealsTab.tsx` (`'../components/DealForm'` → `'./DealForm'`).

- [ ] **Step 3: Point CRMMain and the two remaining tabs at the new locations**

`src/views/crm/CRMMain.tsx` lines 12–16:
```ts
// before
import ContactsTab from './tabs/ContactsTab';
import LeadsTab from './tabs/LeadsTab';
import DealsTab from './tabs/DealsTab';
import TasksTab from './tabs/TasksTab';
import NotesTab from './tabs/NotesTab';
// after
import ContactsTab from 'ui-component/inner-circle/ContactsTab';
import LeadsTab from 'ui-component/inner-circle/LeadsTab';
import DealsTab from 'ui-component/inner-circle/DealsTab';
import TasksTab from './tabs/TasksTab';
import NotesTab from './tabs/NotesTab';
```

`src/views/crm/tabs/TasksTab.tsx` (line ~34): `import TaskForm from '../components/TaskForm';` → `import TaskForm from 'ui-component/inner-circle/TaskForm';`
`src/views/crm/tabs/NotesTab.tsx` (line ~34): `import NoteForm from '../components/NoteForm';` → `import NoteForm from 'ui-component/inner-circle/NoteForm';`

- [ ] **Step 4: Extend the barrel**

`src/ui-component/inner-circle/index.ts` — add after the existing exports (keep alphabetical-ish grouping):
```ts
export { default as ContactsTab } from './ContactsTab';
export { default as DealsTab } from './DealsTab';
export { default as LeadsTab } from './LeadsTab';
```

- [ ] **Step 5: Verify**

Run: `npm run typecheck`
Expected: exit 0, no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: move CRM tabs and forms into ui-component/inner-circle

Behavior-preserving git mv of ContactsTab/LeadsTab/DealsTab and all five
CRM forms ahead of the CRM->Inner Circle merge. CRMMain re-points at the
new paths until it is deleted."
```

---

### Task 2: Navigation + activity helpers (TDD)

**Files:**
- Create: `src/views/inner-circle/navigation.ts`
- Create: `src/views/inner-circle/navigation.test.ts`
- Create: `src/views/inner-circle/activity.ts`
- Create: `src/views/inner-circle/activity.test.ts`

**Interfaces:**
- Consumes: `Note`, `Task` from `'types/crm'`.
- Produces:
  - `SECTION_TABS: readonly ['members','pipeline','promotions','approvals','perks','benefits']`, `type SectionTab`
  - `parseSectionTab(value: string | null): SectionTab`
  - `type PipelineView = 'leads' | 'deals'`, `parsePipelineView(value: string | null): PipelineView`
  - `buildCrmRedirectTarget(params: URLSearchParams): string`
  - `type ActivityEntry = { kind: 'note'; timestamp: string; note: Note } | { kind: 'task'; timestamp: string; task: Task }`
  - `mergeActivity(notes: Note[], tasks: Task[]): ActivityEntry[]` (newest-first)
  - `forContact<T extends { contact: string }>(rows: T[], contactId: string): T[]`

- [ ] **Step 1: Write the failing tests**

`src/views/inner-circle/navigation.test.ts`:
```ts
import { describe, expect, it } from 'vitest';

import { buildCrmRedirectTarget, parsePipelineView, parseSectionTab } from './navigation';

describe('parseSectionTab', () => {
  it('accepts every valid section', () => {
    for (const tab of ['members', 'pipeline', 'promotions', 'approvals', 'perks', 'benefits'] as const) {
      expect(parseSectionTab(tab)).toBe(tab);
    }
  });

  it('falls back to members for null or junk', () => {
    expect(parseSectionTab(null)).toBe('members');
    expect(parseSectionTab('contacts')).toBe('members');
    expect(parseSectionTab('')).toBe('members');
  });
});

describe('parsePipelineView', () => {
  it('returns deals only for the exact value', () => {
    expect(parsePipelineView('deals')).toBe('deals');
  });

  it('falls back to leads otherwise', () => {
    expect(parsePipelineView('leads')).toBe('leads');
    expect(parsePipelineView(null)).toBe('leads');
    expect(parsePipelineView('junk')).toBe('leads');
  });
});

describe('buildCrmRedirectTarget', () => {
  const params = (query: string) => new URLSearchParams(query);

  it('maps bare /crm to members', () => {
    expect(buildCrmRedirectTarget(params(''))).toBe('/inner-circle?tab=members');
  });

  it('maps contacts to members, preserving recordId', () => {
    expect(buildCrmRedirectTarget(params('tab=contacts'))).toBe('/inner-circle?tab=members');
    expect(buildCrmRedirectTarget(params('tab=contacts&recordId=abc-123'))).toBe('/inner-circle?tab=members&recordId=abc-123');
  });

  it('maps leads and deals to pipeline with the right view, preserving recordId', () => {
    expect(buildCrmRedirectTarget(params('tab=leads'))).toBe('/inner-circle?tab=pipeline&view=leads');
    expect(buildCrmRedirectTarget(params('tab=deals&recordId=d-1'))).toBe('/inner-circle?tab=pipeline&view=deals&recordId=d-1');
  });

  it('maps tasks and notes to members and drops recordId (legacy CRM never resolved it)', () => {
    expect(buildCrmRedirectTarget(params('tab=tasks&recordId=t-1'))).toBe('/inner-circle?tab=members');
    expect(buildCrmRedirectTarget(params('tab=notes'))).toBe('/inner-circle?tab=members');
  });

  it('maps unknown tabs to members without recordId', () => {
    expect(buildCrmRedirectTarget(params('tab=documents&recordId=x'))).toBe('/inner-circle?tab=members');
  });
});
```

`src/views/inner-circle/activity.test.ts`:
```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/views/inner-circle/navigation.test.ts src/views/inner-circle/activity.test.ts`
Expected: FAIL — cannot resolve `./navigation` / `./activity`.

- [ ] **Step 3: Implement the helpers**

`src/views/inner-circle/navigation.ts`:
```ts
export const SECTION_TABS = ['members', 'pipeline', 'promotions', 'approvals', 'perks', 'benefits'] as const;
export type SectionTab = (typeof SECTION_TABS)[number];

export function parseSectionTab(value: string | null): SectionTab {
  return (SECTION_TABS as readonly string[]).includes(value ?? '') ? (value as SectionTab) : 'members';
}

export type PipelineView = 'leads' | 'deals';

export function parsePipelineView(value: string | null): PipelineView {
  return value === 'deals' ? 'deals' : 'leads';
}

// Legacy /crm?tab=&recordId= links → merged Inner Circle equivalents.
// tasks/notes drop recordId: legacy CRMMain never passed deepLinkRecordId to
// those tabs, and task/note ids cannot be resolved client-side (api/crm.ts
// has no getTask/getNote).
export function buildCrmRedirectTarget(params: URLSearchParams): string {
  const tab = params.get('tab');
  const recordId = params.get('recordId');

  if (tab === 'leads' || tab === 'deals') {
    const target = new URLSearchParams({ tab: 'pipeline', view: tab });
    if (recordId) target.set('recordId', recordId);
    return `/inner-circle?${target.toString()}`;
  }

  if (tab === 'contacts' && recordId) {
    return `/inner-circle?${new URLSearchParams({ tab: 'members', recordId }).toString()}`;
  }

  return '/inner-circle?tab=members';
}
```

`src/views/inner-circle/activity.ts`:
```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/views/inner-circle/navigation.test.ts src/views/inner-circle/activity.test.ts`
Expected: PASS (all tests green).

- [ ] **Step 5: Commit**

```bash
git add src/views/inner-circle/navigation.ts src/views/inner-circle/navigation.test.ts src/views/inner-circle/activity.ts src/views/inner-circle/activity.test.ts
git commit -m "feat: navigation + activity helpers for Inner Circle merge"
```

---

### Task 3: PipelineTab + InnerCirclePage URL sync

**Files:**
- Create: `src/ui-component/inner-circle/PipelineTab.tsx`
- Modify: `src/ui-component/inner-circle/index.ts`
- Modify: `src/views/inner-circle/InnerCirclePage.tsx`

**Interfaces:**
- Consumes: `LeadsTab`/`DealsTab` (Task 1), `parseSectionTab`/`parsePipelineView`/`SectionTab`/`PipelineView` (Task 2).
- Produces: `PipelineTab` with props `{ initialView?: PipelineView; deepLinkRecordId?: string | null; onDeepLinkHandled?: () => void }`; `InnerCirclePage` driven by `?tab=` (and `?view=`, `?recordId=`) — later tasks rely on `searchParams`, `clearDeepLinkRecord`, and `setSelectedCustomerId` being present.

- [ ] **Step 1: Create PipelineTab**

`src/ui-component/inner-circle/PipelineTab.tsx`:
```tsx
import { useState } from 'react';

import { Box, Tab, Tabs } from '@mui/material';

import DealsTab from './DealsTab';
import LeadsTab from './LeadsTab';

type PipelineView = 'leads' | 'deals';

interface PipelineTabProps {
  initialView?: PipelineView;
  deepLinkRecordId?: string | null;
  onDeepLinkHandled?: () => void;
}

// ==============================|| PIPELINE TAB (Leads + Deals) ||============================== //

export default function PipelineTab({ initialView = 'leads', deepLinkRecordId = null, onDeepLinkHandled }: PipelineTabProps) {
  const [view, setView] = useState<PipelineView>(initialView);

  return (
    <Box>
      <Tabs value={view} onChange={(_event, value: PipelineView) => setView(value)} sx={{ mb: 2 }}>
        <Tab label="Leads" value="leads" sx={{ textTransform: 'none', minHeight: 40 }} />
        <Tab label="Deals" value="deals" sx={{ textTransform: 'none', minHeight: 40 }} />
      </Tabs>
      {view === 'leads' && (
        <LeadsTab deepLinkRecordId={initialView === 'leads' ? deepLinkRecordId : null} onDeepLinkHandled={onDeepLinkHandled} />
      )}
      {view === 'deals' && (
        <DealsTab deepLinkRecordId={initialView === 'deals' ? deepLinkRecordId : null} onDeepLinkHandled={onDeepLinkHandled} />
      )}
    </Box>
  );
}
```

Add to `src/ui-component/inner-circle/index.ts`:
```ts
export { default as PipelineTab } from './PipelineTab';
```

- [ ] **Step 2: Wire URL sync into InnerCirclePage**

All edits in `src/views/inner-circle/InnerCirclePage.tsx`.

(a) Line 2 — add `useSearchParams`:
```ts
import { useNavigate, useSearchParams } from 'react-router-dom';
```

(b) Line 48 — add `PipelineTab` to the barrel import:
```ts
import { ApprovalsTab, BenefitsTab, PerksTab, PipelineTab, PromotionsTab, RedeemCodeDialog } from 'ui-component/inner-circle';
```

(c) After line 49 (`import CustomerDrawer from './CustomerDrawer';`) add:
```ts
import { parsePipelineView, parseSectionTab, type SectionTab } from './navigation';
```

(d) Line 55 — delete the local type (now imported):
```ts
// DELETE this line:
type SectionTab = 'members' | 'promotions' | 'approvals' | 'perks' | 'benefits';
```

(e) Line 130 — replace the state hook with URL-derived values. Before:
```ts
const [sectionTab, setSectionTab] = useState<SectionTab>('members');
```
After:
```ts
const [searchParams, setSearchParams] = useSearchParams();
const sectionTab = parseSectionTab(searchParams.get('tab'));
const pipelineView = parsePipelineView(searchParams.get('view'));
```

(f) After the `handleTierChange` function (line ~191), add the section-change handler, deep-link clearer, and the members `recordId` → drawer effect:
```ts
const handleSectionChange = (_event: React.SyntheticEvent, value: SectionTab) => {
  const next = new URLSearchParams(searchParams);
  next.set('tab', value);
  next.delete('view');
  next.delete('recordId');
  setSearchParams(next, { replace: true });
};

const clearDeepLinkRecord = () => {
  if (!searchParams.has('recordId')) return;
  const next = new URLSearchParams(searchParams);
  next.delete('recordId');
  setSearchParams(next, { replace: true });
};

// Legacy /crm?tab=contacts&recordId=<contactId> → open that customer's drawer.
useEffect(() => {
  if (sectionTab !== 'members') return;
  const recordId = searchParams.get('recordId');
  if (!recordId) return;
  setSelectedCustomerId(recordId);
  const next = new URLSearchParams(searchParams);
  next.delete('recordId');
  setSearchParams(next, { replace: true });
}, [sectionTab, searchParams, setSearchParams]);
```

(g) Line 283 — tab strip uses the handler. Before:
```ts
onChange={(_event, value: SectionTab) => setSectionTab(value)}
```
After:
```ts
onChange={handleSectionChange}
```

(h) Line 288 — add the Pipeline tab right after Members:
```tsx
<Tab label="Members" value="members" sx={{ textTransform: 'none' }} />
<Tab label="Pipeline" value="pipeline" sx={{ textTransform: 'none' }} />
```

(i) Before the `{sectionTab === 'promotions' && (` block (line ~306), add:
```tsx
{sectionTab === 'pipeline' && (
  <Grid size={12}>
    <PipelineTab initialView={pipelineView} deepLinkRecordId={searchParams.get('recordId')} onDeepLinkHandled={clearDeepLinkRecord} />
  </Grid>
)}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: exit 0.

Run: `npx vitest run src/views/inner-circle/`
Expected: PASS (helpers unaffected).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(inner-circle): Pipeline section (Leads|Deals) + ?tab= URL sync"
```

---

### Task 4: Members section — Leaderboard | All Customers toggle

**Files:**
- Modify: `src/views/inner-circle/InnerCirclePage.tsx`

**Interfaces:**
- Consumes: `ContactsTab` from `'ui-component/inner-circle'` (Task 1).
- Produces: `membersView` state (`'leaderboard' | 'all'`) local to the page.

- [ ] **Step 1: Add the toggle**

(a) Extend the barrel import (line 48) with `ContactsTab`:
```ts
import { ApprovalsTab, BenefitsTab, ContactsTab, PerksTab, PipelineTab, PromotionsTab, RedeemCodeDialog } from 'ui-component/inner-circle';
```

(b) Below the `type TierFilter` line (~54), add:
```ts
type MembersView = 'leaderboard' | 'all';
```

(c) With the other `useState` hooks (~line 131), add:
```ts
const [membersView, setMembersView] = useState<MembersView>('leaderboard');
```

(d) Restructure the members block (starts `{sectionTab === 'members' && (` line ~330). Insert the toggle directly inside the `<Grid size={12}>` and wrap the existing flex `<Box>` in the leaderboard branch:
```tsx
{sectionTab === 'members' && (
  <Grid size={12}>
    <Tabs value={membersView} onChange={(_event, value: MembersView) => setMembersView(value)} sx={{ mb: 2 }}>
      <Tab label="Leaderboard" value="leaderboard" sx={{ textTransform: 'none', minHeight: 40 }} />
      <Tab label="All Customers" value="all" sx={{ textTransform: 'none', minHeight: 40 }} />
    </Tabs>
    {membersView === 'all' && <ContactsTab />}
    {membersView === 'leaderboard' && (
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 2, alignItems: 'flex-start' }}>
        {/* ... the ENTIRE existing leaderboard + Action Queue content, unchanged ... */}
      </Box>
    )}
  </Grid>
)}
```
The existing content between the flex `<Box>` and its closing tag moves verbatim — only indentation changes.

- [ ] **Step 2: Verify**

Run: `npm run typecheck` — expected: exit 0.
Browser: `/inner-circle?tab=members` shows the toggle; "All Customers" renders the full contact directory with add/edit; "Leaderboard" is unchanged (tier filter still inside it).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(inner-circle): Members toggle — Leaderboard | All Customers directory"
```

---

### Task 5: CustomerDrawer Activity tab (notes + tasks)

**Files:**
- Modify: `src/ui-component/inner-circle/NoteForm.tsx` (add `defaultContactId`)
- Modify: `src/ui-component/inner-circle/TaskForm.tsx` (add `defaultContactId`)
- Create: `src/views/inner-circle/CustomerActivity.tsx`
- Modify: `src/views/inner-circle/CustomerDrawer.tsx` (Overview|Activity tabs)
- Modify: `src/views/inner-circle/InnerCirclePage.tsx` (pass `initialTab`, reset on leaderboard click)

**Interfaces:**
- Consumes: `mergeActivity`/`forContact` (Task 2); `useNotes`/`useTasks`/`useCreateNote`/`useUpdateNote`/`useCreateTask`/`useUpdateTask` from `'hooks/useContacts'` (update mutationFn shape: `{ id, data }`); `useIsAdmin` from `'hooks/usePermission'`.
- Produces: `CustomerDrawerProps` gains `initialTab?: DrawerTab`; `export type DrawerTab = 'overview' | 'activity'`; `NoteForm`/`TaskForm` Props gain `defaultContactId?: string`.

- [ ] **Step 1: Add `defaultContactId` to both forms**

`src/ui-component/inner-circle/NoteForm.tsx` — extend Props and both `contact: ''` defaults:
```ts
type Props = {
  open: boolean;
  onClose: () => void;
  initial?: Note | null;
  defaultContactId?: string;
  onSubmit: (data: CreateNote | UpdateNote) => Promise<void> | void;
  isSubmitting?: boolean;
  serverErrors?: Record<string, string[]> | null;
};

export default function NoteForm({ open, onClose, initial, defaultContactId, onSubmit, isSubmitting, serverErrors }: Props) {
```
In the `useForm` `defaultValues` create-branch AND in the `reset` effect create-branch, change `contact: ''` to:
```ts
contact: defaultContactId ?? '',
```
Add `defaultContactId` to the reset effect's dependency array: `[open, initial, defaultContactId, reset]`.

Apply the identical change to `src/ui-component/inner-circle/TaskForm.tsx` (Props line, destructure, two `contact: ''` sites, reset deps).

- [ ] **Step 2: Create CustomerActivity**

`src/views/inner-circle/CustomerActivity.tsx`:
```tsx
import { useMemo, useState } from 'react';
import { useSnackbar } from 'notistack';

import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { IconChecklist, IconNotes, IconPlus } from '@tabler/icons-react';

import { useCreateNote, useCreateTask, useNotes, useTasks, useUpdateNote, useUpdateTask } from 'hooks/useContacts';
import { useIsAdmin } from 'hooks/usePermission';
import type { CreateNote, CreateTask, Note, Task, UpdateNote, UpdateTask } from 'types/crm';
import NoteForm from 'ui-component/inner-circle/NoteForm';
import TaskForm from 'ui-component/inner-circle/TaskForm';
import { formatDate } from 'utils/dateUtils';

import { forContact, mergeActivity, type ActivityEntry } from './activity';

interface CustomerActivityProps {
  customerId: string;
  customerName: string;
}

type ServerErrors = Record<string, string[]> | null;

const PAGE_SIZE = 100;

function entryKey(entry: ActivityEntry): string {
  return entry.kind === 'note' ? `note-${entry.note.id}` : `task-${entry.task.id}`;
}

// ==============================|| CUSTOMER ACTIVITY (drawer tab) ||============================== //

export default function CustomerActivity({ customerId, customerName }: CustomerActivityProps) {
  const isAdmin = useIsAdmin();
  const { enqueueSnackbar } = useSnackbar();

  // The CRM list endpoints have no ?contact= filter (DRF SearchFilter only),
  // so narrow server-side by the customer's name and enforce exactness below.
  const listParams = { search: customerName || undefined, page: 1, page_size: PAGE_SIZE };
  const notesQuery = useNotes(listParams);
  const tasksQuery = useTasks(listParams);

  const timeline = useMemo(
    () =>
      mergeActivity(
        forContact(notesQuery.data?.results ?? [], customerId),
        forContact(tasksQuery.data?.results ?? [], customerId)
      ),
    [notesQuery.data, tasksQuery.data, customerId]
  );

  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteErrors, setNoteErrors] = useState<ServerErrors>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskErrors, setTaskErrors] = useState<ServerErrors>(null);

  const createNoteMutation = useCreateNote();
  const updateNoteMutation = useUpdateNote();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();

  const isLoading = notesQuery.isLoading || tasksQuery.isLoading;
  const isError = notesQuery.isError || tasksQuery.isError;

  const submitNote = async (data: CreateNote | UpdateNote) => {
    try {
      if (editingNote) {
        await updateNoteMutation.mutateAsync({ id: editingNote.id, data });
      } else {
        await createNoteMutation.mutateAsync(data as CreateNote);
      }
      setNoteFormOpen(false);
      setEditingNote(null);
      setNoteErrors(null);
      enqueueSnackbar(editingNote ? 'Note updated' : 'Note added', { variant: 'success' });
    } catch (error) {
      const axiosError = error as { response?: { data?: Record<string, string[]> } };
      setNoteErrors(axiosError.response?.data ?? null);
      enqueueSnackbar('Failed to save note', { variant: 'error' });
    }
  };

  const submitTask = async (data: CreateTask | UpdateTask) => {
    try {
      if (editingTask) {
        await updateTaskMutation.mutateAsync({ id: editingTask.id, data });
      } else {
        await createTaskMutation.mutateAsync(data as CreateTask);
      }
      setTaskFormOpen(false);
      setEditingTask(null);
      setTaskErrors(null);
      enqueueSnackbar(editingTask ? 'Task updated' : 'Task added', { variant: 'success' });
    } catch (error) {
      const axiosError = error as { response?: { data?: Record<string, string[]> } };
      setTaskErrors(axiosError.response?.data ?? null);
      enqueueSnackbar('Failed to save task', { variant: 'error' });
    }
  };

  return (
    <Stack spacing={2}>
      {isAdmin && (
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconPlus size={16} />}
            onClick={() => {
              setEditingNote(null);
              setNoteErrors(null);
              setNoteFormOpen(true);
            }}
            sx={{ textTransform: 'none' }}
          >
            Add note
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconPlus size={16} />}
            onClick={() => {
              setEditingTask(null);
              setTaskErrors(null);
              setTaskFormOpen(true);
            }}
            sx={{ textTransform: 'none' }}
          >
            Add task
          </Button>
        </Stack>
      )}

      {isLoading && (
        <Typography variant="body2" color="textSecondary">
          Loading activity…
        </Typography>
      )}

      {isError && !isLoading && (
        <Stack spacing={1} alignItems="flex-start">
          <Typography color="error" variant="body2">
            Failed to load activity.
          </Typography>
          <Button
            size="small"
            onClick={() => {
              notesQuery.refetch();
              tasksQuery.refetch();
            }}
          >
            Retry
          </Button>
        </Stack>
      )}

      {!isLoading && !isError && timeline.length === 0 && (
        <Typography variant="body2" color="textSecondary">
          No notes or tasks for this customer yet.
        </Typography>
      )}

      {!isLoading &&
        !isError &&
        timeline.map((entry) => (
          <Box
            key={entryKey(entry)}
            onClick={() => {
              if (!isAdmin) return;
              if (entry.kind === 'note') {
                setEditingNote(entry.note);
                setNoteErrors(null);
                setNoteFormOpen(true);
              } else {
                setEditingTask(entry.task);
                setTaskErrors(null);
                setTaskFormOpen(true);
              }
            }}
            sx={{
              p: 1.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              cursor: isAdmin ? 'pointer' : 'default'
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              {entry.kind === 'note' ? <IconNotes size={16} /> : <IconChecklist size={16} />}
              <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>
                {entry.kind === 'note' ? entry.note.title : entry.task.subject}
              </Typography>
              {entry.kind === 'task' && (
                <Chip
                  label={entry.task.status}
                  size="small"
                  color={entry.task.status === 'Completed' ? 'success' : entry.task.status === 'Cancelled' ? 'default' : 'warning'}
                  variant="outlined"
                />
              )}
            </Stack>
            {entry.kind === 'note' && entry.note.content && (
              <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {entry.note.content}
              </Typography>
            )}
            {entry.kind === 'task' && entry.task.description && (
              <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {entry.task.description}
              </Typography>
            )}
            <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
              {entry.kind === 'note' ? entry.note.note_type : entry.task.activity_type}
              {' · '}
              {formatDate(entry.timestamp, 'MMM dd, yyyy')}
              {entry.kind === 'task' && entry.task.due_date ? ` · due ${formatDate(entry.task.due_date, 'MMM dd, yyyy')}` : ''}
            </Typography>
          </Box>
        ))}

      <NoteForm
        open={noteFormOpen}
        onClose={() => {
          setNoteFormOpen(false);
          setEditingNote(null);
        }}
        initial={editingNote}
        defaultContactId={customerId}
        onSubmit={submitNote}
        isSubmitting={createNoteMutation.isPending || updateNoteMutation.isPending}
        serverErrors={noteErrors}
      />
      <TaskForm
        open={taskFormOpen}
        onClose={() => {
          setTaskFormOpen(false);
          setEditingTask(null);
        }}
        initial={editingTask}
        defaultContactId={customerId}
        onSubmit={submitTask}
        isSubmitting={createTaskMutation.isPending || updateTaskMutation.isPending}
        serverErrors={taskErrors}
      />
    </Stack>
  );
}
```

- [ ] **Step 3: Add tabs to CustomerDrawer**

`src/views/inner-circle/CustomerDrawer.tsx`:

(a) MUI import (line 5-19) — add `Tab, Tabs`:
```ts
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  Skeleton,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
```

(b) After line 28 (`import { formatDate } ...`) add:
```ts
import CustomerActivity from './CustomerActivity';
```

(c) Replace the props block (lines 30-33):
```ts
export type DrawerTab = 'overview' | 'activity';

export interface CustomerDrawerProps {
  customerId: string | null;
  initialTab?: DrawerTab;
  onClose: () => void;
}
```

(d) Function signature (line 136):
```ts
export default function CustomerDrawer({ customerId, initialTab = 'overview', onClose }: CustomerDrawerProps) {
```

(e) With the other state hooks (~line 140):
```ts
const [tab, setTab] = useState<DrawerTab>(initialTab);

useEffect(() => {
  if (customerId !== null) {
    setTab(initialTab);
  }
}, [customerId, initialTab]);
```

(f) Wrap the loaded content (line 245 `{!isLoading && !isError && customer && (`). The existing `<Stack spacing={3}>…</Stack>` becomes the `overview` branch:
```tsx
{!isLoading && !isError && customer && (
  <>
    <Tabs value={tab} onChange={(_event, value: DrawerTab) => setTab(value)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
      <Tab label="Overview" value="overview" sx={{ textTransform: 'none', minHeight: 40 }} />
      <Tab label="Activity" value="activity" sx={{ textTransform: 'none', minHeight: 40 }} />
    </Tabs>
    {tab === 'overview' && (
      <Stack spacing={3}>
        {/* ... ENTIRE existing overview content, unchanged ... */}
      </Stack>
    )}
    {tab === 'activity' && customerId && <CustomerActivity customerId={customerId} customerName={customer.name} />}
  </>
)}
```

- [ ] **Step 4: Thread `initialTab` through InnerCirclePage**

`src/views/inner-circle/InnerCirclePage.tsx`:

(a) Line 49 import:
```ts
import CustomerDrawer, { type DrawerTab } from './CustomerDrawer';
```

(b) With the other state hooks:
```ts
const [drawerTab, setDrawerTab] = useState<DrawerTab>('overview');
```

(c) Leaderboard row click (line ~402) — reset to overview:
```ts
onClick={() => {
  setDrawerTab('overview');
  setSelectedCustomerId(customer.id);
}}
```

(d) Drawer element (line ~560):
```tsx
<CustomerDrawer customerId={selectedCustomerId} initialTab={drawerTab} onClose={() => setSelectedCustomerId(null)} />
```

- [ ] **Step 5: Verify**

Run: `npm run typecheck` — expected: exit 0.
Run: `npx vitest run src/views/inner-circle/` — expected: PASS.
Browser: open a customer from the leaderboard → drawer shows Overview | Activity; Activity lists that customer's notes/tasks only; Add note/Add task pre-select the customer; edits persist and the timeline refreshes.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(inner-circle): CustomerDrawer Activity tab with per-customer notes and tasks"
```

---

### Task 6: Action Queue — open CRM tasks group

**Files:**
- Modify: `src/views/inner-circle/InnerCirclePage.tsx`

**Interfaces:**
- Consumes: `useTasks` from `'hooks/useContacts'`; `drawerTab`/`setDrawerTab`/`setSelectedCustomerId` (Task 5).
- Produces: nothing consumed later.

- [ ] **Step 1: Fetch open tasks**

(a) Add import after line 45 (`import { formatDate } ...` already present):
```ts
import { useTasks } from 'hooks/useContacts';
```

(b) After the `pendingDraftCount` line (~183):
```ts
// Open CRM tasks for the Action Queue — the list endpoint has no status
// filter, so over-fetch (server orders by -updated_at) and filter client-side.
const {
  data: openTasksData,
  isLoading: openTasksLoading,
  isError: openTasksError,
  refetch: refetchOpenTasks
} = useTasks({ page: 1, page_size: 100 });
const openTasks = useMemo(
  () => (openTasksData?.results ?? []).filter((task) => task.status === 'Pending').slice(0, 8),
  [openTasksData]
);
```

- [ ] **Step 2: Render the fourth group**

Inside the Action Queue `<Stack spacing={2} divider={<Divider flexItem />}>` (line ~480), after the "Near promotion" `<Box>` closes (line ~551), add:
```tsx
<Box>
  <Typography variant="subtitle2" gutterBottom>
    Open tasks
  </Typography>
  {openTasksLoading && (
    <Typography variant="body2" color="textSecondary">
      Loading…
    </Typography>
  )}
  {openTasksError && !openTasksLoading && (
    <Stack spacing={1} alignItems="flex-start">
      <Typography color="error" variant="body2">
        Failed to load tasks.
      </Typography>
      <Button size="small" onClick={() => refetchOpenTasks()}>
        Retry
      </Button>
    </Stack>
  )}
  {!openTasksLoading && !openTasksError && (
    openTasks.length === 0 ? (
      <Typography variant="body2" color="textSecondary">
        None right now
      </Typography>
    ) : (
      <List dense disablePadding>
        {openTasks.map((task) => (
          <ListItem
            key={task.id}
            disableGutters
            onClick={() => {
              if (!task.contact) return;
              setDrawerTab('activity');
              setSelectedCustomerId(task.contact);
            }}
            sx={{ py: 0.5, cursor: task.contact ? 'pointer' : 'default' }}
          >
            <ListItemText
              primary={task.subject}
              secondary={`${task.contact_name ?? '—'}${task.due_date ? ` · due ${formatDate(task.due_date, 'MMM dd')}` : ''}`}
              primaryTypographyProps={{ variant: 'body2', noWrap: true }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </ListItem>
        ))}
      </List>
    )
  )}
</Box>
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck` — expected: exit 0.
Browser: Action Queue shows "Open tasks" as a fourth group; clicking a task with a contact opens that customer's drawer on Activity.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(inner-circle): fold open CRM tasks into the Action Queue"
```

---

### Task 7: CrmRedirect + remove CRM entry points + delete dead files

**Files:**
- Create: `src/routes/CrmRedirect.tsx`
- Modify: `src/routes/MainRoutes.tsx:19,65`
- Modify: `src/menu-items/pages.ts` (remove crm entry + unused icon)
- Delete: `src/views/crm/CRMMain.tsx`, `src/views/crm/index.tsx`, `src/views/crm/tabs/TasksTab.tsx`, `src/views/crm/tabs/NotesTab.tsx`, `src/views/crm/tabs/DocumentsTab.tsx`

**Interfaces:**
- Consumes: `buildCrmRedirectTarget` (Task 2).
- Produces: `/crm` route renders `<CrmRedirect />`.

- [ ] **Step 1: Create the redirect component**

`src/routes/CrmRedirect.tsx`:
```tsx
import { Navigate, useSearchParams } from 'react-router-dom';

import { buildCrmRedirectTarget } from 'views/inner-circle/navigation';

// Legacy /crm deep links → their merged Inner Circle equivalents.
// Keeps old bookmarks working after the CRM tab was folded into Inner Circle.
export default function CrmRedirect() {
  const [searchParams] = useSearchParams();
  return <Navigate to={buildCrmRedirectTarget(searchParams)} replace />;
}
```

- [ ] **Step 2: Rewire MainRoutes**

`src/routes/MainRoutes.tsx` line 19 — replace:
```ts
import CRMPage from 'views/crm';
```
with:
```ts
import CrmRedirect from './CrmRedirect';
```
Line 65 — replace:
```ts
{ path: '/crm', element: <CRMPage /> },
```
with:
```ts
{ path: '/crm', element: <CrmRedirect /> },
```

- [ ] **Step 3: Remove the CRM sidebar entry**

`src/menu-items/pages.ts`:
- Delete line 92: `{ id: 'crm', title: 'CRM', url: '/crm', type: 'item', icon: icons.IconHeartHandshake },`
- Remove `IconHeartHandshake` from the tabler import (line 5) and from the `icons` object (line 34) — it has no other use in this file.
- Do NOT touch the `inner-circle` collapse group (removed in Part 2, not Part 1).

- [ ] **Step 4: Delete the dead CRM shell**

```bash
git rm src/views/crm/CRMMain.tsx src/views/crm/index.tsx src/views/crm/tabs/TasksTab.tsx src/views/crm/tabs/NotesTab.tsx src/views/crm/tabs/DocumentsTab.tsx
```
(`views/crm/` and its subfolders are now empty and disappear from git.)

- [ ] **Step 5: Verify no dangling references**

Run: `grep -rn "views/crm" src --include="*.ts*"`
Expected: only `src/routes/CrmRedirect.tsx` (the `views/inner-circle/navigation` import contains no `views/crm`) — i.e., **zero** matches.

Run: `npm run typecheck` — expected: exit 0.
Run: `npm run build` — expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: retire CRM page — /crm redirects into Inner Circle, sidebar entry removed

CRMMain, TasksTab, NotesTab (no post-merge consumer) and the orphaned
mock-only DocumentsTab are deleted. api/crm.ts, hooks, types, backend,
and analytics/crm components are untouched."
```

---

### Task 8: Full verification pass

**Files:** none (fix-forward only if issues are found).

- [ ] **Step 1: Static checks**

Run: `npm run lint` — expected: exit 0 (warnings acceptable only if pre-existing).
Run: `npm run typecheck` — expected: exit 0.
Run: `npx vitest run` — expected: all suites pass (including the 9 pre-existing theme/util suites and the 2 new ones).
Run: `npm run build` — expected: success.

- [ ] **Step 2: In-browser walkthrough** (dev servers: frontend :3000, backend :8000 via `docker compose -f ../backend/docker-compose.yml up -d db web`)

1. Sidebar: no CRM entry; Inner Circle collapse group still present.
2. `/inner-circle` → lands on Members (Leaderboard). All six tabs render: Members, Pipeline, Promotions, Approvals (badge intact), Perks, Benefits.
3. Members → All Customers: directory loads, search works, add/edit contact works (admin).
4. Pipeline: Leads|Deals sub-toggle; both tables render with their stat cards.
5. Leaderboard row click → drawer Overview; Activity tab shows only that customer's notes/tasks; add note + add task pre-select the customer; edit round-trips.
6. Action Queue: "Open tasks" group renders; task click opens the right customer's drawer on Activity.
7. Redirects — enter each in the URL bar and confirm the landing state:
   - `/crm` → `/inner-circle?tab=members`
   - `/crm?tab=contacts` → members
   - `/crm?tab=contacts&recordId=<real contact uuid>` → members + that customer's drawer opens
   - `/crm?tab=leads` → pipeline (Leads)
   - `/crm?tab=deals&recordId=<real deal uuid>` → pipeline (Deals) + deal record opens per existing DealsTab deep-link behavior
   - `/crm?tab=tasks&recordId=anything` → members, no drawer
   - `/crm?tab=notes` → members
8. `/analytics` → CRM tab still renders its charts.
9. URL sync: switching section tabs updates `?tab=`; refresh restores section.

- [ ] **Step 3: Fix anything found, re-run the failing check, then commit fixes**

```bash
git add -A
git commit -m "fix: Part 1 verification follow-ups"
```
(Skip the commit if nothing needed fixing.)

---

## Self-review notes

- Spec coverage: IA/tabs (T3, T4), drawer Activity (T5), Action Queue tasks (T6), redirects + URL sync (T2, T3, T7), file moves/deletions (T1, T7), sidebar (T7), analytics untouched (constraint + T8 check). Deviation from spec recorded: tasks/notes `recordId` is dropped (legacy CRM provably ignored it — CRMMain.tsx:92-93 passed no deep-link props to TasksTab/NotesTab), and TasksTab/NotesTab are deleted rather than moved (no post-merge consumer).
- Type consistency: `SectionTab`/`PipelineView` defined once in `navigation.ts` and imported everywhere; `DrawerTab` defined in `CustomerDrawer.tsx` and imported by the page; update-mutation payloads use `{ id, data }` matching `hooks/useContacts.ts`.

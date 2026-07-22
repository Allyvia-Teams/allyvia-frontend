# CRM → Inner Circle Merge (Part 1 of 4) — Design

**Date:** 2026-07-21
**Branch:** `innercirclecrmmerge` (no new branches)
**Status:** Approved by Nigel 2026-07-21

Part 1 of a four-part mission (1: this merge · 2: Inner Circle header tab · 3: immersive brand UI · 4: extraction/font fixes). Each part is designed, built, and committed separately, in order.

## Goal

Merge the CRM tab into Inner Circle and remove CRM from the sidebar. Keep the best CRM features, folded into Inner Circle where they naturally belong. Frontend-only consolidation — CRM and Inner Circle already share the backend `crm.Contact` model, so there is no data migration.

## Current state (verified against source)

- **CRM** (`src/views/crm/`): `CRMMain.tsx` — MUI Tabs shell, `TAB_KEYS = ['contacts','leads','deals','tasks','notes']` (index-based), deep-linking via `?tab=` / `?recordId=` with `useSearchParams`. Tab bodies in `tabs/` (`ContactsTab`, `LeadsTab`, `DealsTab`, `TasksTab`, `NotesTab`, plus **orphaned, mock-only** `DocumentsTab.tsx`). Forms in `components/` (`ContactForm`, `LeadForm`, `DealForm`, `TaskForm`, `NoteForm`) — all share the `{open, onClose, initial, onSubmit, isSubmitting, serverErrors}` prop shape.
- **CRM data layer** (stays put): `src/api/crm.ts` (note: has `getContact`/`getLead`/`getDeal` but **no `getTask`/`getNote`**), `src/hooks/useContacts.ts` (all CRUD hooks), `src/types/crm.ts`.
- **Inner Circle**: `src/views/inner-circle/InnerCirclePage.tsx` — `type SectionTab = 'members'|'promotions'|'approvals'|'perks'|'benefits'`; `sectionTab` is **React state only (no URL sync)**. Members section is inline: LTV leaderboard + Action Queue side panel (birthdays / win-backs / near-promotions, ~lines 466–555) + a secondary segmented `<Tabs>` tier filter (~line 346). `CustomerDrawer.tsx` — right drawer, **no internal tabs** (single vertical `<Stack>`), fetches via `useQuery(['customer-detail', customerId])`. Section bodies for Promotions/Approvals/Perks/Benefits live in `src/ui-component/inner-circle/` (prop-less, self-fetching) behind a barrel `index.ts`.
- **Routing/menu**: `src/routes/MainRoutes.tsx` — static imports; `/crm` and `/inner-circle` routes (~lines 65–66). `src/menu-items/pages.ts` — `crm` entry (~line 92) and `inner-circle` collapse group (~93–108). Redirect precedent: `<Navigate to … replace />` in `src/routes/LoginRoutes.tsx:35`.
- **CRM analytics** (`src/ui-component/analytics/crm/*`): sole external consumer is `src/views/analytics/tabs/CRMAnalytics.tsx`. Untouched by this merge.

## Design

### A. Information architecture

Inner Circle section tabs become: **Members · Pipeline · Promotions · Approvals · Perks · Benefits**.

- **Members** gains a primary segmented toggle — **Leaderboard | All Customers** — reusing the exact secondary-`<Tabs>` pattern of the existing tier filter. *Leaderboard* keeps today's view (leaderboard + tier filter nested beneath). *All Customers* renders the full contact directory (search, filters, add/edit via `ContactForm`) by reusing `ContactsTab`.
- **Pipeline** is a new section tab: `ui-component/inner-circle/PipelineTab.tsx` with a **Leads | Deals** segmented sub-toggle wrapping the existing `LeadsTab` / `DealsTab` verbatim (kanban deferred as a possible follow-up).
- **Approvals stays a separate tab** (its pending-count badge is a distinct review queue; decided with Nigel).
- Sidebar: delete only the `crm` entry from `src/menu-items/pages.ts`. The `inner-circle` collapse group **remains until Part 2** (which replaces it with the header tab and relocates Survey Drafts into the page).

### B. CustomerDrawer — new "Activity" tab

Introduce a two-tab structure in `CustomerDrawer.tsx`:

- **Overview** — exactly today's content, unchanged.
- **Activity** — this customer's **notes** timeline (add/edit via `NoteForm`, contact pre-seeded to the open customer) and **tasks** (add/edit via `TaskForm`). Newest-first; note vs task entries visually distinguished.

No standalone Notes or Tasks tabs exist after the merge.

### C. Action Queue — CRM tasks folded in

The Action Queue side panel gains a fourth titled group: **open CRM tasks**, same list-box style as the existing three. A task tied to a contact click-throughs to that customer's drawer on the Activity tab.

### D. Routing, URL sync, redirects

- `InnerCirclePage` gains URL sync using the **`?tab=`** param (preserving old CRM semantics per ground rules): `sectionTab` seeds from `?tab=` and writes back via `useSearchParams` with `{ replace: true }`. `?recordId=` opens the matching customer drawer.
- `/crm` route becomes a small `CrmRedirect` component (following the `LoginRoutes.tsx` `<Navigate replace>` precedent) that translates legacy params:

| Legacy `/crm` link | Redirect target |
|---|---|
| `?tab=contacts` | `/inner-circle?tab=members` |
| `?tab=leads` or `?tab=deals` | `/inner-circle?tab=pipeline` |
| `?tab=tasks` or `?tab=notes` | `/inner-circle?tab=members` |
| `?recordId=<id>` (contacts/tasks/notes) | preserved → opens that customer's drawer; tasks/notes land on the drawer's **Activity** tab |
| `?recordId=<id>` (leads/deals) | preserved → `/inner-circle?tab=pipeline&recordId=<id>`; Pipeline forwards it to `LeadsTab`/`DealsTab`, which keep their existing open-record behavior |
| no params | `/inner-circle?tab=members` |

- Single-record deep-links for tasks/notes are not resolvable (`api/crm.ts` has no `getTask`/`getNote`); opening the customer's drawer is the designed behavior. No API additions in Part 1.
- Old bookmarks never 404.

### E. File moves & deletions

- Move `views/crm/tabs/{Contacts,Leads,Deals,Tasks,Notes}Tab.tsx` and `views/crm/components/*Form.tsx` → `src/ui-component/inner-circle/` (alongside the existing section bodies and barrel).
- Delete `views/crm/tabs/DocumentsTab.tsx` (orphaned, mock-only), `CRMMain.tsx`, and the emptied `views/crm/` folder. The redirect lives in `MainRoutes.tsx`, not a CRM view.
- Untouched: `src/api/crm.ts`, `src/hooks/useContacts.ts`, `src/types/crm.ts`, backend `crm/`, `src/ui-component/analytics/crm/*`.

### F. Error handling

Moved components keep their existing React Query hooks, loading/error states, and notistack toasts — behavior-preserving moves, not rewrites. TypeScript strict; no `any`.

## Verification

1. `npm run typecheck`, `npm run lint`, `npm run build`, existing vitest suites pass.
2. Sidebar shows no CRM entry (Inner Circle group still present until Part 2).
3. In-browser: all six section tabs render; Members toggle (Leaderboard | All Customers) works with search/filter/add/edit contact; Pipeline sub-toggle shows Leads and Deals; CustomerDrawer shows Overview + Activity (notes/tasks add/edit); Action Queue shows the tasks group.
4. Every legacy redirect row in the table above verified in-browser, including `recordId` drawer-opening.
5. Analytics dashboard's CRM tab still renders.

## Out of scope for Part 1

Header entry point (Part 2), immersive brand theming (Part 3), extraction/font fixes (Part 4), Approvals-into-Promotions fold, Pipeline kanban, backend changes of any kind.

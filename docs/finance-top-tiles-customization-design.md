# Design note — customizable top tiles on the Finance tab (ALL-60)

**Status: awaiting review by Nigel. Nothing built.** ALL-60 asks for a
half-to-one-page design note reviewed before any implementation, and its "Done
when" starts with "Design note approved" — so this is the deliverable, and the
picker UI is deliberately not started.

## The short version

B05's analytics layout system already does all of this, per user, with server
persistence. The Finance tab should reuse it rather than grow a second
customization mechanism. The work is adapter-shaped, not
build-a-feature-shaped.

## What already exists (verified on `develop`, B05 landed)

| Piece | Where |
|---|---|
| Widget registry (id → component) | `src/views/analytics/registry/widgetRegistry.ts` |
| Widget metadata (id, tab, title, grid size) | `src/views/analytics/registry/widgetDefinitions.ts` |
| Per-tab default layouts | `src/views/analytics/registry/defaultLayouts.ts` |
| Picker dialog (add / remove / reset to default) | `src/views/analytics/layout/AnalyticsWidgetPicker.tsx` |
| Layout state + server persistence | `src/views/analytics/layout/AnalyticsLayoutContext.tsx` (via `AnalyticsAPI`) |
| Stale-id and cross-tab safety | `src/views/analytics/layout/analyticsLayoutRules.ts` |
| Tests | `src/views/analytics/registry/registry.test.ts` |

Two properties of that system are worth calling out, because they are the ones
a fresh implementation would get wrong:

* **A saved layout outlives the registry.** `analyticsLayoutRules.ts` skips ids
  that no longer resolve, which ALL-144 required after a widget was renamed.
* **An empty stored layout means "never customised", not "empty dashboard"** —
  so defaults stand, and a shared device does not show the previous user's
  arrangement.

## Which metrics are eligible

Only tiles verified ✓ in `finance-AUDIT.md`'s matrix. That gives, per sub-tab:

* **Financial Statements** — Total Revenue, COGS, Gross Profit, Total Expenses,
  Operating Expenses, Net Income, Net Operating Income, Gross Margin %, Net
  Margin %, Total Assets, Total Liabilities, Total Equity, Current Ratio, Debt
  to Equity, Cash In, Cash Out, Net Cash Flow.
* **Invoices** — Total Invoices, Total Amount, Paid, Unpaid, Overdue.
* **Expenses** — Total Expenses, Expense Count, Average Expense, Top Category.
* **Payments** — Total Payments, Payment Count, Average Payment, Success Rate.
* **POS Sales** — Recent Sales, Total Revenue, Cash Sales, Card Sales.

Two exclusions to decide on, and my recommendation for each:

1. **The POS Sales tiles are computed client-side over a fixed last-10-orders
   window**, not over the selected date range (matrix rows 38–42, intentional).
   Offering them beside date-ranged tiles in one picker invites the reading
   that they honour the date range. **Recommend: exclude for v1**, or relabel
   them "(last 10 orders)" in the picker if included.
2. **The Expenses tiles are subject to H3**, still open — the KPI counts
   Bills + Purchases while the table below shows only Bills. **Recommend:
   resolve H3 before making those four tiles selectable**, since one of H3's
   three candidate fixes changes what those tiles mean.

## Defaults, and how many tiles

- **Default set = exactly today's layout, per sub-tab.** A user who never opens
  the picker must see no change at all. That is what `defaultLayouts.ts`
  already encodes for the Analytics tabs.
- **Limit: 4 tiles per row, max 8 shown per sub-tab.** Today's sub-tabs show
  3–5 tiles; 8 is two full rows and keeps the tables above the fold. The
  Analytics grid already carries per-widget grid sizes (`gridSizes.ts`), so
  this is a cap in the picker, not new layout code.
- **Minimum: 1.** Zero tiles is a legitimate choice (a user who only wants the
  tables), and the grid handles an empty widget list. Recommend allowing it
  rather than forcing a floor.

## Where the preference is persisted

Per user, server-side, through the mechanism `AnalyticsLayoutContext` already
uses — **not** `localStorage`. Two reasons: ALL-60's "Done when" requires the
choice to survive **re-login**, which `localStorage` does not guarantee across
devices; and the Analytics layout comment already names the shared-device case
as the reason it went server-side.

Scope key: **per user, per Finance sub-tab.** The five sub-tabs are separate
dashboards with separate data sources; one shared Finance key would make a
choice on Invoices silently reshape Payments.

**Open question for review:** the Finance tab is not an Analytics tab, so its
layouts need either a new tab identifier inside the existing analytics layout
store, or a sibling store. Reusing the existing store with new tab ids
(`finance-statements`, `finance-invoices`, …) is less code and inherits the
stale-id safety; a sibling store keeps Finance's tiles from appearing in the
Analytics picker's tab list. **Recommend reusing the store** and filtering the
Analytics picker by tab, which `widgetsForTab()` already does.

## Empty and edge cases

- **Never-customised user** → defaults, byte-identical to today.
- **Saved tile no longer exists** (metric renamed or dropped after a future
  audit) → skipped, not crashed; already handled by `analyticsLayoutRules.ts`.
- **A tile whose data fails to load** → its own loading/error state, unchanged;
  `AllyviaStats` already takes a `loading` prop and every Finance tile passes
  it.
- **A tile the tenant has no data for** (no QuickBooks connection, so an empty
  balance sheet) → renders its normal zero/em-dash state. Note that after M2,
  an undefined ratio is an em dash on a neutral theme, so an unconnected
  tenant no longer reads as "0.00, everything fine".
- **Reset** → the picker's existing `resetTabToDefault`.

## What I would NOT do

- Build a second registry or a second persistence path for Finance.
- Make the tiles drag-reorderable in v1. Add/remove/reset covers the ask
  ("choose which metrics appear"); ordering is a separate, larger change and
  the Analytics grid's ordering story should settle first.
- Include any tile still marked ✗ in the audit matrix.

## Estimate, once approved

Roughly a day: register the ✓ Finance tiles as widget definitions, add the five
Finance tab ids, mount the existing picker on the Finance tab, and extend
`registry.test.ts` to cover the new ids plus a test that a never-customised
user gets today's exact layout.

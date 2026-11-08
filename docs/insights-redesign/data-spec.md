# Insights redesign: data spec

The shape the new Insights cards render from, the mock data for the build, and how the live
agent data maps onto it. File paths are in `recon.md`.

S0 wrote the first draft. S1 (2026-11-06) replaced the types and mock with the design
reference's final shape and copy, built the flag and the adapter, and wrote the live mapping.
Where S0 and S1 differ, S1 wins; S0's `ImpactInsight` name was never referenced in code, so
the type is `Recommendation`.

Principle: the UI only ever sees `InsightsPayload` / `Recommendation`. The mock and the live
agent both go through one adapter (`src/features/insights/adapter.ts`), so components never
import an API type.

## 1. Types

`src/features/insights/types.ts`:

```ts
type InsightCategory = 'inventory' | 'pricing' | 'staffing' | 'inner_circle' | 'cash';
type FactSource =
  | 'sales_history'
  | 'inventory'
  | 'weather'
  | 'local_events'
  | 'staffing'
  | 'pricing'
  | 'inner_circle'
  | 'cash'
  | 'vendor_terms';
type Confidence = 'high' | 'medium' | 'low';
type Fact = { source: FactSource; label: string; value: string; sub: string };
type Recommendation = {
  id: string; // live: PendingRecommendation.id (the id feedback and rationale take)
  category: InsightCategory;
  title: string;
  summary: string;
  deadline: string; // "Order by 5 PM today"
  confidence: Confidence;
  impact: { amount: number; label: string; signed: boolean }; // signed -> "+$1,140"; unsigned -> "$4,200"
  primaryAction: { label: string; kind: 'purchase_order' | 'shift' | 'markdown' | 'invite' | 'payment' };
  actionPayload?: Record<string, unknown>; // S5: what the action's flow would be prefilled with; mock only
  rationale: { narrative: string; steps: string[] };
  facts: Fact[];
  signalCount: number;
  lastChecked: string; // "7:02 AM"
};
type InsightsPayload = { storeName: string; mode: 'save' | 'growth'; refreshedAt: string; recommendations: Recommendation[] };
```

Changes from S0's draft: `ImpactInsight` -> `Recommendation`; `InsightFact` -> `Fact` (no `id` or
`asOf`, adds `sub`); `rationale.facts` moved up to `facts`; the impact is a display amount plus
a label and a sign instead of `kind`/`period`/`basis`; `primaryAction` has a `kind` instead of
an `href`; added `deadline`, `confidence`, `signalCount`, `lastChecked`; `generatedAt` replaced
by `lastChecked` per card and `refreshedAt` on the payload; categories are now
`inventory | pricing | staffing | inner_circle | cash`.

Display rules for the components (S2 onward):

- Impact: `signed` puts a `+` in front of the amount ("+$1,140 revenue protected"). Unsigned
  amounts are plain figures ("$4,200 kept on hand in Nov").
- Order: the page sorts with `sortByImpact` (amount, largest first). `countByCategory` returns
  every category, with 0 for the empty ones, for the filter chips.
- Dismiss removes the card from the list at once and calls `dismissInsight` when the undo
  toast times out; see section 4.1.

## 2. Mock data

`src/features/insights/mock/insights.mock.ts`, exported as `INSIGHTS_MOCK`. The copy is from the
design reference and is final; change the reference first.

Payload: `storeName` "Juniper & Rye", `mode` "save", `refreshedAt` "today at 7:02 AM".

| id                        | category     | impact                    | confidence | facts | signalCount |
| ------------------------- | ------------ | ------------------------- | ---------- | ----- | ----------- |
| `rec-mara-reorder`        | inventory    | +1,140 revenue protected  | high       | 6     | 6           |
| `rec-saturday-shift`      | staffing     | +620 est. sales captured  | medium     | 5     | 5           |
| `rec-linen-markdown`      | pricing      | +2,050 cash freed         | high       | 5     | 5           |
| `rec-inner-circle-invite` | inner_circle | +1,860 est. sales         | medium     | 4     | 4           |
| `rec-spring-deposit`      | cash         | 4,200 kept on hand in Nov | high       | 5     | 5           |

`sortByImpact` order: spring-deposit, linen-markdown, inner-circle-invite, mara-reorder,
saturday-shift. Each card has four rationale steps. The tests in
`src/features/insights/adapter.test.ts` pin the ids, fact counts, sort order and category
counts.

### 2.1 States the mock also covers

- **Loading**: `getInsights()` in mock mode resolves after 400 ms so the skeleton is visible.
  `getInsights({ mockDelayMs: 0 })` skips the wait (tests do).
- **Empty**: after every card is dismissed, the page shows "You are caught up. New
  recommendations arrive each morning." (S3). The adapter returns a fresh copy of the mock on every call, so a reload brings
  the cards back and dismissing never edits the fixture.
- **Error**: `?insightsMock=error` on the page URL makes the mock reject (dev builds only;
  the check is behind `import.meta.env.DEV`). S6 added `?insightsMock=slow` (the mock waits a
  minute, so the skeleton can be inspected) and `?insightsMock=dismiss-error` (the mock's
  `dismissInsight` rejects), under the same guard.

## 3. Flag

`VITE_INSIGHTS_REDESIGN`, typed in `src/vite-env.d.ts` and documented in `.env.example`. Read
only through `getInsightsMode()` in `src/features/insights/flag.ts`.

| Value                           | `/insights` shows       | Data                                |
| ------------------------------- | ----------------------- | ----------------------------------- |
| `off`                           | today's page, unchanged | today's endpoints                   |
| `mock`                          | the new card list       | `INSIGHTS_MOCK` through the adapter |
| `live`                          | the new card list       | agent endpoints through the adapter |
| unset or anything else, dev     | as `mock`               |                                     |
| unset or anything else, a build | as `off`                |                                     |

"Dev" is `import.meta.env.DEV` (running under `vite` dev). `.env.production` does not set the
variable, so production keeps today's page. The value is trimmed and lower-cased.

The page branches on the mode before anything calls the adapter
(`src/views/insights/InsightsByMode.tsx`): in `off` the new page is never mounted, so
`getInsights()`'s `InsightsDisabledError` is a guard for other callers, not the page's fallback.

S1's temporary console probe was removed in S2.

## 4. Adapter

`src/features/insights/adapter.ts`:

| Export                                        | mock                        | live                                                                    | off                            |
| --------------------------------------------- | --------------------------- | ----------------------------------------------------------------------- | ------------------------------ |
| `getInsights()`                               | copy of `INSIGHTS_MOCK`     | `AgentAPI.Recommendations.list()` mapped by `payloadFromAgent`          | throws `InsightsDisabledError` |
| `getInsightDetail(id)`                        | that card's rationale/facts | `AgentAPI.Recommendations.rationale(id)` mapped by `rationaleFromAgent` | throws                         |
| `dismissInsight(id, reason?)`                 | no-op                       | `AgentAPI.Recommendations.submitFeedback(id, { sentiment: 'down', … })` | no-op                          |
| `sortByImpact(recs)`, `countByCategory(recs)` | pure                        | pure                                                                    | pure                           |

Every function takes an optional `{ mode }` so tests (and S2, if it wants) can pass the mode
explicitly; otherwise it reads `getInsightsMode()`.

`api/agent.api` is imported lazily (`await import(...)`) in live mode only. A static import
would pull `utils/axios` into the adapter's tests (it dies on `sessionStorage` under vitest)
and into the mock-only bundle.

### 4.1 Dismiss

Decided (preamble amendment): live mode sends the Dashboard's thumbs-down, the same call as
`RecommendationFeedback.tsx`'s `sendDown`, so the reason reaches the learning loop. The bare
`POST /agent/recommendations/{id}/dismiss/` is not used.

- `reason` that is one of `FEEDBACK_REASON_CODES` (`api/agentFeedback.ts`) is sent as
  `reasonCode`. Anything else is sent as `reasonText`. No reason sends a bare thumbs-down,
  which the backend records as `other`.
- A thumbs-down dismisses server-side, and a later thumbs-up un-dismisses it. The Dashboard
  dims a declined card so that undo stays reachable. The new page (S3) offers its undo
  before any call: the card leaves the list at once, and the thumbs-down is sent only when
  the 6-second toast times out. Undo inside that window sends nothing, so there is nothing
  to reverse server-side.
- S3's reason chips send codes, not free text: "Not relevant" `not_relevant`, "Already did
  this" `already_doing_it`, "Numbers look wrong" `data_looks_wrong`.
- A failed send (S6, `dismissSend.ts`) puts the card back where it was, removes it from the
  visit record, and shows "Couldn't dismiss. Try again." with no Undo. It is also logged
  (`console.warn`). Before S6 the card stayed off the page until the next load.
- Mock mode: no network call; the adapter logs the call it would have made. The page removes
  the card from its own state.

## 5. Live mapping and its gaps

`src/features/insights/fromAgent.ts`, pure, `import type` only from `api/agent.api`. Every gap
below is a `TODO(insights-live)` comment at the line that fills the default, so
`git grep "TODO(insights-live)"` lists them.

### 5.1 From the pending list (one request)

| Field                 | Live source                                                                                                 | Gap / default                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `id`                  | `rec.id`                                                                                                    | none                                                                                           |
| `category`            | `rec.rec_type` via the backend `RecType` table, then `rec.sector` (#164: finance -> cash), then `inventory` | **TODO**: untyped rows in the `general` sector have no category; default `inventory`           |
| `title`, `summary`    | `splitLead(rec.recommendation_text)`                                                                        | one block of agent text; titles over 90 chars are cut with an ellipsis                         |
| `deadline`            | none                                                                                                        | **TODO**: `''`. `expires_at` is when the row stops showing, not an action deadline             |
| `confidence`          | `rec.confidence_score` (0..1): >= 0.75 high, >= 0.5 medium, else low                                        | the bands are ours; the backend has none                                                       |
| `impact.amount`       | `Number(rec.predicted_impact_dollars)`, rounded                                                             | null or 0 -> `0`                                                                               |
| `impact.label`        | `impact_source === 'llm_estimate'` -> "model estimate", else "estimated impact"                             | **TODO**: no impact kind in the API ("revenue protected", "cash freed"); `''` when amount is 0 |
| `impact.signed`       | `amount > 0`                                                                                                | the API cannot say a figure is cash held rather than gained                                    |
| `primaryAction`       | `kind` from the category; label "Review"                                                                    | **TODO**: no action field; a specific verb would promise something the click cannot do yet     |
| `actionPayload`       | none                                                                                                        | `undefined`: the API has no action parameters, so every kind navigates (section 7)             |
| `signalCount`         | `rec.driving_signals.length`; replaced by the cited-signal count once the rationale loads                   | **TODO**: `[]` on rows that predate the signal registry, so older rows read 0                  |
| `lastChecked`         | `rec.generated_at` as "7:02 AM"                                                                             | none                                                                                           |
| `rationale`, `facts`  | empty until `getInsightDetail(id)`                                                                          | a second request per card, fetched on open, as the Dashboard does                              |
| payload `refreshedAt` | newest `generated_at`, as "today at 7:02 AM" / "yesterday at …" / "Nov 3 at …"                              | none                                                                                           |
| payload `storeName`   | none                                                                                                        | **TODO**: `''`; the page has the company name in the Redux store                               |
| payload `mode`        | none                                                                                                        | **TODO**: `'save'`; no endpoint says Save or Growth                                            |
| order                 | backend order (its rank; `composite_score` after #164)                                                      | the adapter does not re-sort; the page decides whether to apply `sortByImpact`                 |

### 5.2 From the rationale (second request, on open)

| Field                 | Live source                                                                                                                                                                                 | Gap / default                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `rationale.narrative` | `rationale.summary.text`                                                                                                                                                                    | the model's stored words; the Dashboard labels them as such |
| `rationale.steps`     | none                                                                                                                                                                                        | **TODO**: `[]`; the endpoint has no ordered steps           |
| `facts`               | each fact of each cited, non-abstained, available signal, then each `ground_truth` row with a metric and value                                                                              | labels are humanized machine keys ("Units Last 7 Days")     |
| `Fact.source`         | signal key (or ground-truth `source`) via a registry table: `sales_trend` -> sales_history, `weather*` -> weather, `calendar_exception` -> local_events, `supplier_risk` -> vendor_terms, … | unknown keys -> `sales_history`                             |
| `Fact.sub`            | the signal's humanized name; ground truth: "56-day baseline"                                                                                                                                | **TODO**: signal facts carry no explanatory line            |
| `signalCount`         | number of cited, usable signals                                                                                                                                                             | none                                                        |

## 6. Assumptions about PR #164

PR Allyvia-Teams/allyvia-frontend#164 rewrites `src/api/agent.api.ts` and moves
`RecommendationRow`. S1 edits neither file and writes against `agent.api.ts` as #164 leaves it,
in a way that also compiles and runs on today's `main`:

- **`list()` is called with no arguments.** #164 makes the signature
  `list(params?: { surface?, limit? })`; a bare call sends exactly the old request in both
  versions and returns every live row ranked (`surface` defaults to `all` server-side).
- **`sector` is read through a local widening** (`PendingRecommendation & { sector?: string | null }`)
  because it is not on `main`'s type yet. When #164 merges, the widening becomes redundant
  and can go; nothing else changes.
- **`rationale(id)` and `submitFeedback(id, input)` keep their signatures.** #164 does not touch
  them.
- **The Dashboard's thumbs-down is `submitFeedback` with `sentiment: 'down'`.** #164 hides the
  Dashboard's X where a row has its own swap X, but the thumbs-down path is unchanged.
- If #164 lands with a different shape, only `fromAgent.ts` and the lazy imports in
  `adapter.ts` need to follow.

## 7. Primary actions (S5)

`runPrimaryAction(rec, deps)` in `actions.ts` resolves each `primaryAction.kind` to a flow.
S5 opened each route and entry point and checked what it accepts today. **None takes a
prefill**, so every kind navigates, in mock and live alike. The mock's `actionPayload` is
logged with the navigation (`{ notSent: … }`), not sent.

| Kind             | Flow found                                                                                                                                                                                                                       | Outcome today                                               | Prefill the real flow would need                                                                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `purchase_order` | `/inventory/purchase-orders/new` (`views/inventory/PurchaseOrderEditor.tsx`). Reads only `useParams().purchaseOrderId`; no query, no `location.state`. The reorder inbox creates the draft by API first, then links to its uuid. | navigated to `/inventory/purchase-orders/new` (blank draft) | A `location.state` or `?lines=` the editor seeds its draft from, keyed by item **id** (the mock has names: `Mara cable-knit sweater`, M×3, L×3), or create-then-link as the reorder inbox does |
| `markdown`       | No price-change or markdown scheduler anywhere. Closest: the "Markdown candidates" tab of `/inventory/insights` (`?tab=markdown-candidates`, read-only list).                                                                    | navigated to `/inventory/insights?tab=markdown-candidates`  | A scheduler to build first: item or style ids (`Summer linen dress`, 42 units), `percentOff: 30`, start date                                                                                   |
| `shift`          | `/scheduling` (`views/scheduling/index.tsx`). Tabs are local state, no params. The template builder edits a weekly template; there is no dated-shift editor.                                                                     | navigated to `/scheduling`                                  | A dated-shift editor reachable by route or dialog taking `date: 2026-11-14`, `start: 11:00`, `end: 15:00`, `role`                                                                              |
| `invite`         | `/inner-circle` reads `?tab=outreach` and `?kind=`. The "New outreach" composer opens from local state (`Outreach.tsx` `openComposer`); no composer has a segment or audience field.                                             | navigated to `/inner-circle?tab=outreach`                   | A composer opened by URL or exported opener, taking `segment: lapsed_90_days` (38 members) and the campaign (`Holiday preview`); the segment itself does not exist yet                         |
| `payment`        | `/expense/bills` (`views/expense/index.tsx`): a read-only QuickBooks bill table (`QBEntityTable entityType="bill"`). No reschedule or due-date edit anywhere.                                                                    | navigated to `/expense/bills`                               | A bill-reschedule flow taking the bill id (`Spring order deposit`, $4,200) and `newDate: 2026-12-01`                                                                                           |

To wire one, give its `ACTION_FLOWS` entry an `open(payload)` that returns true when it took
the payload; the result becomes `prefilled`. A kind mapped to `null` shows "This action is
coming soon" and is not marked acted on; no kind is `null` today.

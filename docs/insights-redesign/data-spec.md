# Insights redesign: data spec (S0)

The shape the new Insights cards render from, the mock data for the build, and how the live
agent data maps onto it later. All file paths are in `recon.md`.

Principle: the UI only ever sees `ImpactInsight`. The mock and the live agent both go through
one adapter (`src/features/insights/adapter.ts`), so wiring the real endpoint later changes
that one file and adds `fromAgent.ts`, nothing in the components.

## 1. Types

```ts
// src/features/insights/types.ts

/** Where a fact came from. Shown as a small tag on each fact row. */
export type FactSource =
  | 'pos' // sales from the connected point of sale (Square, Shopify, Clover, Allyvia POS)
  | 'inventory' // Allyvia stock levels and stock history
  | 'purchasing' // purchase orders and vendor lead times
  | 'accounting' // QuickBooks or Xero bills and payments
  | 'scheduling' // shifts and timesheets
  | 'inner_circle' // customer club members, opt-ins, survey answers
  | 'weather' // forecast for the store's location
  | 'allyvia_model'; // a number Allyvia calculated or estimated (forecasts, projections)

export const FACT_SOURCE_LABELS: Record<FactSource, string> = {
  pos: 'Sales',
  inventory: 'Inventory',
  purchasing: 'Purchase orders',
  accounting: 'Accounting',
  scheduling: 'Scheduling',
  inner_circle: 'Inner Circle',
  weather: 'Weather',
  allyvia_model: 'Allyvia estimate'
};

export interface InsightFact {
  id: string;
  label: string; // "Units sold, last 21 days"
  value: string; // "23" (already formatted for display)
  source: FactSource;
  asOf?: string; // ISO date the fact was read, when known
}

export type ImpactKind = 'revenue_gain' | 'cost_saving' | 'loss_avoided' | 'cash_freed';
export type ImpactPeriod = 'one_time' | 'per_week' | 'per_month';

export interface InsightImpact {
  amountUsd: number; // whole dollars, always positive; the kind says which way it helps
  kind: ImpactKind;
  period: ImpactPeriod;
  /** 'calculated' = arithmetic on real data; 'model_estimate' = the model's guess. Both are shown, labelled. */
  basis: 'calculated' | 'model_estimate';
}

export interface InsightAction {
  label: string; // verb first: "Start the reorder"
  href: string; // in-app route
}

export type InsightCategory = 'inventory' | 'staffing' | 'finance' | 'customers';

export interface ImpactInsight {
  id: string; // live: PendingRecommendation.id (the id dismiss and rationale take)
  category: InsightCategory;
  title: string; // the action, one line
  summary: string; // plain English, one or two sentences
  impact: InsightImpact;
  primaryAction: InsightAction;
  rationale: {
    narrative: string; // "Why Allyvia recommends this"
    steps: string[]; // numbered steps under the narrative
    facts: InsightFact[]; // "The facts behind it"
  };
  generatedAt: string; // ISO timestamp
}
```

Display rules the components should follow:

- Impact line: `+$1,840` then a short caption from kind and period, for example
  "revenue protected", "saved per week", "cash freed, one time". When `basis` is
  `model_estimate`, add "Estimate" so a guessed number never reads as a measured one. This
  matches what the Dashboard does today ("Model estimate" vs "Estimated impact").
- Cards render in the order the adapter returns them. The mock is pre-sorted; the live order
  is the backend's rank (do not re-sort on the client; #164 takes the same position).
- Dismiss removes the card from the list. See section 4 for what it calls.

## 2. Mock data

Five cards for a single-store fashion boutique. Dates are fixed so screenshots are stable.
`generatedAt` for all five: `2026-11-06T07:00:00-05:00`.

### 2.1 `mock-reorder-linen-dress` (inventory)

- title: Reorder the linen wrap dress in M and L this week
- summary: It is your best seller this month and you have 4 left in the two sizes that sell.
  At the current pace you run out before a new order can arrive.
- impact: 1840, `loss_avoided`, `one_time`, `calculated`
- primaryAction: "Start the reorder" -> `/inventory/purchase-orders/new`
- narrative: The linen wrap dress has sold steadily for three weeks, mostly in M and L. Your
  supplier usually takes 9 days to deliver, and at this pace those sizes sell out in about 5.
  Ordering now keeps them on the rack through the next two weekends.
- steps:
  1. Open a purchase order with Mara Textiles.
  2. Order 12 in M and 10 in L (three weeks of sales plus a small buffer).
  3. Leave S and XL alone; they have 6 weeks of stock.
- facts:
  | id | label | value | source | asOf |
  | --- | --- | --- | --- | --- |
  | f1 | Units sold, last 21 days | 23 | pos | 2026-11-05 |
  | f2 | On hand in M and L | 4 | inventory | 2026-11-06 |
  | f3 | Average supplier lead time | 9 days | purchasing | 2026-11-06 |
  | f4 | Days until M and L sell out | 5 | allyvia_model | 2026-11-06 |
  | f5 | Full price | $148 | inventory | 2026-11-06 |

### 2.2 `mock-markdown-wool-coats` (inventory)

- title: Mark down the three camel wool coats by 25%
- summary: They have been on the floor for 128 days without a sale. A markdown now turns them
  into cash before the winter buying window closes.
- impact: 2150, `cash_freed`, `one_time`, `model_estimate`
- primaryAction: "Review slow movers" -> `/inventory/insights`
- narrative: Coats like these usually sell in the first 60 days. These have had full-price
  exposure through two cold snaps and no sales. Boutiques that mark down aging outerwear before
  December clear most of it; after January the same coats tend to sell at 50% off or not at all.
- steps:
  1. Move the coats to the front table with a 25% off tag.
  2. Mention them in this week's Inner Circle note.
  3. If any are left on December 15, take another 15% off.
- facts:
  | id | label | value | source | asOf |
  | --- | --- | --- | --- | --- |
  | f1 | Days since received | 128 | inventory | 2026-11-06 |
  | f2 | Units sold since received | 0 | pos | 2026-11-05 |
  | f3 | Units on hand | 3 | inventory | 2026-11-06 |
  | f4 | Cost per coat | $410 | accounting | 2026-07-01 |
  | f5 | Expected sell-through at 25% off | 3 of 3 by Dec 15 | allyvia_model | 2026-11-06 |

### 2.3 `mock-saturday-stylist` (staffing)

- title: Add a second stylist on Saturdays from 12 to 4
- summary: Saturday afternoons bring in a third of your weekly sales with one person on the
  floor, and the busiest hours show more walk-outs.
- impact: 620, `revenue_gain`, `per_week`, `model_estimate`
- primaryAction: "Open the schedule" -> `/scheduling`
- narrative: Between noon and 4 on Saturdays you average 11 transactions an hour with one
  stylist. Weekday afternoons with two people on the floor convert more visitors and sell more
  per visit. A second person for four hours costs about $88.
- steps:
  1. Add a 12 to 4 shift on Saturday for your part-time stylist.
  2. Keep it for four Saturdays.
  3. Compare Saturday sales with the four weeks before.
- facts:
  | id | label | value | source | asOf |
  | --- | --- | --- | --- | --- |
  | f1 | Saturday share of weekly sales | 34% | pos | 2026-11-05 |
  | f2 | Transactions per hour, Sat 12 to 4 | 11 | pos | 2026-11-05 |
  | f3 | Staff on floor, Sat 12 to 4 | 1 | scheduling | 2026-11-06 |
  | f4 | Average sale, two staff vs one | $96 vs $81 | pos | 2026-11-05 |
  | f5 | Cost of a 4-hour shift | $88 | scheduling | 2026-11-06 |

### 2.4 `mock-vip-preview` (customers)

- title: Invite your top 14 Inner Circle members to a spring preview
- summary: Your best customers have not visited in over 30 days, and spring stock lands next
  week. A private preview brings them back first.
- impact: 3200, `revenue_gain`, `one_time`, `model_estimate`
- primaryAction: "Draft the invite" -> `/inner-circle`
- narrative: These 14 members spent the most with you this year and all agreed to hear from
  you. None has been in for over a month. A first look at new stock is the reason that
  usually brings this group back, and they tend to buy more than one piece.
- steps:
  1. Pick an evening the week the spring stock arrives.
  2. Send the invite to the 14 members on the list.
  3. Set a few new pieces aside for the night.
- facts:
  | id | label | value | source | asOf |
  | --- | --- | --- | --- | --- |
  | f1 | Members in the group | 14 | inner_circle | 2026-11-06 |
  | f2 | Opted in to messages | 14 of 14 | inner_circle | 2026-11-06 |
  | f3 | Average spend this year | $1,240 | pos | 2026-11-05 |
  | f4 | Days since last visit (median) | 37 | pos | 2026-11-05 |
  | f5 | Spring delivery date | Nov 13 | purchasing | 2026-11-06 |

### 2.5 `mock-early-pay-discount` (finance)

- title: Pay the Mara Textiles bill by November 12 to keep the 2% discount
- summary: The bill offers 2% off if paid within 10 days. Your bank balance covers it.
- impact: 96, `cost_saving`, `one_time`, `calculated`
- primaryAction: "Open bills" -> `/expense/bills`
- narrative: Mara Textiles gives 2% off when a bill is paid within 10 days. This one is
  $4,800 and the window closes on November 12. After that the full amount is due on December 2.
- steps:
  1. Open the bill from Mara Textiles.
  2. Pay it before November 12.
- facts:
  | id | label | value | source | asOf |
  | --- | --- | --- | --- | --- |
  | f1 | Bill amount | $4,800 | accounting | 2026-11-02 |
  | f2 | Early-pay terms | 2% within 10 days | accounting | 2026-11-02 |
  | f3 | Discount deadline | Nov 12 | accounting | 2026-11-02 |
  | f4 | Bank balance as recorded | $18,400 | accounting | 2026-11-06 |

### 2.6 States the mock must also cover

- **Loading**: the adapter resolves after a short delay (about 400 ms) so the skeleton is
  visible. Configurable so tests can set it to 0.
- **Empty**: after every card is dismissed, show an empty state ("You are all caught up").
- **Error**: an `?insightsMock=error` query param (dev only) makes the mock reject, so the
  error state can be checked in the browser.

## 3. Mapping from the live agent (later session)

Source types are in `src/api/agent.api.ts`: `PendingRecommendation` from the list and
`RecommendationRationale` from the rationale endpoint.

| `ImpactInsight` field          | Live source                                                                                     | Gap                                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `id`                           | `rec.id`                                                                                        | none                                                                                                   |
| `category`                     | `rec.sector` (from PR #164), falling back to `rec.rec_type`                                     | `sector` is not on `main` yet; the backend's `general` sector has no matching category (open question) |
| `title`, `summary`             | `splitLead(rec.recommendation_text)`                                                            | works today, but the agent writes one block of text; titles may be cut mid-sentence at 90 chars        |
| `impact.amountUsd`             | `Number(rec.predicted_impact_dollars)`                                                          | null on some rows; the card then has no figure                                                         |
| `impact.basis`                 | `impact_source === 'llm_estimate'` -> `model_estimate`, else `calculated`                       | none                                                                                                   |
| `impact.kind`, `impact.period` | `rationale.expected_value.period` for period                                                    | **no kind field**; period vocabulary is free-form                                                      |
| `primaryAction`                | derived today from `signal_sources` (reorder inbox, buy plan links in `RecommendationCard.tsx`) | **no general action field**; most rows have no obvious target                                          |
| `rationale.narrative`          | `rationale.summary.text`                                                                        | labelled as the model's words today; fine as narrative                                                 |
| `rationale.steps`              | none                                                                                            | **no steps in the API**                                                                                |
| `rationale.facts`              | `rationale.signals[].facts` (cited signals only) and `rationale.ground_truth[]`                 | keys are machine names (`humanize` today); `source` strings need mapping to `FactSource`               |
| `generatedAt`                  | `rec.generated_at`                                                                              | none                                                                                                   |

The rationale is a second request per card. The current UI fetches it only when a row is
expanded, and the live adapter should keep that: the list gives everything except
`rationale`, and the panel fetches on open.

## 4. Dismiss

- **Mock mode**: removes the card from in-memory state. No network call. A reload brings the
  cards back.
- **Live mode**: two existing endpoints could back it (see `recon.md` section 4):
  `POST /agent/recommendations/{id}/dismiss/` (bare, no reason; unused on `main`, used by
  PR #164) or `POST /agent/recommendations/{id}/feedback/` with `sentiment: 'down'` and reason
  chips (what the Dashboard's "Dismiss" X does today, and what feeds the learning loop). This
  is an open question for Nigel; the mock does not depend on the answer.

## 5. Flag

One build-time variable, read once into a module-level constant in
`src/features/insights/flag.ts` (same pattern as `VITE_USE_MOCK_API` in `src/utils/axios.ts`,
so production builds drop the unused branch):

| `VITE_INSIGHTS_REDESIGN`    | `/insights` shows       | Data                                                |
| --------------------------- | ----------------------- | --------------------------------------------------- |
| unset or `off` (production) | today's page, unchanged | today's endpoints                                   |
| `mock`                      | the new card list       | `mock/insights.mock.ts` through the adapter         |
| `live`                      | the new card list       | agent endpoints through the adapter (later session) |

`.env.production` does not set it, so production is unchanged until someone adds it there.
The existing agent client (`AgentAPI.Recommendations.*`) is not modified by the redesign, so
the list, rationale, feedback and dismiss calls stay callable from the Dashboard and from #164.

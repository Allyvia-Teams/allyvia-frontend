# Audit — Analytics Tab

**Reviewed:** all four Analytics tab sub-tabs (`allyvia-frontend/src/views/analytics/tabs/{FinancialAnalytics,CRMAnalytics,EmployeeAnalytics,InventoryAnalytics}.tsx`), the tab shell (`src/views/analytics/index.tsx`), every widget they render, and their full data paths — Redux thunks in `store/slices/{analytics,finance}.ts`, react-query calls via `api/analytics.api.ts`, and the backend views/services in `backend/app/{analytics,expense,payment,invoice}/`.
**Audited:** 2026-09-03, against `origin/develop` @ b004f79 (frontend) and `dev-stripe` @ b68ec7f0 (backend).
**Scope:** ALL-140 — every metric tile, table and chart on the Analytics tab, verified against the actual backend formula and response shape.
**Verdict:** Three High findings (H1–H3), six Medium (M1–M6), two Low (L1–L2). H3 is cross-cutting: it shifts the date range for *every* metric on the tab. The single most-visible defect is the default landing state of the Financial tab's main card, where H2 and M1 combine to render a full 100% donut labelled "No Payment Data Available" where the expense breakdown should be.

**Important scope note.** A large share of the Analytics tab's widget code is unreachable (L2). Six finance charts, the entire `OverviewAnalytics` tab, and `CRMAnalyticsFilters` are never rendered. This matters for ALL-141: fixes applied to those files change nothing a user can see. It also matters for ALL-142 — the registry must be built from what actually renders, not from what exists in `ui-component/analytics/`.

## Audit matrix

Status legend: ✅ verified correct · ❌ confirmed wrong · ⚠️ correct value, misleading presentation · 💀 dead code (not reachable from the Analytics tab).

Rows marked "ALL-54" were verified as part of the Finance-tab audit and share the same endpoint; they are not re-derived here.

| # | Metric | UI location | Component | Endpoint | Source fields | Expected formula | Status | Finding |
|---|---|---|---|---|---|---|---|---|
| 1 | Total Revenue | Financial → KPI tiles | `FinanceKpis.tsx` | `/analytics/finance/kpis/` | `kpis.revenue` | `summary.total_revenue` via `finance_overview()` | ✅ | Field chain `kpis.revenue ?? summary.total_revenue ?? profitAndLoss.total_income` matches backend |
| 2 | Net Income | Financial → KPI tiles | `FinanceKpis.tsx` | `/analytics/finance/kpis/` | `kpis.net_income` | `summary.net` | ✅ | — |
| 3 | Cash Balance | Financial → KPI tiles | `FinanceKpis.tsx` | `/analytics/finance/kpis/` | `kpis.cash_balance`, `kpis.cash_balance_estimated` | `metrics.cash_balance(company)` | ✅ | Estimated-from-POS caveat correctly surfaced as a chip (ALL-91 pattern) |
| 4 | Financial Trends (revenue/expenses/payments) | Financial → trends chart | `FinancialTrendsChart.tsx` | `/analytics/revenue-series/`, `/expense/trend/`, `/payment/trend/` | series arrays | three series plotted over the range | ✅ | — |
| 5 | Total Expenses | Financial → Expense KPIs | `ExpenseKPIs.tsx` | `/expense/stats/` | `total_expenses` | bills + purchases | ✅ | ALL-54 #28 |
| 6 | Expense Count | Financial → Expense KPIs | `ExpenseKPIs.tsx` | `/expense/stats/` | `expense_count` | bill_count + purchase_count | ✅ | ALL-54 #29 |
| 7 | Average Expense | Financial → Expense KPIs | `ExpenseKPIs.tsx` | `/expense/stats/` | `average_expense` | total / count, guarded | ✅ | ALL-54 #30 |
| 8 | Top Category | Financial → Expense KPIs | `ExpenseKPIs.tsx` | `/expense/stats/` | `top_category` | Bills-vs-Purchases comparison | ✅ | ALL-54 #31; em-dash fallback is correct |
| 9 | **Expense Categories donut** | Financial → main card (**default view**) | `FinancialAnalyticsCard.tsx:31` | `/expense/breakdown/` | `[{category, amount}]` | one slice per account subtype | ❌ | **H2** — reads `expenseBreakdown?.by_category`; endpoint returns a flat array, so the donut is *always* empty |
| 10 | Expense donut tooltip | Financial → main card | `FinancialAnalyticsCard.tsx:175` | `/expense/breakdown/` | `amount` | `$<amount>` per slice | ❌ | **M2** — reads `item.total`; always renders `$0` |
| 11 | Expense donut labels | Financial → main card | `FinancialAnalyticsCard.tsx:137` | `/expense/breakdown/` | `category` | account subtype name | ✅ | Fixed on `aarya/analytics-ui-fixes-v2` @ 6a947b1 — verified correct |
| 12 | Empty-donut rendering | Financial → main card (all 3 modes) | `FinancialAnalyticsCard.tsx:399` | — | — | show an empty state | ❌ | **M1** — falls back to `series=[100]`, drawing a full slice labelled "No Payment Data Available" even in Expense/Invoice mode |
| 13 | Top Expenses list | Financial → main card right pane | `FinancialAnalyticsCard.tsx:217` | `/expense/top/` | `expense_name`, `category`, `amount` | top N by amount | ✅ | Fixed @ 6a947b1 — `TopExpensesSerializer.expense_name` confirmed |
| 14 | Total Invoices | Financial → Invoice KPIs | `FinancialAnalyticsCard.tsx` | `/invoice/stats/` | `total_invoices` | count, `is_voided=False` | ✅ | ALL-54 #22 |
| 15 | Total Amount | Financial → Invoice KPIs | `FinancialAnalyticsCard.tsx` | `/invoice/stats/` | `total_amount` | sum, `is_voided=False` | ✅ | ALL-54 #23 |
| 16 | Outstanding Balance | Financial → Invoice KPIs | `FinancialAnalyticsCard.tsx` | `/invoice/stats/` | `outstanding_balance` | sum of `balance` | ✅ | — |
| 17 | Overdue Count | Financial → Invoice KPIs | `FinancialAnalyticsCard.tsx` | `/invoice/stats/` | `overdue_count` | count where overdue | ✅ | ALL-54 #26 |
| 18 | Invoice Distribution donut | Financial → main card | `FinancialAnalyticsCard.tsx:67` | `/invoice/stats/` | `paid_count`, `unpaid_count`, `overdue_count` | share of each status | ✅ | Client-side percentage from counts; `.filter(count > 0)` is correct |
| 19 | Top Overdue Invoices | Financial → main card right pane | `FinancialAnalyticsCard.tsx:262` | `/invoice/stats/` | `top_invoices[]` | top overdue by amount | ✅ | — |
| 20 | Total Payments | Financial → Payment KPIs | `FinancialAnalyticsCard.tsx` | `/payment/summary/` | `total_payments` | QB payments + POS sales | ✅ | ALL-54 #33 |
| 21 | Payment Count | Financial → Payment KPIs | `FinancialAnalyticsCard.tsx` | `/payment/summary/` | `payment_count` | qb_count + pos_count | ✅ | ALL-54 #34 |
| 22 | Average Payment | Financial → Payment KPIs | `FinancialAnalyticsCard.tsx` | `/payment/summary/` | `average_payment` | total / count, guarded | ✅ | ALL-54 #35 |
| 23 | Success Rate | Financial → Payment KPIs | `FinancialAnalyticsCard.tsx` | `/payment/summary/` | `success_rate` | unapplied=0 share | ⚠️ | `|| 0` collapses a legitimate 0% and a missing value to the same "0%" |
| 24 | Payment Methods donut | Financial → main card | `FinancialAnalyticsCard.tsx:135` | `/payment/split/` | `provider`, `amount`, `count` | share by tender | ✅ | `provider` confirmed in `payments_split()`; was already correct before 6a947b1 |
| 25 | Payment Trends line | Financial → main card right pane | `FinancialAnalyticsCard.tsx:301` | `/payment/trend/` | `date`, `total_amount` | last 7 points | ⚠️ | Silently `.slice(-7)` — the card is not labelled "last 7 days" |
| 26 | Open Pipeline Value | CRM → Pipeline Health | `CRMAnalyticsKPIs.tsx` | `/analytics/crm/overview/` | `kpis.open_pipeline_value` | `Sum(value)` over open deals | ✅ | — |
| 27 | Weighted Pipeline | CRM → Pipeline Health | `CRMAnalyticsKPIs.tsx` | `/analytics/crm/overview/` | `kpis.weighted_pipeline` | `Sum(value × probability / 100)` | ✅ | — |
| 28 | New Leads | CRM → Pipeline Health | `CRMAnalyticsKPIs.tsx` | `/analytics/crm/overview/` | `kpis.new_leads` | `leads_qs.count()` in range | ✅ | — |
| 29 | SQLs (Qualified Leads) | CRM → Pipeline Health | `CRMAnalyticsKPIs.tsx` | `/analytics/crm/overview/` | `kpis.sqls` | leads with `status="Qualified"` | ✅ | — |
| 30 | Deals Won | CRM → Sales Performance | `CRMAnalyticsKPIs.tsx` | `/analytics/crm/overview/` | `kpis.deals_won` | won deals in range | ✅ | — |
| 31 | Win Rate | CRM → Sales Performance | `CRMAnalyticsKPIs.tsx` | `/analytics/crm/overview/` | `kpis.win_rate_pct` | `deals_won / total_deals × 100` | ✅ | — |
| 32 | Revenue Won | CRM → Sales Performance | `CRMAnalyticsKPIs.tsx` | `/analytics/crm/overview/` | `kpis.revenue_won` | `Sum(value)` over won | ✅ | — |
| 33 | Avg Deal Size | CRM → Sales Performance | `CRMAnalyticsKPIs.tsx` | `/analytics/crm/overview/` | `kpis.avg_deal_size` | `Avg(value)` over won | ✅ | — |
| 34 | **Total Leads** | CRM → Lead Quality | `CRMAnalyticsKPIs.tsx:84` | `/analytics/crm/overview/` | `kpis.new_leads` | — | ❌ | **M3** — tile says "Total Leads" but renders `new_leads`, which is date-range-scoped. Duplicate of #28 under a different name |
| 35 | Qualified Leads | CRM → Lead Quality | `CRMAnalyticsKPIs.tsx` | `/analytics/crm/overview/` | `kpis.sqls` | — | ⚠️ | Same value as #29 under a second name; not wrong, but redundant |
| 36 | Lead to SQL Rate | CRM → Lead Quality | `CRMAnalyticsKPIs.tsx` | `/analytics/crm/overview/` | `kpis.lead_to_sql_pct` | `sqls / new_leads × 100` | ✅ | — |
| 37 | SQL to Win Rate | CRM → Lead Quality | `CRMAnalyticsKPIs.tsx` | `/analytics/crm/overview/` | `kpis.sql_to_win_pct` | `deals_won / sqls × 100` | ✅ | — |
| 38 | Activities Completed | CRM → Activity & Tasks | `CRMAnalyticsKPIs.tsx` | `/analytics/crm/overview/` | `kpis.activities_completed` | tasks `status="Completed"` | ✅ | — |
| 39 | Overdue Tasks | CRM → Activity & Tasks | `CRMAnalyticsKPIs.tsx` | `/analytics/crm/overview/` | `kpis.overdue_tasks` | tasks past due | ✅ | — |
| 40 | Velocity (Days) | CRM → Activity & Tasks | `CRMAnalyticsKPIs.tsx:95` | `/analytics/crm/overview/` | `kpis.velocity_days` | median days won-deal age | ❌ | **M6** — only tile that skips the null guard; backend defaults to `0.0`, so "no closed deals" renders as "0 days" |
| 41 | CRM primary/secondary charts | CRM → charts | `CRMAnalyticsPrimaryCharts.tsx`, `CRMAnalyticsSecondaryCharts.tsx` | `/analytics/crm/{pipeline,conversion,sources,activities,deal-aging}/` | series | as returned | ✅ | Wrapped in `ChartErrorBoundary` |
| 42 | Rep Performance | CRM → rep table | `CRMRepPerformance.tsx` | `/analytics/crm/rep-performance/` | rep rows | per-rep aggregates | ✅ | Only call that uses `T00:00:00Z`/`T23:59:59Z` timestamps rather than plain dates |
| 43 | Total Hours Worked | Employee → KPI tiles | `EmployeeAnalytics.tsx:239` | `/analytics/employee/overview/` | `summary.total_hours` | sum of entry durations in range | ✅ | — |
| 44 | Active Employees | Employee → KPI tiles | `EmployeeAnalytics.tsx:247` | `/analytics/employee/overview/` | `summary.active_employees` | distinct employees with entries | ✅ | — |
| 45 | Avg Hours/Employee | Employee → KPI tiles | `EmployeeAnalytics.tsx:255` | `/analytics/employee/overview/` | `summary.avg_hours_per_employee` | total / active | ✅ | — |
| 46 | **Open Entries** | Employee → KPI tiles | `EmployeeAnalytics.tsx:263` | `/analytics/employee/overview/` | `summary.current_on_shift` | — | ❌ | **M4** — reads `current_on_shift`, not the `open_entries` field that exists in the same payload; and both are computed with **no date filter**, so the tile ignores the range picker |
| 47 | **Employee timeline** | Employee → timeline chart | `EmployeeAnalytics.tsx:167` | `/analytics/employee/daily/` | `start_time`, `end_time`, `hours` | actual clock-in/out bars | ❌ | **H1** — when `start_time`/`end_time` are absent it **invents a 9:00 AM start** and draws a bar indistinguishable from real data |
| 48 | Hours heatmap | Employee → heatmap | `EmployeeAnalytics.tsx:538` | `/analytics/employee/heatmap/` | `hours` per weekday/hour | grid of hours | ✅ | — |
| 49 | Top employees donut | Employee → donut | `EmployeeAnalytics.tsx:388` | `/analytics/employee/` | `top_employees[].hours` | top 10 by hours | ✅ | — |
| 50 | Daily breakdown | Employee → bar chart | `DailyBreakdown` inline | `/analytics/employee/daily/` | per-day totals | sum per day | ✅ | — |
| 51 | Total Inventory Value | Inventory → KPI tiles | `InventoryAnalytics.tsx:58` | `/analytics/inventory/overview/` | via `inventoryTotalValue()` | sum of qty × cost | ⚠️ | **M5** — correct as a *current* snapshot; endpoint takes no dates, but the tab shows a range picker |
| 52 | Low Stock Items | Inventory → KPI tiles | `InventoryAnalytics.tsx:65` | `/analytics/inventory/overview/` | `low_stock_count` | count below reorder point | ⚠️ | **M5** — same snapshot caveat |
| 53 | Out of Stock | Inventory → KPI tiles | `InventoryAnalytics.tsx:71` | `/analytics/inventory/overview/` | `out_of_stock_count` | count at zero | ⚠️ | **M5** — same snapshot caveat |
| 54 | Inventory Gross Margin | Inventory → KPI tiles | `InventoryAnalytics.tsx:76` | `/analytics/inventory/overview/` | via `inventoryMarginDisplay()` | margin over costed stock only | ✅ | Exemplary: em-dash when unknown, plus a coverage caveat chip. **This is the pattern the other tabs should follow** |
| 55 | Category Distribution | Inventory → donut | `CategoryDistribution.tsx` | `/analytics/inventory/items-treemap/` | `categories[].{name,quantity,value}` | share by category | ✅ | Honest empty state |
| 56 | Inventory Treemap | Inventory → treemap | `InventoryTreemap.tsx` | `/analytics/inventory/items-treemap/` | items | value by item | ✅ | Only inventory call that *does* pass the date range |
| 57 | Top Items | Inventory → list | `TopItems.tsx` | `/analytics/top-items/` | items | top sellers | ✅ | — |
| 58 | Inventory Alerts | Inventory → panel | `InventoryAlertsPanel.tsx` | `/analytics/inventory/overview/` | alerts | low/out-of-stock alerts | ✅ | — |
| — | **Default date range** | tab shell, all metrics | `index.tsx:71-73` | *(all endpoints)* | `START_OF_MONTH`, `TODAY` | local calendar month-to-date | ❌ | **H3** — built with `toISOString()`, so the range is timezone-dependent. Affects **every row above** |

## High

### H1 — The employee timeline invents shift times and shows them as real

**File:** `allyvia-frontend/src/views/analytics/tabs/EmployeeAnalytics.tsx:166-178` (and a second, unreachable copy at `src/ui-component/analytics/employee/EmployeeAnalytics.tsx:132`)

**Problem:** The timeline chart is documented as *"per employee per day using actual clock-in/out times"*. When a day's entry has no `start_time`/`end_time`, the code does not skip it — it fabricates one:

```ts
} else {
  // Fallback: simulate based on total hours
  const hours = ...;
  startTime = new Date(dayDate);
  startTime.setHours(9, 0, 0, 0);          // <-- invented 9:00 AM start
  endTime = new Date(startTime);
  endTime.setHours(startTime.getHours() + Math.floor(hours), (hours % 1) * 60, 0, 0);
}
```

The resulting bar is rendered with the same colour, shape and tooltip as a bar built from real clock data. Nothing in the UI distinguishes them.

**Impact:** Live and reachable. A manager reading the Employee tab sees what looks like a precise attendance record — "Alice: 9:00–17:30 Tuesday" — when the underlying entry contained only a total-hours figure and no times at all. This is worse than a wrong aggregate: it is invented per-employee attendance detail, and it is exactly the class of thing a merchant might act on (a punctuality conversation, a payroll dispute). A secondary defect: for `hours > 15` the computed `endHour` exceeds 24 and the bar overruns the axis.

**Fix:** Drop days with no real `start_time`/`end_time` from the timeline series, the same way `if (!emp) return null` already drops missing employees. If the product wants to keep showing that a shift occurred, it must be a visually distinct mark (hatched bar, muted colour) with a tooltip that says the times are unknown — never a solid bar at an invented hour. Add a component test asserting that an entry with `hours` but no `start_time` produces no timeline point.

### H2 — The Expense Categories donut is always empty (default view of the Financial tab)

**File:** `allyvia-frontend/src/ui-component/analytics/finance/widgets/FinancialAnalyticsCard.tsx:31`

**Problem:** `chartData: expenseBreakdown?.by_category || []`. The `/expense/breakdown/` endpoint is served by `ExpenseBreakdownView`, which returns `FinanceAnalyticsService.expense_breakdown()` — a **flat list** of `{category, amount}`:

```python
out = [{"category": k, "amount": v} for k, v in totals.items()]
```

There is no `by_category` key. The `by_category`/`by_type`/`by_payee` shape belongs to `ExpenseDetailedBreakdownView`, which is **defined but never routed** (`app/expense/views.py:1479`; no entry in `app/expense/urls.py`). So `?.by_category` is always `undefined`, the chart data is always `[]`, and the donut never renders a slice.

**Impact:** Live, reachable, and maximally visible — `analyticsType` defaults to `'expense'`, so this donut is what a user sees the moment they open the Financial tab. Combined with M1 it renders as a **full 100% donut labelled "No Payment Data Available"**, which reads as "we have data and it is all one thing" rather than "there is nothing here".

**Note:** `aarya/analytics-ui-fixes-v2` @ 6a947b1 fixed the *label* extraction on line 137 (`item.category` first) but left line 31 untouched, so the branch does not fix this. The label fix is correct and should be kept; it just never gets any data to label.

**Fix:** Read the flat array — `Array.isArray(expenseBreakdown) ? expenseBreakdown : (expenseBreakdown?.by_category ?? [])`, matching the tolerant shape-handling `ExpenseBreakdown.tsx` already uses after 6a947b1 — and drive the series off `amount`. Regression test: given `[{category: 'Utilities', amount: 500}]`, the donut must produce one slice labelled `Utilities` with value `500`.

### H3 — The default date range is timezone-dependent, shifting every metric on the tab

**File:** `allyvia-frontend/src/views/analytics/index.tsx:71-73`

**Problem:** The default range is built by round-tripping local `Date` objects through UTC:

```ts
const START_OF_MONTH = parseDate(new Date(NOW.getFullYear(), NOW.getMonth(), 1).toISOString().split('T')[0]);
const TODAY = parseDate(new Date().toISOString().split('T')[0]);
```

`new Date(y, m, 1)` is local midnight; `.toISOString()` converts to UTC before the date is sliced off. Measured on 2026-09-03:

| Timezone | `START_OF_MONTH` | want | `TODAY` | want |
|---|---|---|---|---|
| America/New_York | 2026-09-01 | 2026-09-01 | 2026-09-03 | 2026-09-03 |
| America/Los_Angeles | 2026-09-01 | 2026-09-01 | 2026-09-03 | 2026-09-03 |
| Asia/Tokyo | **2026-08-31** | 2026-09-01 | **2026-09-03** | 2026-09-04 |
| Australia/Sydney | **2026-08-31** | 2026-09-01 | **2026-09-03** | 2026-09-04 |

For UTC+ timezones the range starts on the **last day of the previous month** — pulling a day of prior-month revenue, expenses and payments into every "this month" figure — and ends a day early, excluding today. US timezones are correct during the day but break in the evening: at 21:30 EDT, `TODAY` evaluates to 2026-09-04, a day that has not happened.

**Impact:** Live, reachable, and cross-cutting — it perturbs the range handed to every endpoint behind every row of the matrix above. It is also the hardest kind of wrong number to notice, because each individual metric is internally consistent; they are all just computed over the wrong window. The finance-AUDIT flagged the same `toISOString()` pattern as L1 in a narrower spot (`FinancialStatements.tsx` loading fallback); this is the same bug on the tab's primary control.

**Fix:** Format from local calendar fields instead of round-tripping through UTC. `toISO()` already in this file (`index.tsx:76-82`) does exactly that correctly — build the defaults with `@internationalized/date`'s `today(getLocalTimeZone())` and `startOfMonth()`, or reuse the same local-field formatting. Regression test: freeze the clock at 2026-09-03T21:30-04:00 and at 2026-09-03T09:00+09:00 and assert both yield `2026-09-01`/`2026-09-03`.

## Medium

### M1 — An empty donut renders a fake 100% slice

**File:** `FinancialAnalyticsCard.tsx:399` (and label fallback at 385)

`series={chartSeries.length > 0 ? chartSeries : [100]}` with `labels: chartLabels.length > 0 ? chartLabels : ['No Payment Data Available']`. With no data the chart draws one complete slice at 100%. Two problems: a full donut is the visual language of "all of it is this", not "nothing here"; and the label is hardcoded to *payment* wording, so the Expense and Invoice views also announce missing **payment** data. ApexCharts' own `noData` option is already configured two lines above and is what should handle this. **Fix:** pass the real (possibly empty) series and let `noData` render, or lift the existing `AllyviaEmpty` wrapper to cover the empty case as `ExpenseBreakdown.tsx` does.

### M2 — Expense donut tooltip always shows $0

**File:** `FinancialAnalyticsCard.tsx:175`

`return \`$${parseFloat(item.total || '0').toLocaleString()}\`` — the `/expense/breakdown/` rows carry `amount`, not `total`. Every expense slice tooltip reads `$0`. Latent behind H2 today (there are no slices to hover); it becomes live the moment H2 is fixed, so both must be fixed together. **Fix:** read `item.amount`.

### M3 — CRM "Total Leads" tile shows new leads for the period

**File:** `CRMAnalyticsKPIs.tsx:84`

The Lead Quality section renders `{ title: 'Total Leads', value: formatNumber(kpis.new_leads) }`. `new_leads` is `leads_qs.count()` **after** the date filter — leads created in the range. A tile called "Total Leads" states the size of the whole lead database, and the two diverge for every range that is not all-time. The same value already appears, correctly named, as "New Leads" in the Pipeline section (#28). **Fix:** rename to "New Leads (period)" to match the backend field, or add a genuine all-time total to the endpoint if the product wants that number. Renaming is the cheaper correct answer; the ticket asks for accurate labels, not new metrics.

### M4 — "Open Entries" ignores the date range and reads the wrong field

**File:** `EmployeeAnalytics.tsx:263`; backend `app/analytics/views.py:672-681`

The tile reads `summary.current_on_shift`, though the same payload also exposes `summary.open_entries`. The backend computes the two with **identical** querysets — `TimeEntry.objects.filter(employee__company=..., clock_out__isnull=True).count()` — so the displayed number happens to be right, but the code reads a field whose name contradicts the label, and the backend runs the same COUNT twice per request. Neither query is date-filtered, so the tile shows entries open *right now* while sitting in a range-scoped tab. **Fix:** read `open_entries`; label it so its "as of now" nature is explicit (the inventory margin chip at #54 is the house pattern); and collapse the duplicated backend query.

### M5 — Inventory KPI tiles are current-stock snapshots under a date-range picker

**File:** `InventoryAnalytics.tsx:56-84`; backend `InventoryOverviewView`

`fetchInventoryOverview()` takes no date parameters and `InventoryOverviewView` reads none — `AnalyticsService.get_inventory_summary(company)` is a snapshot of stock as it stands. That is the correct definition for stock level, low-stock and out-of-stock counts. The problem is presentational: they sit directly beneath a date-range picker that changes every other number on the tab, so a user who selects "last month" reasonably reads them as last month's stock position. Note the treemap beside them (#56) *does* honour the range, so the same screen mixes both semantics with no visual cue. **Fix:** label the snapshot tiles "as of today" (or attach the caveat chip already used at #54). Do **not** add date filtering to the inventory endpoints — this overlaps ALL-92..96 (B11), and the metric is correct as computed.

### M6 — CRM velocity renders "0 days" when there is nothing to measure

**File:** `CRMAnalyticsKPIs.tsx:95`

Every other CRM tile routes through `formatNumber`/`formatCurrency`/`formatPercentage`, which return `'N/A'` for null/NaN. Velocity alone interpolates raw: `` value: `${kpis.velocity_days} days` ``. The backend initialises `velocity_days = 0.0` and only overwrites it when there are closed deals to take a median of, so a company with no closed deals shows a confident **"0 days"** — a claim that deals close instantly. A partial payload renders `"undefined days"`. **Fix:** route through a guard that renders an em-dash, and have the backend return `null` rather than `0.0` when `velocities` is empty, matching the null-not-zero convention `metrics.gross_margin_pct` already follows.

## Low

### L1 — Debug logging left in two tabs

`FinancialAnalytics.tsx:48` and eleven sites in `EmployeeAnalytics.tsx` (142, 149, 161, 174, 192, 203, 388, 734, 860, …) log on every render, including per-employee, per-day loops. `FinancialAnalyticsCard.tsx:190-196` adds a `[Payment Donut]` effect. Besides the console noise this leaks employee names and hours into the browser console. **Fix:** delete them.

### L3 — The analytics "Download Report" button does not produce a report

**File:** `ui-component/analytics/common/AnalyticsDownloadButton.tsx:176-243`

The download control in the tab header is fully styled and reachable. Its PDF handler assembles five report sections (`overviewKpis`, `revenueTable`, `expenseTable`, `topItemsTable`, `lowStockTable`), then `console.log`s them and raises `alert('PDF generation functionality would be implemented here. Data has been logged to console for development.')`. A comment above the log states the intent plainly: *"In a real implementation, you would integrate with a PDF generation library"*.

So the `console.log` here is not debug noise — it is the feature's only output, and the five locals exist solely to feed it. That is why this file is deliberately **excluded** from the L1 log cleanup: removing the log would leave five unused variables and silently change what the button does.

**Impact:** Live and reachable, but not a wrong *number* — it is an unimplemented feature presented as a working one. Out of ALL-141's scope (which covers incorrect metrics); raised here so it is tracked rather than lost. **Recommend a separate ticket** to either implement the export or hide the control until it works.

### L2 — Large unreachable surface in `ui-component/analytics/`

Confirmed zero render sites from the Analytics tab:

- `views/analytics/tabs/OverviewAnalytics.tsx` — never imported by `index.tsx` (the tab list is Financial/CRM/Employee/Inventory), and it is the only renderer of `FinanceRevenueProfitTrend`, `ExpenseBreakdown` and `FinanceCashFlow`
- `ui-component/analytics/overview/{KpiCards,RevenueTrend}.tsx` — zero references anywhere
- `ui-component/analytics/crm/CRMAnalyticsFilters.tsx` — exported from the barrel, never rendered (this is where the `mockOwners`/`mockStages`/`mockSources` arrays live)
- `ui-component/analytics/finance/charts/{ExpenseTrendsChart,TopExpenses,DistributionChart,PaymentTrendsChart,InvoiceDistribution,FinanceOverduePending}.tsx`
- `ui-component/analytics/finance/{widgets/ProfitAnalytics,charts/AccountBalancesChart,widgets/FinanceCashFlow}.tsx` — referenced only inside the commented-out block at `FinancialAnalytics.tsx:129-142`
- `ui-component/analytics/employee/EmployeeAnalytics.tsx` — a second copy of the tab component, carrying its own copy of the H1 simulated-times bug

**Consequence for ALL-141:** commits 6a947b1/c8e0102/040f4b3 fix `AccountBalancesChart`, `ExpenseTrendsChart` and `CRMAnalyticsFilters`, all of which are in this list. Those fixes are correct and worth keeping — the mock data is real and the components may be revived by the widget registry — but they change nothing a user currently sees. The only live widget those commits touch is `FinancialAnalyticsCard`, and there the fix is partial (see H2).

**Consequence for ALL-142:** the registry must be built from the reachable set. Registering the dead components as-is would make untested, mock-data-backed widgets user-selectable for the first time — turning dormant code into a live correctness problem. Either wire them up deliberately (with their data paths verified against this matrix) or leave them out of the registry.

## Fix status

Updated as ALL-141 lands. `Fixed` requires a regression test asserting the corrected value.

| Finding | Severity | Owner ticket | Status |
|---|---|---|---|
| H1 — simulated timeline times | High | ALL-141 | **fixed** — `employeeTimelineView.ts`, 11 tests |
| H2 — expense donut always empty | High | ALL-141 | **fixed** — `financialAnalyticsCardView.ts`, 10 tests |
| H3 — timezone-shifted default range | High | ALL-141 | **fixed** — `analyticsDateRange.ts`, 6 tests |
| M1 — fake 100% empty donut | Medium | ALL-141 | **fixed** — covered by the donut tests |
| M2 — expense tooltip `total` vs `amount` | Medium | ALL-141 | **fixed** — covered by the donut tests |
| M3 — "Total Leads" mislabel | Medium | ALL-141 | **fixed** — renamed "New Leads (period)" |
| M4 — "Open Entries" field + range | Medium | ALL-141 | **fixed** — reads `open_entries`, labelled "(now)" |
| M5 — inventory snapshot labelling | Medium | ALL-141 | **fixed** — caption on the KPI row |
| M6 — velocity 0-vs-no-data | Medium | ALL-141 | **fixed (frontend)** — em dash; the backend still returns `0.0` rather than `null`, left alone to avoid a contract change other consumers may rely on |
| L1 — debug logging | Low | ALL-141 | **fixed** — 0 remaining under `src/views/analytics` and `src/ui-component/analytics`, except L3 |
| L2 — dead widget surface | Low | ALL-142 | **addressed** — the registry now renders every widget it lists; the duplicate `employee/EmployeeAnalytics.tsx` was deleted |
| L3 — download button is a stub | Low | *(new ticket needed)* | not fixed — out of ALL-141 scope |

Two rows are worth reading twice. **H1 and M4/M5 were re-broken by the ALL-142 refactor** and had to be applied a second time: the registry split the Employee and Inventory tabs into widget components taken from the pre-fix source, carrying the fabrication bug into `EmployeeAnalyticsContext.tsx`. H2/M1/M2 survived because `FinancialAnalyticsCardWidget` wraps the shared card rather than copying it. Any future extraction of these tabs should re-check this table.

## Appendix — ALL-19 vs ALL-139

ALL-19 ("Fix Analytics page — customizable widgets", Todo, Low, unassigned) reads in full: *"Rework Analytics so every metric is user-selectable: a widget setup where the business owner picks what data each widget shows."*

That is the same two-part scope as ALL-139 ("correct metrics data + customizable widgets"), stated earlier and more loosely. Point by point:

| ALL-19 asks for | Delivered by |
|---|---|
| "every metric is user-selectable" | ALL-142 registry (29 widgets, one catalog entry each) + ALL-143 picker (add/remove any of them through the UI) |
| "a widget setup" | ALL-142 — the tab renders from a layout list, not a hardcoded grid |
| "the business owner picks" | ALL-143 picker + ALL-144 per-user, per-account persistence |

**One caveat, recorded rather than glossed.** ALL-19's phrase *"picks what data each widget shows"* has a stricter reading: a generic widget that the owner points at an arbitrary metric, rather than a catalog of fixed-purpose widgets they choose between. ALL-139's line of work delivers the latter. If the stricter reading was the intent, it is **not** delivered and needs its own ticket — nothing in ALL-140–144 provides per-widget data-source configuration. The only thing resembling it is the pre-existing expense/invoice/payment selector inside `FinancialAnalyticsCard`, which is one widget's local control, not a general mechanism.

On the ordinary reading — the one ALL-139's own title uses — ALL-19 is fully covered and adds nothing new. **Recommend closing as DUPLICATE of ALL-139**, with the stricter reading raised separately if that is what was wanted.

# Audit — Finance Tab

**Reviewed:** all five Finance tab sub-tabs (`allyvia-frontend/src/views/finance/tabs/{FinancialStatements,Invoices,Expenses,Payments,POSSales}.tsx`) and their full data paths — Redux thunks in `store/slices/finance.ts`, API client methods in `src/api/finance.api.ts`, and the corresponding backend views/services in `backend/app/{profit,analytics,invoice,expense,payment,billpayment,pos}/`.
**Audited:** 2026-08-25 to 2026-08-31, branch `nehalgarg2901/all-54-1-inventory-every-finance-tab-metric-tile-and-chart-into-an`
**Scope:** Full Finance tab inventory (ALL-54) — every metric tile, table, and chart across all five sub-tabs, verified against actual backend formulas and filtering logic.
**Verdict:** Five live, reachable bugs found across the tab (H1–H5), one already fixed (M1/ALL-58), two display-only issues (M2, L1), and one latent/currently-unreachable issue in defensive code (L2). No systemic/Critical issues — each bug is isolated to a specific tile, table, or endpoint rather than the overall architecture.

## High

### H1 — Cash Flow overstates "cash out" when a bill payment is voided

**File:** `backend/app/analytics/services.py`, `FinanceAnalyticsService.cash_flow_statement()`

**Problem:** The function computes `cash_out` from two sources: `QBBillPayment` (vendor payments) and `QBPurchase`. The `QBPurchase` query correctly filters `is_voided=False`, matching the `QBPayment` query used for `cash_in`. The `QBBillPayment` query does not — it aggregates `total_amount` over every bill payment in the date range regardless of voided status, even though `QBBillPayment.is_voided` exists as a real, actively-used field (set by the QuickBooks sync in `app/expense/services.py` when a bill payment is voided in QBO, and correctly filtered elsewhere in the codebase, e.g. `app/billpayment/views.py`'s stats endpoints).

**Impact:** Live and reachable, not latent — any time a bill payment is voided in QuickBooks within a company's selected date range, this inflates `cash_out`, which flows into three displayed values on the Financial Statements sub-tab: the "Total Cash Out" tile, the "Net Cash Flow" tile, and the Operating Activities row of the Cash Flow Statement table (`cash_flow?.operating_activities?.cash_out` / `net_operating`).

**Fix:** Add `is_voided=False` to the `QBBillPayment` filter in `cash_flow_statement()`, matching the pattern already used for `QBPurchase` and `QBPayment` in the same function.

### H2 — Invoice table shows voided invoices with no indication, inconsistent with the KPI tiles above it

**File:** `backend/app/invoice/views.py`, `InvoiceListView.get()` (compare to `InvoiceStatsView.get_stats()`)

**Problem:** `InvoiceStatsView.get_stats()` explicitly excludes voided invoices (`base_qs = QBInvoice.objects.filter(company=company, is_voided=False)`), and its own code comment states the intent plainly: *"Match the invoice list view's filtering: exclude voided invoices... so the KPIs agree with the table instead of showing all-time totals."* But `InvoiceListView.get()` only filters on `is_voided` if the request explicitly passes that query param — its base queryset (`QBInvoice.objects.filter(company=company)`) has no default exclusion. The frontend (`InvoicesTab.tsx`) never sends `is_voided` on its initial load, so by default the Invoice Table shows voided invoices right alongside real ones. Worse: `QBInvoiceSerializer` does expose an `is_voided` field, but `InvoiceTable.tsx`'s status chip only reads `invoice.status` (paid/unpaid/overdue) — a voided invoice renders with no visual indication it's void at all, indistinguishable from a real one.

**Impact:** Live and reachable — any company with a voided invoice in the selected date range sees a table row count and total that don't match the KPI tiles above it, and that voided invoice looks identical to a real unpaid/overdue one. A merchant could reasonably act on it (e.g. follow up for payment on an invoice that no longer exists).

**Fix:** Default `InvoiceListView`'s base queryset to `is_voided=False` (matching `InvoiceStatsView`'s own stated intent), keeping the existing explicit `is_voided` query param as an override for anyone who deliberately wants to see voided invoices. Separately, worth having `InvoiceTable.tsx` visually flag `is_voided` rows regardless, as a defense-in-depth measure.

### H3 — Expense table only shows Bills, while the Expense KPIs above it include Purchases too

**File:** `allyvia-frontend/src/ui-component/finance/tables/ExpenseTable.tsx`; `store/slices/finance.ts` (`fetchExpensesList`, `fetchPurchasesList`); `backend/app/expense/services.py` (`_get_local_expense_summary`, `_get_local_expense_stats`)

**Problem:** `ExpenseKPIs` (Total Expenses, Expense Count, Average Expense) is backed by `expenseStats`, and the backend computes that as `total_bills + total_purchases` — it queries both `QBBill` and `QBPurchase` and sums them (correctly: `QBBill` has no `is_voided` field so it's unfiltered by design, `QBPurchase` is correctly filtered `is_voided=False`). But `ExpenseTable` only ever dispatches `fetchExpensesList`, which calls `FinanceAPI.Expense.getBills` — Purchases are never fetched or rendered in the table at all. A separate `fetchPurchasesList` thunk already exists in `finance.ts` (and `ExpenseAPI.getPurchases` exists in the API client) but has zero callers anywhere under `src/views/` or `src/ui-component/finance/` — confirmed by search, it's dead code as far as the UI is concerned.

**Impact:** Live and reachable — the KPI tiles and the table underneath them are answering two different questions. Any expense recorded in QuickBooks as a Purchase rather than a Bill counts toward Total Expenses / Expense Count / Average Expense but is completely invisible in the table below it — a merchant has no way to see what actually makes up part of their own "Total Expenses" figure.

**Fix:** Either merge Purchases into the Expense table (labeling the source per row), or wire up the already-existing `fetchPurchasesList` thunk as a second table/section, or explicitly scope the KPIs to Bills only and rename them so the mismatch can't happen. Any of the three keeps the KPIs and the table answering the same question.

### H4 — Raw backend exception text is leaked to the client throughout the Expense endpoints

**File:** `backend/app/expense/views.py`

**Problem:** This file returns `str(e)` (or an f-string wrapping it) directly in the client-facing error response at 18 separate `except Exception` sites — e.g. lines 150, 200, 268, 334, 383, 443, 490, 537, 788, 1402, 1516 (confirmed by search across the whole file). This is the same leaked-exception-text bug class already tracked from ALL-53's H4, but that finding only covered `DashboardSummaryView` — this one file has it at more than a dozen separate call sites, across nearly every Expense endpoint (stats, categories, top expenses, trend, breakdown, and more).

**Impact:** Live and reachable on any unhandled server-side error (bad data, a DB timeout, a QuickBooks API failure) — leaks internal implementation details (stack-trace fragments, model/field names, occasionally raw values) straight to the browser, and returns a different, non-actionable error string to the user for every distinct failure instead of one clear message.

**Fix:** Replace `str(e)` in the client-facing response with a fixed, generic message at each site, and log the real exception server-side (with stack trace) instead. Given how many sites repeat the identical pattern, this is worth doing as one pass across the whole file rather than endpoint-by-endpoint.

### H5 — Payment table has no voided-payment filtering or indication at all

**File:** `backend/app/payment/views.py`, `PaymentListView.get()` (compare to `PaymentSummaryView` → `QuickbooksPaymentService._get_local_payment_summary()`); `allyvia-frontend/src/ui-component/finance/tables/PaymentTable.tsx`

**Problem:** The Payment KPIs (Total Payments, Payment Count, Average Payment, Success Rate) come from `_get_local_payment_summary()`, which correctly filters `QBPayment.objects.filter(company=company, is_voided=False, ...)`. `PaymentListView.get()` — which backs the table below — filters only `QBPayment.objects.filter(company=company)`, with no `is_voided` handling anywhere in the view: not a default exclusion, and unlike Invoices, not even an unused override query param. `PaymentTable.tsx` has no status or voided column or chip of any kind — it renders reference number, customer, method, amount, and unapplied amount only.

**Impact:** Live and reachable — this is the same class of bug as H2, but with no override mechanism at all: every voided payment always appears in the table, with no way to tell it apart from a real one, while the KPIs above it silently exclude them.

**Fix:** Default `PaymentListView` to `is_voided=False` (add the field and the filter), and add a visual indicator for voided rows in `PaymentTable.tsx`, mirroring the H2 fix.

## Medium

### M1 — "AP Due This Period" fell back to array position instead of an explicit zero

**File:** `allyvia-frontend/src/views/dashboard/Analytics/AnalyticsSection.tsx`, `getChartMetrics()`, `case 'Accounts Payable Summary':`

**Problem:** The tile looked up the "Due This Week" AP-aging bucket via `xAxis.indexOf('Due This Week')`, which correctly located the bucket wherever it sat in the array — reordering was never actually broken, despite how the ticket originally framed it. The real defect was the fallback: when the label was missing entirely, the code fell back to `data[0]` — whatever value happened to sit at array position 0 — instead of showing zero. If a tenant's AP-bucket response ever omitted "Due This Week," the tile would silently display a different bucket's dollar amount as if it were this one.

**Impact:** Latent risk, not an observed production bug. `PayablesByDueDateView` (`backend/app/analytics/views.py`) currently always returns all 4 buckets (`Due This Week`, `Next Week`, `This Month`, `Overdue`) in fixed order, so the missing-bucket path isn't reachable against today's data.

**Fix:** Extracted the lookup into a standalone, side-effect-free `getBucketValueByLabel(labels, data, targetLabel)` in a new file, `analyticsBuckets.ts`, returning an explicit `0` when the label isn't found — never a neighboring bucket's value. Kept out of `AnalyticsSection.tsx` itself because that component's import tree pulls in `axios.ts` → `mockApi.ts` → `posHandlers.ts`, which reads `sessionStorage` at module load time and crashes outside a browser context (pre-existing, unrelated issue, out of scope here). Added `AnalyticsSection.test.ts` covering 4 cases: normal order, reordered buckets, missing bucket (asserts `0`, not a neighbor's value), and an empty bucket list. Full project suite: 1162/1162 passing, 0 regressions.

**Reference:** PR #102 (`nehalgarg2901/all-58-fix-ap-due-this-period-read-by-array-position-instead-of` → `develop`) · Linear ALL-58, parent ALL-15

### M2 — Current Ratio / Debt to Equity show a misleading "0.00" instead of an undefined value

**File:** `allyvia-frontend/src/views/finance/tabs/FinancialStatements.tsx`, lines 47–48

**Problem:** Both ratios are computed inline —
`currentLiabilities > 0 ? (currentAssets / currentLiabilities).toFixed(2) : '0.00'` and
`totalEquity > 0 ? (totalLiabilities / totalEquity).toFixed(2) : '0.00'` —
instead of going through the codebase's existing `ratioOf`/`formatRatio` helpers (`src/utils/financeFormat.ts`), which already render an em dash ("—") for an undefined/zero-denominator ratio specifically to avoid a fake-zero reading elsewhere in the app (see `financeFormat.test.ts`'s "empty-inventory average" case). This component reintroduces the exact bug class those helpers exist to prevent. It's also stricter than intended: the guard is `> 0`, not `!== 0`, so **negative** equity — a real and meaningful state (the business is underwater) — falls into the same `'0.00'` bucket as zero equity, reading as "no debt relative to equity" when the true situation is the opposite.

**Impact:** A company with zero current liabilities or zero/negative equity sees a falsely reassuring "0.00" on both ratio tiles instead of an undefined indicator, which could misread as "no risk" rather than "not computable" or "negative."

**Fix:** Replace both inline computations with `ratioOf(currentAssets, currentLiabilities)` / `ratioOf(totalLiabilities, totalEquity)` and render through `formatRatio`, matching the pattern already established elsewhere in `financeFormat.ts`. For the equity case, treat `totalEquity <= 0` as undefined (not just `=== 0`) so negative equity doesn't fall through to a "0.00" reading.

## Low

### L1 — Balance Sheet title falls back to a UTC-shifted date

**File:** `allyvia-frontend/src/views/finance/tabs/FinancialStatements.tsx`, line 241

**Problem:** `balanceSheet?.effective_date || new Date().toISOString().split('T')[0]` — the fallback (used only when `effective_date` hasn't loaded yet) round-trips through UTC via `toISOString()`, the same known-bad pattern documented in the bug-pattern table (`dashboardRange.ts`'s C1). For browser timezones ahead of UTC, this can display a date one day off from local "today."

**Impact:** Cosmetic only — a card title showing a possibly-wrong date for a brief moment before real data loads. No calculation is affected; `effective_date` itself (once loaded) comes correctly from the backend, not from this fallback.

**Fix:** Build the fallback date from the local `Date` object's own year/month/day (same fix pattern as `dashboardRange.ts`'s C1), or simply show a loading state instead of a fallback date.

### L2 — `fetchExpensesList`'s missing-date fallback uses the known UTC round-trip pattern, but is currently unreachable

**File:** `allyvia-frontend/src/store/slices/finance.ts`, `fetchExpensesList` thunk

**Problem:** If ever dispatched without `startDate`/`endDate` and without `state.finance.dateRange` set, the thunk falls back to `new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0]` / `new Date().toISOString().split('T')[0]` — the same UTC-shift pattern tracked elsewhere in the bug-pattern table (e.g. L1 above, `dashboardRange.ts`'s C1).

**Impact:** Currently latent, not live. Every call site that dispatches `fetchExpensesList` — `ExpenseTable.tsx`, `Expenses.tsx`, `Transactions.tsx`, and `views/finance/index.tsx` — already guards on `startDate && endDate` being present before dispatching (confirmed by checking all four call sites), so this fallback branch is not reachable through any path in the current UI. Flagging it because it's defensive code sitting on a known-bad pattern — it would misbehave silently the moment a future caller ever omits dates.

**Fix:** Low priority given it's unreachable today. If touched, replace with a timezone-safe local-date fallback (same fix as L1), or remove the fallback entirely and let the thunk fail loudly on missing dates, matching how other required params are handled elsewhere in this file.

## Summary table

| # | Sev | Issue | Fix |
|---|---|---|---|
| H1 | High | Cash Flow's "cash out" includes voided bill payments (`QBBillPayment` query missing `is_voided=False`) | Add the same `is_voided=False` filter already used for `QBPurchase`/`QBPayment` in the same function |
| H2 | High | Invoice table shows voided invoices with no visual indication, inconsistent with the KPI tiles above it | Default `InvoiceListView` to `is_voided=False`, matching `InvoiceStatsView`'s own stated intent; flag voided rows in the table regardless |
| H3 | High | Expense table (Bills only) doesn't match Expense KPIs (Bills + Purchases); `fetchPurchasesList` exists but is never dispatched | Merge/expose Purchases in the table, wire up the existing thunk, or scope the KPIs to Bills only |
| H4 | High | Raw exception text (`str(e)`) leaked to the client at 18 sites in `expense/views.py` | Return a generic error message at each site; log the real exception server-side |
| H5 | High | Payment table has no `is_voided` filtering or override param at all, unlike Invoices | Default `PaymentListView` to `is_voided=False`; flag voided rows in `PaymentTable.tsx` |
| M1 | Medium | "AP Due This Period" fell back to array position (`data[0]`) instead of an explicit `0` when the bucket label was missing | Extracted label-keyed lookup (`getBucketValueByLabel`) with an explicit `0` fallback; 4 regression tests added |
| M2 | Medium | Current Ratio / Debt to Equity show "0.00" instead of an undefined value when the denominator is zero or negative | Use the existing `ratioOf`/`formatRatio` helpers instead of inline computation; treat equity `<= 0` as undefined |
| L1 | Low | Balance Sheet card title's loading-state fallback uses the known UTC round-trip date pattern | Derive the fallback date from local Y/M/D instead of `toISOString()`, or show a loading state |
| L2 | Low | `fetchExpensesList`'s date fallback uses the same UTC round-trip pattern, currently unreachable | Low priority — timezone-safe fallback or fail loudly if ever touched |

## Reviewed — no issues found

Tiles/charts traced and checked against their intended formula with nothing wrong found beyond what's listed above. Grouped by Finance-tab sub-tab.

- **Financial Statements:** P&L KPI tiles + P&L Statement table — formulas verified in `backend/app/profit/services.py::_get_local_profit_and_loss` (via `analytics/metrics.py`): `revenue − cogs = gross_profit`, `revenue − total_expenses = net_income`, `operating_expenses = max(0, total_expenses − cogs)`. `net_operating_income` intentionally diverges from `net_income` only in the documented edge case where COGS exceeds total expenses — deliberate, not a bug. Gross Margin / Net Margin tiles correctly use `marginOf`/`formatPercent` (em-dash on zero revenue, verified against `financeFormat.test.ts`). Balance Sheet Assets/Liabilities/Equity tables + equation check — backend (`FinanceAnalyticsService.balance_sheet`, `app/analytics/services.py`) is explicit that figures are a live current-balance snapshot rather than a true historical point-in-time reconstruction (`basis`/`is_point_in_time`/`effective_date` fields), and the frontend correctly displays `effective_date` rather than misrepresenting the requested `as_of_date` as honored. See H1/M2/L1 above for what's not clean on this sub-tab.
- **Invoices:** KPI tiles (Total Invoices, Total Amount, Paid, Unpaid, Overdue) verified against `backend/app/invoice/views.py::InvoiceStatsView.get_stats()` — counts/sums scoped correctly to the selected date range and to non-voided invoices. Note: the technical overview doc lists "aging data" as part of this sub-tab, but `InvoicesTab.tsx` doesn't fetch or render invoice aging at all — that's a stale claim in that doc, not a product gap (invoice aging is used on the Dashboard's Analytics section instead, via a different component). See H2 above for the one real issue found here.
- **Expenses:** Bill/Purchase totals, average, and count formulas in `backend/app/expense/services.py` verified correct and internally consistent — `QBBill` correctly has no `is_voided` filter (the model has no such field, per the technical overview doc's note, confirmed in code), `QBPurchase` is correctly filtered `is_voided=False`. "Top Category" is a simple Bills-vs-Purchases comparison, working exactly as coded — noted as a UX-naming observation only, not a defect, since it may not match a user's expectation of real QuickBooks expense categories. See H3/H4/L2 above for what's not clean on this sub-tab.
- **Payments:** Total Payments, Payment Count, Average Payment, and Success Rate all verified correct in `QuickbooksPaymentService._get_local_payment_summary()`, correctly filtered `is_voided=False`. Note: by design, "Total Payments" and "Payment Count" combine QB payments with completed POS sales (shared definitions from `analytics/metrics.py`) — confirmed intentional via the function's own inline code comment, not a bug, but worth knowing when comparing this tile against QuickBooks alone. See H5 above for the one real issue found here.
- **POS Sales:** The "Recent 10 orders" table is intentionally not date-range-scoped — it calls a dedicated `recent_orders(company, limit=10)` backend function with no date params, and the frontend's React Query key (`['pos-recent-orders']`) has no dependency on the Finance tab's date filters. Confirmed intentional by a named backend test (`test_recent_orders_returns_last_ten_scoped_to_company`), analogous to the Inventory Overview snapshot pattern already noted as by-design elsewhere. The four KPIs (Recent Sales, Total Revenue, Cash Sales, Card Sales) are all client-computed directly from this same fixed 10-order set, so they move together consistently — not misleading, just not date-filtered, which matches its "Recent 10" label. No issues found.
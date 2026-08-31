# Audit — Finance Tab

**Reviewed:** `allyvia-frontend/src/views/dashboard/Analytics/AnalyticsSection.tsx`, `allyvia-frontend/src/views/dashboard/Analytics/analyticsBuckets.ts`, `backend/app/analytics/views.py` (`PayablesByDueDateView`) — cross-checked against ALL-53's original finding (M4) and the backend's actual bucket-ordering behavior.
**Audited:** 2026-08-25, branch `nehalgarg2901/all-58-fix-ap-due-this-period-read-by-array-position-instead-of`
**Scope:** Finance tab "AP Due This Period" tile only (Dashboard → Analytics → Accounts Payable Summary chart's summary metric). This is a seed entry, not the full Finance tab inventory — the complete tile/chart/table sweep is ALL-54, still in progress.
**Verdict:** Mostly targeted fixes so far — one live, reachable bug (H1) and one display-masking issue (M2) found while walking Financial Statements, plus the already-fixed ALL-58 item. Not rewrite-level. No systemic/Critical issues found yet in the sub-tabs reviewed.

## High

### H1 — Cash Flow overstates "cash out" when a bill payment is voided

**File:** `backend/app/analytics/services.py`, `FinanceAnalyticsService.cash_flow_statement()`

**Problem:** The function computes `cash_out` from two sources: `QBBillPayment` (vendor payments) and `QBPurchase`. The `QBPurchase` query correctly filters `is_voided=False`, matching the `QBPayment` query used for `cash_in`. The `QBBillPayment` query does not — it aggregates `total_amount` over every bill payment in the date range regardless of voided status, even though `QBBillPayment.is_voided` exists as a real, actively-used field (set by the QuickBooks sync in `app/expense/services.py` when a bill payment is voided in QBO, and correctly filtered elsewhere in the codebase, e.g. `app/billpayment/views.py`'s stats endpoints).

**Impact:** Live and reachable, not latent — any time a bill payment is voided in QuickBooks within a company's selected date range, this inflates `cash_out`, which flows into three displayed values on the Financial Statements sub-tab: the "Total Cash Out" tile, the "Net Cash Flow" tile, and the Operating Activities row of the Cash Flow Statement table (`cash_flow?.operating_activities?.cash_out` / `net_operating`).

**Fix:** Add `is_voided=False` to the `QBBillPayment` filter in `cash_flow_statement()`, matching the pattern already used for `QBPurchase` and `QBPayment` in the same function.

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

## Summary table

| # | Sev | Issue | Fix |
|---|---|---|---|
| H1 | High | Cash Flow's "cash out" includes voided bill payments (`QBBillPayment` query missing `is_voided=False`) | Add the same `is_voided=False` filter already used for `QBPurchase`/`QBPayment` in the same function |
| M1 | Medium | "AP Due This Period" fell back to array position (`data[0]`) instead of an explicit `0` when the bucket label was missing | Extracted label-keyed lookup (`getBucketValueByLabel`) with an explicit `0` fallback; 4 regression tests added |
| M2 | Medium | Current Ratio / Debt to Equity show "0.00" instead of an undefined value when the denominator is zero or negative | Use the existing `ratioOf`/`formatRatio` helpers instead of inline computation; treat equity `<= 0` as undefined |
| L1 | Low | Balance Sheet card title's loading-state fallback uses the known UTC round-trip date pattern | Derive the fallback date from local Y/M/D instead of `toISOString()`, or show a loading state |

## Reviewed — no issues found

Tiles/charts traced and checked against their intended formula with nothing wrong found beyond what's listed above. Grouped by Finance-tab sub-tab; fill in as each is walked.

- **Financial Statements:** P&L KPI tiles + P&L Statement table — formulas verified in `backend/app/profit/services.py::_get_local_profit_and_loss` (via `analytics/metrics.py`): `revenue − cogs = gross_profit`, `revenue − total_expenses = net_income`, `operating_expenses = max(0, total_expenses − cogs)`. `net_operating_income` intentionally diverges from `net_income` only in the documented edge case where COGS exceeds total expenses — deliberate, not a bug. Gross Margin / Net Margin tiles correctly use `marginOf`/`formatPercent` (em-dash on zero revenue, verified against `financeFormat.test.ts`). Balance Sheet Assets/Liabilities/Equity tables + equation check — backend (`FinanceAnalyticsService.balance_sheet`, `app/analytics/services.py`) is explicit that figures are a live current-balance snapshot rather than a true historical point-in-time reconstruction (`basis`/`is_point_in_time`/`effective_date` fields), and the frontend correctly displays `effective_date` rather than misrepresenting the requested `as_of_date` as honored. See H1/M2/L1 above for what's not clean on this sub-tab.
- **Invoices:** _(not yet reviewed)_
- **Expenses:** _(not yet reviewed)_
- **Payments:** _(not yet reviewed)_
- **POS Sales:** _(not yet reviewed)_
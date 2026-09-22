# Audit — Finance Tab

**Reviewed:** all five Finance tab sub-tabs (`allyvia-frontend/src/views/finance/tabs/{FinancialStatements,Invoices,Expenses,Payments,POSSales}.tsx`) and their full data paths — Redux thunks in `store/slices/finance.ts`, API client methods in `src/api/finance.api.ts`, and the corresponding backend views/services in `backend/app/{profit,analytics,invoice,expense,payment,billpayment,pos}/`.
**Audited:** 2026-08-25 to 2026-08-31 (ALL-54 inventory, code-read), branch `nehalgarg2901/all-54-1-inventory-every-finance-tab-metric-tile-and-chart-into-an`
**Re-audited against ground truth:** 2026-09-07 (ALL-55/56/57), branch `sweep/b17-finance` (backend + frontend)
**Scope:** Full Finance tab inventory (ALL-54) — every metric tile, table, and chart across all five sub-tabs, verified against actual backend formulas and filtering logic; then every numeric row re-checked against a seeded tenant with hand-computed expectations (ALL-55).
**Verdict:** Of the 42 matrix rows, **36 are ✓ and 6 are ✗**. Every ✗ reproduced against the seeded tenant. H1, H2, H4, H5, M1, M2 and L1 are fixed; **H3 is confirmed but needs a product decision** (see below). Four new findings (N1–N4) came out of the ground-truth pass, including the ALL-57 headline: **the Finance tab renders no charts at all** — all four live in a sub-tab that is commented out. No systemic/Critical issues in the calculation layer: the arithmetic is centralised in `analytics/metrics.py` and, apart from H1, it is right.

## Audit matrix

This matrix is the per-metric verification-state inventory called for in ALL-54's original ticket text, tracked separately from the Critical/High/Medium/Low findings below. Severity describes *what's wrong*; Status describes *whether a row has been verified against ground truth*.

Rows are now resolved. `Observed` is what the code returned when run against the seeded tenant; `Expected` is the hand-computed value from `backend/app/tests/finance_ground_truth.py`, where every number is arithmetic written out by hand rather than captured from a run. Figures are the July window (`2026-07-01..2026-07-31`) unless a row says otherwise; rows that behave differently in the partial window (`2026-08-01..2026-08-15`) show both, separated by `/`.

**Two rows had the wrong expectation in the original matrix, not the wrong code.** Rows 24–26 (Paid/Unpaid/Overdue) were written as `status = paid` / `status = unpaid` counts; `InvoiceStatsView.get_stats()` actually counts on `balance` (`= 0`, `> 0`, and `> 0 AND due_date < today`). Counting on the money rather than on a free-text status string is the sounder rule — a QuickBooks invoice can carry `status = 'partial'` with a non-zero balance, as INV-3 in the seeded tenant does — so the code is right and the matrix has been corrected. Worth knowing when reading the tiles: **Overdue is a subset of Unpaid, not a fourth disjoint bucket**, so Paid + Unpaid = Total and adding Overdue to that sum double-counts.

| # | Metric | UI location | Component | Endpoint | Source fields | Expected formula | Observed | Expected | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Revenue | Financial Statements → P&L tiles | `FinancialStatements.tsx` | `/profit/profit_and_loss/` | `metrics.revenue_total()` inputs (QB invoice/sales revenue) | `revenue = metrics.revenue_total(company, start, end)` | 5800.00 | 5800.00 | ✓ | Formula read in `profit/services.py::_get_local_profit_and_loss`; no issue found in code — Verified against the seeded tenant, both windows. |
| 2 | COGS | Financial Statements → P&L tiles | `FinancialStatements.tsx` | `/profit/profit_and_loss/` | `metrics.cogs_total()` inputs | `cogs = metrics.cogs_total(company, start, end)` | 990.00 | 990.00 | ✓ | No issue found in code — bill 600 + purchase 300 + POS 90; voided purchase correctly excluded. |
| 3 | Gross Profit | Financial Statements → P&L tiles | `FinancialStatements.tsx` | `/profit/profit_and_loss/` | derived | `gross_profit = revenue - cogs` | 4810.00 | 4810.00 | ✓ | No issue found in code |
| 4 | Total Expenses | Financial Statements → P&L tiles | `FinancialStatements.tsx` | `/profit/profit_and_loss/` | `metrics.expenses_total()` inputs | `total_expenses = metrics.expenses_total(company, start, end)` | 1500.00 | 1500.00 | ✓ | No issue found in code — bills 1000 + non-voided purchases 500. |
| 5 | Operating Expenses | Financial Statements → P&L tiles | `FinancialStatements.tsx` | `/profit/profit_and_loss/` | derived | `operating_expenses = max(0, total_expenses - cogs)` | 510.00 / 0.00 | 510.00 / 0.00 | ✓ | Intentional floor at 0; documented edge case — Floor exercised: the partial window's COGS 220 exceeds payables 200 → 0.00, not −20.00. |
| 6 | Net Income | Financial Statements → P&L tiles | `FinancialStatements.tsx` | `/profit/profit_and_loss/` | derived | `net_income = revenue - total_expenses` | 4300.00 | 4300.00 | ✓ | No issue found in code |
| 7 | Net Operating Income | Financial Statements → P&L tiles | `FinancialStatements.tsx` | `/profit/profit_and_loss/` | derived | `net_operating_income = gross_profit - operating_expenses` | 4300.00 / 918.00 | 4300.00 / 918.00 | ✓ | Diverges from Net Income only when COGS > total expenses (floor case) — deliberate — Diverges from net income (938.00) in the partial window exactly as documented. |
| 8 | Gross Margin % | Financial Statements → P&L tiles | `FinancialStatements.tsx` | `/profit/profit_and_loss/` | derived | `marginOf(gross_profit, revenue)` via `formatPercent` | 82.93% | 82.93% | ✓ | Em-dash on zero revenue, verified against `financeFormat.test.ts` — Returns unquantized Decimal (82.93103448275862); the UI formats. See N2. |
| 9 | Net Margin % | Financial Statements → P&L tiles | `FinancialStatements.tsx` | `/profit/profit_and_loss/` | derived | `marginOf(net_income, revenue)` via `formatPercent` | 74.14% | 74.14% | ✓ | Same helper as #8 — Same unquantized note as #8. See N2. |
| 10 | Total Assets | Financial Statements → Balance Sheet | `FinancialStatements.tsx` | `/profit/balance-sheet/` | `QBAccount.current_balance`, account type | Sum of `current_balance` across asset-type accounts | 9000.00 | 9000.00 | ✓ | Deliberately a current-balance snapshot, not point-in-time — see `basis`/`is_point_in_time` fields — current 7000 + fixed 2000; inactive ACC-STALE (9999.00) correctly excluded. |
| 11 | Total Liabilities | Financial Statements → Balance Sheet | `FinancialStatements.tsx` | `/profit/balance-sheet/` | `QBAccount.current_balance`, account type | Sum across liability-type accounts | 3700.00 | 3700.00 | ✓ | Same snapshot caveat as #10 — current 1200 + long-term 2500. |
| 12 | Total Equity | Financial Statements → Balance Sheet | `FinancialStatements.tsx` | `/profit/balance-sheet/` | `QBAccount.current_balance`, account type | Sum across equity-type accounts | 5300.00 | 5300.00 | ✓ | Same snapshot caveat as #10; equation check (Assets = Liabilities + Equity) also to be verified here — Equation checks: 3700 + 5300 = 9000. `equation_balanced` true. |
| 13 | Balance Sheet title date | Financial Statements → Balance Sheet card | `FinancialStatements.tsx` (line 241) | `/profit/balance-sheet/` | `balanceSheet.effective_date` | Display `effective_date` from backend; loading-state fallback is local "today" | effective_date 2026-09-08 | today, not as_of_date | ✓ | See L1 — loading fallback uses UTC-shifted `toISOString()` date — Backend reports `is_point_in_time: false` and today's `effective_date` honestly. Loading fallback fixed (L1). |
| 14 | Current Ratio | Financial Statements → ratio tiles (line 47) | `FinancialStatements.tsx` | `/profit/balance-sheet/` | `currentAssets`, `currentLiabilities` | Should route through `ratioOf(currentAssets, currentLiabilities)` | — (was 0.00) | — | ✓ | See M2 — inline calc shows "0.00" instead of undefined when liabilities are 0 — Fixed: M2. `ratioOf`/`formatRatio`; ordinary case 7000/1200 = 5.83. |
| 15 | Debt to Equity | Financial Statements → ratio tiles (line 48) | `FinancialStatements.tsx` | `/profit/balance-sheet/` | `totalLiabilities`, `totalEquity` | Should route through `ratioOf(totalLiabilities, totalEquity)` | — (was 0.00) | — | ✓ | See M2 — same bug; negative equity also falls into "0.00" — Fixed: M2. Negative equity now undefined, not 0.00; ordinary case 3700/5300 = 0.70. |
| 16 | Cash In (Operating) | Financial Statements → Cash Flow | `FinancialStatements.tsx` | `/profit/cash-flow/` | `QBPayment.amount`, `is_voided` | Sum of `QBPayment` where `is_voided=False`, in range | 1500.00 | 1500.00 | ✓ | Correctly filtered; no issue found — Voided PAY-3 (5000.00) correctly excluded. |
| 17 | Cash Out (Operating) | Financial Statements → Cash Flow | `FinancialStatements.tsx` | `/profit/cash-flow/` | `QBPurchase.amount`, `QBBillPayment.total_amount`, `is_voided` | Sum of `QBPurchase` (`is_voided=False`) + `QBBillPayment` (should also be `is_voided=False`) | 1450.00 | 1200.00 | ✗ | See H1 — `QBBillPayment` query is missing the `is_voided=False` filter — **H1 confirmed** — voided BP-2 (250.00) counted. Fixed on `sweep/b17-finance`. |
| 18 | Net Cash Flow | Financial Statements → Cash Flow | `FinancialStatements.tsx` | `/profit/cash-flow/` | derived | `cash_in - cash_out` | 50.00 | 300.00 | ✗ | Inherits H1's overstatement via #17 — **H1** downstream. Fixed. |
| 19 | P&L Statement table | Financial Statements → P&L table | `FinancialStatements.tsx` | `/profit/profit_and_loss/`, `/profit/cost_of_goods_and_services/`, `/profit/gross_profit/` | same as #1-7 | Full line-item breakdown of #1-7 | see #1–7 | see #1–7 | ✓ | No issue found beyond the tile-level rows above |
| 20 | Balance Sheet table | Financial Statements → Balance Sheet table | `FinancialStatements.tsx` | `/profit/balance-sheet/` | same as #10-13 | Line items + Assets = Liabilities + Equity check | see #10–13 | see #10–13 | ✓ | No issue found beyond #10-13 |
| 21 | Cash Flow Statement table | Financial Statements → Cash Flow table | `FinancialStatements.tsx` | `/profit/cash-flow/` | same as #16-18 | Operating Activities row breakdown | 1450.00 | 1200.00 | ✗ | See H1 — inherits #17's overstatement — **H1** downstream. Fixed. |
| 22 | Total Invoices | Invoices → KPI tiles | `Invoices.tsx` | `/invoice/stats/` | `QBInvoice` count | Count of `QBInvoice` where `is_voided=False`, in range | 3 | 3 | ✓ | `InvoiceStatsView.get_stats()` correctly excludes voided — Voided INV-4 excluded from the tiles. |
| 23 | Total Amount | Invoices → KPI tiles | `Invoices.tsx` | `/invoice/stats/` | `QBInvoice.amount` | Sum of `QBInvoice.amount` where `is_voided=False`, in range | 5000.00 | 5000.00 | ✓ | Correctly filtered |
| 24 | Paid | Invoices → KPI tiles | `Invoices.tsx` | `/invoice/stats/` | `QBInvoice.status` | Count/sum where `status=paid`, `is_voided=False` | 1 | 1 | ✓ | No issue found — Counted on `balance = 0`, **not** `status` — see the revised-expectation note below the matrix. |
| 25 | Unpaid | Invoices → KPI tiles | `Invoices.tsx` | `/invoice/stats/` | `QBInvoice.status` | Count/sum where `status=unpaid`, `is_voided=False` | 2 | 2 | ✓ | No issue found — Counted on `balance > 0`; includes the overdue one, so Paid + Unpaid = Total. |
| 26 | Overdue | Invoices → KPI tiles | `Invoices.tsx` | `/invoice/stats/` | `QBInvoice.status`, due date | Count/sum where `status=overdue`, `is_voided=False` | 1 | 1 | ✓ | No issue found — `balance > 0 AND due_date < today`. A subset of Unpaid, not a disjoint bucket. |
| 27 | Invoice Table | Invoices → table | `InvoiceTable.tsx` | `/invoice/` | `QBInvoice.*`, `is_voided` | Should default-exclude voided invoices, matching the KPIs above it | 14999.00 over 4 rows | 5000.00 over 3 rows | ✗ | See H2 — `InvoiceListView` has no default `is_voided` exclusion; status chip never shows voided — **H2 confirmed** — the voided 9999.00 invoice was in the table but not the tiles. Fixed. |
| 28 | Total Expenses | Expenses → KPI tiles | `ExpenseKPIs.tsx` | expense stats endpoint | `QBBill.amount`, `QBPurchase.amount`, `is_voided` | `total_bills + total_purchases` (`QBPurchase` filtered `is_voided=False`; `QBBill` has no such field) | 1500.00 | 1500.00 | ✓ | See H3 — table below only shows Bills, not Purchases — KPI itself correct; H3 is that the table below it shows only the Bills half. |
| 29 | Expense Count | Expenses → KPI tiles | `ExpenseKPIs.tsx` | expense stats endpoint | `QBBill`, `QBPurchase` counts | `bill_count + purchase_count` | 4 | 4 | ✓ | See H3 — 2 bills + 2 non-voided purchases. |
| 30 | Average Expense | Expenses → KPI tiles | `ExpenseKPIs.tsx` | expense stats endpoint | derived | `total_expenses / expense_count` (guarded against 0) | 375.00 | 375.00 | ✓ | No issue found in the formula itself — 1500 / 4. |
| 31 | Top Category | Expenses → KPI tiles | `ExpenseKPIs.tsx` | expense stats endpoint | Bills vs Purchases totals | Simple binary comparison of Bills total vs Purchases total | Bills | Bills | ✓ | UX-naming observation only — not real QB categories, working as coded — 1000 > 500, working as coded. |
| 32 | Expense Table | Expenses → table | `ExpenseTable.tsx` | `/expense/` (Bills) | `QBBill.*` only | Should reflect the same Bills+Purchases scope as the KPIs above it | Bills only | Bills + Purchases | ✗ | See H3 — `fetchPurchasesList` exists but is never dispatched anywhere in the UI — **H3 confirmed** by inspection — needs a product decision, see below. Not fixed. |
| 33 | Total Payments | Payments → KPI tiles | `Payments.tsx` | `/payment/summary/` | `QBPayment.amount`, POS sales, `is_voided` | `sum(QBPayment, is_voided=False) + pos_sales_total` | 2300.00 | 2300.00 | ✓ | Correctly filtered; intentionally blends QB payments with completed POS sales — QB 1500 + POS 800; voided PAY-3 excluded. |
| 34 | Payment Count | Payments → KPI tiles | `Payments.tsx` | `/payment/summary/` | `QBPayment` count, POS sales count | `qb_count + pos_count` | 6 | 6 | ✓ | Same blended-source note as #33 — 2 QB + 4 POS. |
| 35 | Average Payment | Payments → KPI tiles | `Payments.tsx` | `/payment/summary/` | derived | `total_payments / payment_count` (guarded against 0) | 383.33 | 383.33 | ✓ | No issue found — 2300 / 6. |
| 36 | Success Rate | Payments → KPI tiles | `Payments.tsx` | `/payment/summary/` | `QBPayment.unapplied_amount`, POS count | `(payments with unapplied_amount=0 + pos_count) / payment_count * 100` | 83.33% | 83.33% | ✓ | No issue found — (1 applied QB + 4 POS) / 6. |
| 37 | Payment Table | Payments → table | `PaymentTable.tsx` | `/payment/` | `QBPayment.*`, `is_voided` | Should default-exclude voided payments, matching the KPIs above it | 6500.00 over 3 rows | 1500.00 over 2 rows | ✗ | See H5 — `PaymentListView` has no `is_voided` handling at all, not even an override param; no voided indicator in the table — **H5 confirmed** — the voided 5000.00 payment was in the table but not the tiles. Fixed. |
| 38 | Recent Sales | POS Sales → KPI tiles | `POSSales.tsx` | `/pos/recent-orders/` | `orders.length` (client-computed) | Count of the last 10 orders returned | n/a | last 10 | ✓ | Intentionally fixed at last-10, not date-scoped — see backend test `test_recent_orders_returns_last_ten_scoped_to_company` — Client-computed over the fixed last-10 window; intentional. |
| 39 | Total Revenue | POS Sales → KPI tiles | `POSSales.tsx` | `/pos/recent-orders/` | `order.total` (client-computed) | Sum of `order.total` across the returned orders | n/a | sum of last 10 | ✓ | Same fixed-window caveat as #38 — Same fixed-window caveat. |
| 40 | Cash Sales | POS Sales → KPI tiles | `POSSales.tsx` | `/pos/recent-orders/` | `order.paymentMethod` (client-computed) | Count where `paymentMethod === 'cash'` | n/a | count where cash | ✓ | Same fixed-window caveat as #38 — Same fixed-window caveat. |
| 41 | Card Sales | POS Sales → KPI tiles | `POSSales.tsx` | `/pos/recent-orders/` | `order.paymentMethod` (client-computed) | Count where `paymentMethod === 'card'` | n/a | count where card | ✓ | Same fixed-window caveat as #38 — Same fixed-window caveat. |
| 42 | POS Sales table (Recent 10) | POS Sales → table | `POSSales.tsx` | `/pos/recent-orders/` | `Order.*` | `recent_orders(company, limit=10)`, no date-range param | n/a | recent_orders(limit=10) | ✓ | Intentional design, test-confirmed — not a bug — Intentional design, test-confirmed. |

## High

### H1 — Cash Flow overstates "cash out" when a bill payment is voided

**Status: FIXED** on `sweep/b17-finance`. Reproduced against the seeded tenant first — a voided 250.00 bill payment (BP-2) inside the window reported vendor payments of 950.00 instead of 700.00, cash out 1450.00 instead of 1200.00, and net cash flow 50.00 instead of 300.00. `is_voided=False` added to the `QBBillPayment` filter in `cash_flow_statement()`. Regression tests in `tests/test_finance_ground_truth_metrics.py::CashFlowTests`, including a delta test that voids BP-1 and asserts cash out falls by exactly its amount (before the fix, voiding it changed cash out by 0.00 — proving the filter was ignored entirely, not merely mis-scoped).

**File:** `backend/app/analytics/services.py`, `FinanceAnalyticsService.cash_flow_statement()`

**Problem:** The function computes `cash_out` from two sources: `QBBillPayment` (vendor payments) and `QBPurchase`. The `QBPurchase` query correctly filters `is_voided=False`, matching the `QBPayment` query used for `cash_in`. The `QBBillPayment` query does not — it aggregates `total_amount` over every bill payment in the date range regardless of voided status, even though `QBBillPayment.is_voided` exists as a real, actively-used field (set by the QuickBooks sync in `app/expense/services.py` when a bill payment is voided in QBO, and correctly filtered elsewhere in the codebase, e.g. `app/billpayment/views.py`'s stats endpoints).

**Impact:** Live and reachable, not latent — any time a bill payment is voided in QuickBooks within a company's selected date range, this inflates `cash_out`, which flows into three displayed values on the Financial Statements sub-tab: the "Total Cash Out" tile, the "Net Cash Flow" tile, and the Operating Activities row of the Cash Flow Statement table (`cash_flow?.operating_activities?.cash_out` / `net_operating`).

**Fix:** Add `is_voided=False` to the `QBBillPayment` filter in `cash_flow_statement()`, matching the pattern already used for `QBPurchase` and `QBPayment` in the same function.

### H2 — Invoice table shows voided invoices with no indication, inconsistent with the KPI tiles above it

**Status: FIXED (backend) on `sweep/b17-finance`.** Reproduced: for the seeded July window the table returned 4 rows totalling 14,999.00 while the tiles above it said 3 rows and 5,000.00 — the 9,999.00 voided INV-4. `InvoiceListView` now defaults to `is_voided=False`, with the existing query param kept as an override in both directions. The defence-in-depth half — flagging voided rows visually in `InvoiceTable.tsx` — is **not** done, and is only reachable now by explicitly passing `is_voided=true`.

**File:** `backend/app/invoice/views.py`, `InvoiceListView.get()` (compare to `InvoiceStatsView.get_stats()`)

**Problem:** `InvoiceStatsView.get_stats()` explicitly excludes voided invoices (`base_qs = QBInvoice.objects.filter(company=company, is_voided=False)`), and its own code comment states the intent plainly: *"Match the invoice list view's filtering: exclude voided invoices... so the KPIs agree with the table instead of showing all-time totals."* But `InvoiceListView.get()` only filters on `is_voided` if the request explicitly passes that query param — its base queryset (`QBInvoice.objects.filter(company=company)`) has no default exclusion. The frontend (`InvoicesTab.tsx`) never sends `is_voided` on its initial load, so by default the Invoice Table shows voided invoices right alongside real ones. Worse: `QBInvoiceSerializer` does expose an `is_voided` field, but `InvoiceTable.tsx`'s status chip only reads `invoice.status` (paid/unpaid/overdue) — a voided invoice renders with no visual indication it's void at all, indistinguishable from a real one.

**Impact:** Live and reachable — any company with a voided invoice in the selected date range sees a table row count and total that don't match the KPI tiles above it, and that voided invoice looks identical to a real unpaid/overdue one. A merchant could reasonably act on it (e.g. follow up for payment on an invoice that no longer exists).

**Fix:** Default `InvoiceListView`'s base queryset to `is_voided=False` (matching `InvoiceStatsView`'s own stated intent), keeping the existing explicit `is_voided` query param as an override for anyone who deliberately wants to see voided invoices. Separately, worth having `InvoiceTable.tsx` visually flag `is_voided` rows regardless, as a defense-in-depth measure.

### H3 — Expense table only shows Bills, while the Expense KPIs above it include Purchases too

**Status: CONFIRMED, NOT FIXED — needs a product decision.** The KPI side is verified correct against ground truth (rows 28–30: total 1500.00 = bills 1000.00 + non-voided purchases 500.00, count 4, average 375.00), so the mismatch is entirely that the table renders only the Bills half. The audit offers three fixes — merge Purchases into the table, wire up the existing `fetchPurchasesList` thunk as a second section, or scope the KPIs to Bills only and rename them. These are not equivalent: the third changes what the merchant is told their expenses are. Left for Nigel rather than guessed at.

**File:** `allyvia-frontend/src/ui-component/finance/tables/ExpenseTable.tsx`; `store/slices/finance.ts` (`fetchExpensesList`, `fetchPurchasesList`); `backend/app/expense/services.py` (`_get_local_expense_summary`, `_get_local_expense_stats`)

**Problem:** `ExpenseKPIs` (Total Expenses, Expense Count, Average Expense) is backed by `expenseStats`, and the backend computes that as `total_bills + total_purchases` — it queries both `QBBill` and `QBPurchase` and sums them (correctly: `QBBill` has no `is_voided` field so it's unfiltered by design, `QBPurchase` is correctly filtered `is_voided=False`). But `ExpenseTable` only ever dispatches `fetchExpensesList`, which calls `FinanceAPI.Expense.getBills` — Purchases are never fetched or rendered in the table at all. A separate `fetchPurchasesList` thunk already exists in `finance.ts` (and `ExpenseAPI.getPurchases` exists in the API client) but has zero callers anywhere under `src/views/` or `src/ui-component/finance/` — confirmed by search, it's dead code as far as the UI is concerned.

**Impact:** Live and reachable — the KPI tiles and the table underneath them are answering two different questions. Any expense recorded in QuickBooks as a Purchase rather than a Bill counts toward Total Expenses / Expense Count / Average Expense but is completely invisible in the table below it — a merchant has no way to see what actually makes up part of their own "Total Expenses" figure.

**Fix:** Either merge Purchases into the Expense table (labeling the source per row), or wire up the already-existing `fetchPurchasesList` thunk as a second table/section, or explicitly scope the KPIs to Bills only and rename them so the mismatch can't happen. Any of the three keeps the KPIs and the table answering the same question.

### H4 — Raw backend exception text is leaked to the client throughout the Expense endpoints

**Status: FIXED** via ALL-155, and **much wider than this file**. Grepping the rest of the backend found the same pattern at **140 client-facing sites across 25 files** — `analytics/views.py` (19) and `account/views.py` (7) as B02 suspected, plus one site in `documents/views.py` that returned a full `traceback.format_exc()` to the browser. All 140 now route through a new `common/api_errors.py`, which logs the live exception server-side with its stack trace and returns a fixed message plus a stable `error_code`; response shape is preserved (`{"detail": …}` callers still get `detail`, gcalendar still forwards the upstream HTTP status). ~27 further sites were deliberately left alone: they catch our *own* domain exceptions, whose message text is the API contract rather than a leak. `tests/test_no_leaked_exception_text.py` is the guard — it re-derives the leak set from the AST on every run, self-tests against a planted leak so it cannot pass vacuously, and resolves exception names through each file's imports (a first attempt that matched on bare class names declared `googleapiclient`'s `HttpError` to be ours and silently stopped reporting four real leaks).

**File:** `backend/app/expense/views.py`

**Problem:** This file returns `str(e)` (or an f-string wrapping it) directly in the client-facing error response at 18 separate `except Exception` sites — e.g. lines 150, 200, 268, 334, 383, 443, 490, 537, 788, 1402, 1516 (confirmed by search across the whole file). This is the same leaked-exception-text bug class already tracked from ALL-53's H4, but that finding only covered `DashboardSummaryView` — this one file has it at more than a dozen separate call sites, across nearly every Expense endpoint (stats, categories, top expenses, trend, breakdown, and more).

**Impact:** Live and reachable on any unhandled server-side error (bad data, a DB timeout, a QuickBooks API failure) — leaks internal implementation details (stack-trace fragments, model/field names, occasionally raw values) straight to the browser, and returns a different, non-actionable error string to the user for every distinct failure instead of one clear message.

**Fix:** Replace `str(e)` in the client-facing response with a fixed, generic message at each site, and log the real exception server-side (with stack trace) instead. Given how many sites repeat the identical pattern, this is worth doing as one pass across the whole file rather than endpoint-by-endpoint.

### H5 — Payment table has no voided-payment filtering or indication at all

**Status: FIXED (backend) on `sweep/b17-finance`.** Reproduced: the table returned 3 rows totalling 6,500.00 against a QB tile figure of 1,500.00 — the 5,000.00 voided PAY-3. `PaymentListView` now defaults to `is_voided=False` and gained the `is_voided` override it never had, documented in its swagger parameters. As with H2, the visual voided indicator in `PaymentTable.tsx` is not done.

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

**Status: FIXED** on `sweep/b17-finance`. Both ratios now go through the existing `ratioOf`/`formatRatio` helpers, so an undefined ratio renders as an em dash. Because `ratioOf` already treats `denominator <= 0` as undefined, the negative-equity case is covered by the same change. One thing the audit did not flag: the tile `theme` was `parseFloat(currentRatio) >= 1.0 ? 'success' : 'alert'`, and `parseFloat('—')` is `NaN`, so an undefined ratio would have rendered in the error colour — reading as "bad" rather than "not computable". Both tiles now fall back to the neutral theme when the ratio is null.

**File:** `allyvia-frontend/src/views/finance/tabs/FinancialStatements.tsx`, lines 47–48

**Problem:** Both ratios are computed inline —
`currentLiabilities > 0 ? (currentAssets / currentLiabilities).toFixed(2) : '0.00'` and
`totalEquity > 0 ? (totalLiabilities / totalEquity).toFixed(2) : '0.00'` —
instead of going through the codebase's existing `ratioOf`/`formatRatio` helpers (`src/utils/financeFormat.ts`), which already render an em dash ("—") for an undefined/zero-denominator ratio specifically to avoid a fake-zero reading elsewhere in the app (see `financeFormat.test.ts`'s "empty-inventory average" case). This component reintroduces the exact bug class those helpers exist to prevent. It's also stricter than intended: the guard is `> 0`, not `!== 0`, so **negative** equity — a real and meaningful state (the business is underwater) — falls into the same `'0.00'` bucket as zero equity, reading as "no debt relative to equity" when the true situation is the opposite.

**Impact:** A company with zero current liabilities or zero/negative equity sees a falsely reassuring "0.00" on both ratio tiles instead of an undefined indicator, which could misread as "no risk" rather than "not computable" or "negative."

**Fix:** Replace both inline computations with `ratioOf(currentAssets, currentLiabilities)` / `ratioOf(totalLiabilities, totalEquity)` and render through `formatRatio`, matching the pattern already established elsewhere in `financeFormat.ts`. For the equity case, treat `totalEquity <= 0` as undefined (not just `=== 0`) so negative equity doesn't fall through to a "0.00" reading.

## Low

### L1 — Balance Sheet title falls back to a UTC-shifted date

**Status: FIXED** on `sweep/b17-finance`. Added `localToday()` to `utils/financeFormat.ts`, building the date from the local `Date`'s own Y/M/D, and used it as the fallback. Tested at 20:30 on 31 July in a UTC-4 zone, where the old `toISOString()` path names 1 August.

**File:** `allyvia-frontend/src/views/finance/tabs/FinancialStatements.tsx`, line 241

**Problem:** `balanceSheet?.effective_date || new Date().toISOString().split('T')[0]` — the fallback (used only when `effective_date` hasn't loaded yet) round-trips through UTC via `toISOString()`, the same known-bad pattern documented in the bug-pattern table (`dashboardRange.ts`'s C1). For browser timezones ahead of UTC, this can display a date one day off from local "today."

**Impact:** Cosmetic only — a card title showing a possibly-wrong date for a brief moment before real data loads. No calculation is affected; `effective_date` itself (once loaded) comes correctly from the backend, not from this fallback.

**Fix:** Build the fallback date from the local `Date` object's own year/month/day (same fix pattern as `dashboardRange.ts`'s C1), or simply show a loading state instead of a fallback date.

### L2 — `fetchExpensesList`'s missing-date fallback uses the known UTC round-trip pattern, but is currently unreachable

**File:** `allyvia-frontend/src/store/slices/finance.ts`, `fetchExpensesList` thunk

**Problem:** If ever dispatched without `startDate`/`endDate` and without `state.finance.dateRange` set, the thunk falls back to `new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0]` / `new Date().toISOString().split('T')[0]` — the same UTC-shift pattern tracked elsewhere in the bug-pattern table (e.g. L1 above, `dashboardRange.ts`'s C1).

**Impact:** Currently latent, not live. Every call site that dispatches `fetchExpensesList` — `ExpenseTable.tsx`, `Expenses.tsx`, `Transactions.tsx`, and `views/finance/index.tsx` — already guards on `startDate && endDate` being present before dispatching (confirmed by checking all four call sites), so this fallback branch is not reachable through any path in the current UI. Flagging it because it's defensive code sitting on a known-bad pattern — it would misbehave silently the moment a future caller ever omits dates.

**Fix:** Low priority given it's unreachable today. If touched, replace with a timezone-safe local-date fallback (same fix as L1), or remove the fallback entirely and let the thunk fail loudly on missing dates, matching how other required params are handled elsewhere in this file.

## Audit outcome (ALL-55 / ALL-56 / ALL-57)

### The ground-truth tenant (ALL-55)

`backend/app/tests/finance_ground_truth.py` seeds a small, fully-known tenant and states the expected value of every metric for two windows. Every number there is arithmetic done by hand from the seeded rows and written out with its working — never output captured from a run, because a value copied from the code under test cannot disagree with it.

The two windows are chosen to disagree with each other:

* **`FULL_MONTH` 2026-07-01..2026-07-31** — a completed month with rows on *both* boundary days, so an off-by-one shows up as a changed total rather than as nothing.
* **`PARTIAL` 2026-08-01..2026-08-15** — a part-period whose COGS (220.00) deliberately **exceeds** its payables (200.00). This is the one case where the operating-expense floor changes the answer, and where `net_operating_income` (918.00) is supposed to diverge from `net_income` (938.00). A window that only exercised the ordinary case would let a regression in the floor through.

Every row is either a plain contributor or a deliberate trap for a known bug class — a voided row of each kind (H1/H2/H5), a 20:00 ET sale on the last day of the month (timezone bucketing), a `source="quickbooks"` mirror (ALL-110 double-count), a fully-refunded sale that must still count as a sale valued at zero (ALL-87), a `cost_price` of `0.00` (ALL-91 uncosted COGS), and an inactive account with a large balance.

Re-runnable from scratch: `seed_finance_ground_truth(company)` takes a company and creates everything.

**Not cross-checked against QuickBooks' own reports.** ALL-55 asks for this where data originates in QB, and it needs a live QuickBooks connection with a real realm — production credentials this session cannot and should not use. The seeded tenant uses the QB *mirror tables* (`QBInvoice`, `QBBill`, `QBPurchase`, `QBPayment`, `QBBillPayment`, `QBAccount`), so it validates every formula the Finance tab computes **downstream of the sync**; it does not validate the sync itself. See `docs/finance-ground-truth-qb-crosscheck.md` for the runbook to close that gap.

### ALL-57: the Finance tab renders no charts

The ALL-54 matrix has 42 rows and not one is a chart, which turns out not to be an omission. **None of the five live Finance sub-tabs renders a chart.** `react-apexcharts` is the project's only chart library and no rendered Finance tab imports it; the tabs are KPI tiles and tables throughout.

All four Finance charts live in `src/views/finance/tabs/Overview.tsx` (632 lines), which is not rendered:

* `src/views/finance/index.tsx:279–288` — the Overview `<Tab>` is commented out (`{/* Overview tab - Hidden but not deleted */}`).
* `src/views/finance/index.tsx:338–341` — its `<TabPanel>` is commented out.
* `OverviewTab` is **never imported** (the imports at lines 45–49 cover only the five live tabs), so uncommenting the panel as-is would not compile.
* `src/views/finance/index.tsx:147–158` — the whole `useEffect` that fetched the chart data is commented out too, so the charts would render empty even once mounted.

The dead charts: Combined Revenue vs Expenses (`line`, via `FinancialTrendsChart`), Expense Categories Distribution (`pie`, ← `GET /expense/breakdown/`), Payment Methods Distribution (`donut`, ← `GET /payment/split/`), and Invoice Aging Analysis (`bar`, ← `GET /invoice/aging/`).

**So ALL-57 as written cannot be completed** — there is no rendered chart whose data, mapping and rendering layers can be classified. The finding is that the charts are *absent*, not broken, and re-enabling a tab someone deliberately hid is a product call, not an audit one. ALL-15's headline ("fix the broken charts") most likely refers to these. Recommended next step: decide whether Overview comes back, and if so treat it as its own ticket — it needs the import restored, the fetch `useEffect` restored, and then a real data-layer audit of the four charts against the ground-truth tenant.

### N1 — Cash flow, balance sheet and invoice stats serialise money as `float`

**Files:** `backend/app/analytics/services.py` (`cash_flow_statement`, `balance_sheet`); `backend/app/invoice/views.py` (`InvoiceStatsView.get_stats`)

Every money value in these three responses is converted with `float()` before serialisation — `float(cash_in)`, `float(total_assets)`, `float(stats["total_amount"])` and so on. The P&L path does not do this: `_get_local_profit_and_loss` keeps `Decimal` and `.quantize(Decimal("0.01"))`s each field, which is the pattern the rest of the finance layer follows.

**Impact: Low-to-Medium, and lower than it first looks.** The arithmetic itself is done in `Decimal` and converted once at the boundary, so there is no accumulating drift inside these endpoints, and 2-decimal values in the magnitudes a merchant sees round-trip through a double without visible error. What it does do is give up the precision guarantee at exactly the point the frontend picks the numbers up and does arithmetic on them — the M2 ratio tiles divide two of these floats, and any future subtraction of two of them (an "outstanding vs collected" difference, say) can surface a `0.30000000000000004`. It is also an inconsistency for its own sake: two endpoints on the same tab describe the same kind of quantity in two different JSON types, and `DecimalField` serialisation is already an established convention here (the M5 bug class in this document).

**Suggested fix:** return quantized `Decimal` from these three, matching `_get_local_profit_and_loss`. Worth checking the frontend types alongside it, since the TS side currently receives `number` and would start receiving decimal strings.

### N2 — Margin percentages are returned unquantized while every sibling field is quantized

**File:** `backend/app/analytics/metrics.py` (`gross_margin_pct`, `net_margin_pct`)

Against the ground-truth tenant these return `82.93103448275862` and `74.13793103448276` — full `Decimal` division precision, 14 decimal places. Every other field in the same P&L response is `.quantize(Decimal("0.01"))`d.

**Impact: cosmetic.** The values are mathematically correct and `formatPercent` rounds for display, so nothing renders wrong today. It is noted because it is the same class of inconsistency as N1 (one field in a response following a different convention from its neighbours), and because a 14-decimal percentage in an API response invites a consumer to render it raw.

### N3 — Nine chart components exist that nothing renders, three of them near-duplicates

Beyond the dead Overview tab, `src/ui-component/finance/charts/` holds `CombinedRevenueExpenseChart.tsx`, `ExpenseChart.tsx` and `RevenueChart.tsx` with **zero importers anywhere under `src/`** — and `CombinedRevenueExpenseChart.tsx` exports a function literally named `FinancialTrendsChart`, making it a near-duplicate of the `FinancialTrendsChart.tsx` beside it. Under `src/ui-component/analytics/finance/charts/`, seven of nine components are reachable only through a barrel re-export (a barrel export is not an importer): `ExpenseTrendsChart`, `PaymentTrendsChart`, `AccountBalancesChart`, `DistributionChart`, `InvoiceDistribution`, `TopExpenses` and `FinanceOverduePending`. Only `ExpenseBreakdown` and `FinanceRevenueProfitTrend` are live, and only from the **Analytics** tab's widget registry.

**Impact:** no user-visible defect. It matters for this audit because "audit every Finance chart" is unanswerable while nine chart components sit in the tree with no rendered path — and because ALL-89 already found this exact hazard once (a money formula copied into four places, two dead and one silently wrong). Duplicated chart code is the same trap.

### N4 — The Finance page fetches five payloads no Finance tab reads

`src/views/finance/index.tsx` dispatches these on mount or tab switch, and none of the five rendered tabs selects them:

| Dispatch | Endpoint | Consumed by |
|---|---|---|
| `fetchInvoiceAgingAsync()` (`index.tsx:143`, **every** tab) | `GET /invoice/aging/` | dead `Overview.tsx`, and the Dashboard's `AnalyticsSection.tsx` |
| `fetchAnalyticsSummary(...)` (`index.tsx:137`, every tab) | `GET /analytics/summary/` | Dashboard `AnalyticsSection.tsx` only |
| `fetchPaymentStatistics(...)` (`index.tsx:193`, `:220`) | `GET /payment/stats/` | Analytics widgets only |
| `fetchAccountSummary(...)` (`index.tsx:168`) | `GET /account/summary/` | dead `Overview.tsx`, orphan `AccountBalancesChart` |
| `fetchInvoiceSuggestions()` (`index.tsx:177`) | `GET /invoice/suggestions/` | **nothing anywhere in `src/`** |

**Impact:** wasted round trips on every Finance tab view, one of them (`/invoice/aging/`) on every single tab switch, for data the page then drops. Conversely the thunks that *would* feed the charts (`fetchExpenseBreakdown`, `fetchTopExpenses`, `fetchExpenseTrend`, `fetchPaymentSplit`, `fetchRevenueSeries`) are not dispatched at all — they are in the commented-out block. Cheap to fix once the Overview decision in ALL-57 is made, since that decision determines which of these become live rather than dead.

### Regression tests (ALL-59)

* `backend/app/tests/finance_ground_truth.py` — the dataset and the hand-computed expectations.
* `backend/app/tests/test_finance_ground_truth_metrics.py` — 27 tests / 20 subtests over revenue, COGS, expenses, the P&L identity and its opex floor, margins, invoice KPIs, payment KPIs, cash flow and the balance sheet.
* `backend/app/tests/test_finance_voided_row_consistency.py` — 6 tests pinning that each list view and the KPI strip above it count the same rows (H2, H5).
* `backend/app/tests/test_no_leaked_exception_text.py` + `test_api_error_responses.py` — the H4/ALL-155 guard and its runtime proof.
* `src/utils/financeFormat.test.ts` — `localToday` (L1) and the ratio tiles (M2).

All five are registered in **both** hand-maintained allowlists in `.github/workflows/backend-tests.yml` (the `manage.py test` list and the `pytest` list), since CI runs named modules rather than discovering them. The guard is a `unittest.TestCase` for the same reason: Django's runner collects nothing else, so as bare pytest functions it would have been silently skipped by half of CI.

## Summary table

| # | Sev | Issue | Fix | Status |
|---|---|---|---|---|
| H1 | High | Cash Flow's "cash out" includes voided bill payments (`QBBillPayment` query missing `is_voided=False`) | Add the same `is_voided=False` filter already used for `QBPurchase`/`QBPayment` in the same function | ✓ Fixed |
| H2 | High | Invoice table shows voided invoices with no visual indication, inconsistent with the KPI tiles above it | Default `InvoiceListView` to `is_voided=False`, matching `InvoiceStatsView`'s own stated intent; flag voided rows in the table regardless | ✓ Fixed (backend; no voided badge in the table) |
| H3 | High | Expense table (Bills only) doesn't match Expense KPIs (Bills + Purchases); `fetchPurchasesList` exists but is never dispatched | Merge/expose Purchases in the table, wire up the existing thunk, or scope the KPIs to Bills only | ✗ **Needs a product decision** |
| H4 | High | Raw exception text (`str(e)`) leaked to the client at 18 sites in `expense/views.py` | Return a generic error message at each site; log the real exception server-side | ✓ Fixed — widened to 140 sites in 25 files (ALL-155) |
| H5 | High | Payment table has no `is_voided` filtering or override param at all, unlike Invoices | Default `PaymentListView` to `is_voided=False`; flag voided rows in `PaymentTable.tsx` | ✓ Fixed (backend; no voided badge in the table) |
| M1 | Medium | "AP Due This Period" fell back to array position (`data[0]`) instead of an explicit `0` when the bucket label was missing | Extracted label-keyed lookup (`getBucketValueByLabel`) with an explicit `0` fallback; 4 regression tests added | ✓ Fixed earlier (ALL-58) |
| M2 | Medium | Current Ratio / Debt to Equity show "0.00" instead of an undefined value when the denominator is zero or negative | Use the existing `ratioOf`/`formatRatio` helpers instead of inline computation; treat equity `<= 0` as undefined | ✓ Fixed |
| L1 | Low | Balance Sheet card title's loading-state fallback uses the known UTC round-trip date pattern | Derive the fallback date from local Y/M/D instead of `toISOString()`, or show a loading state | ✓ Fixed |
| L2 | Low | `fetchExpensesList`'s date fallback uses the same UTC round-trip pattern, currently unreachable | Low priority — timezone-safe fallback or fail loudly if ever touched | — Left alone; still unreachable |
| N1 | Low-Med | Cash flow, balance sheet and invoice stats serialise money as `float`, unlike the P&L path | Return quantized `Decimal`, matching `_get_local_profit_and_loss` | ✗ Filed, not fixed |
| N2 | Low | `gross_margin_pct`/`net_margin_pct` return 14-decimal Decimals while every sibling field is quantized | `.quantize(Decimal("0.01"))` like its neighbours | ✗ Filed, not fixed |
| N3 | Low | Nine chart components with no rendered path, three of them near-duplicates | Delete or wire up, once the ALL-57 Overview decision is made | ✗ Filed, not fixed |
| N4 | Low | The Finance page fetches five payloads no Finance tab reads (one on every tab switch) | Drop the dead dispatches, or make them live with Overview | ✗ Filed, not fixed |
| — | — | **ALL-57: the Finance tab renders no charts at all** — all four are in a commented-out tab | Product decision on whether Overview returns | ✗ **Needs a product decision** |

## Reviewed — no issues found

Tiles/charts traced and checked against their intended formula with nothing wrong found beyond what's listed above. Grouped by Finance-tab sub-tab.

- **Financial Statements:** P&L KPI tiles + P&L Statement table — formulas verified in `backend/app/profit/services.py::_get_local_profit_and_loss` (via `analytics/metrics.py`): `revenue − cogs = gross_profit`, `revenue − total_expenses = net_income`, `operating_expenses = max(0, total_expenses − cogs)`. `net_operating_income` intentionally diverges from `net_income` only in the documented edge case where COGS exceeds total expenses — deliberate, not a bug. Gross Margin / Net Margin tiles correctly use `marginOf`/`formatPercent` (em-dash on zero revenue, verified against `financeFormat.test.ts`). Balance Sheet Assets/Liabilities/Equity tables + equation check — backend (`FinanceAnalyticsService.balance_sheet`, `app/analytics/services.py`) is explicit that figures are a live current-balance snapshot rather than a true historical point-in-time reconstruction (`basis`/`is_point_in_time`/`effective_date` fields), and the frontend correctly displays `effective_date` rather than misrepresenting the requested `as_of_date` as honored. See H1/M2/L1 above for what's not clean on this sub-tab.
- **Invoices:** KPI tiles (Total Invoices, Total Amount, Paid, Unpaid, Overdue) verified against `backend/app/invoice/views.py::InvoiceStatsView.get_stats()` — counts/sums scoped correctly to the selected date range and to non-voided invoices. Note: the technical overview doc lists "aging data" as part of this sub-tab, but `InvoicesTab.tsx` doesn't fetch or render invoice aging at all — that's a stale claim in that doc, not a product gap (invoice aging is used on the Dashboard's Analytics section instead, via a different component). See H2 above for the one real issue found here.
- **Expenses:** Bill/Purchase totals, average, and count formulas in `backend/app/expense/services.py` verified correct and internally consistent — `QBBill` correctly has no `is_voided` filter (the model has no such field, per the technical overview doc's note, confirmed in code), `QBPurchase` is correctly filtered `is_voided=False`. "Top Category" is a simple Bills-vs-Purchases comparison, working exactly as coded — noted as a UX-naming observation only, not a defect, since it may not match a user's expectation of real QuickBooks expense categories. See H3/H4/L2 above for what's not clean on this sub-tab.
- **Payments:** Total Payments, Payment Count, Average Payment, and Success Rate all verified correct in `QuickbooksPaymentService._get_local_payment_summary()`, correctly filtered `is_voided=False`. Note: by design, "Total Payments" and "Payment Count" combine QB payments with completed POS sales (shared definitions from `analytics/metrics.py`) — confirmed intentional via the function's own inline code comment, not a bug, but worth knowing when comparing this tile against QuickBooks alone. See H5 above for the one real issue found here.
- **POS Sales:** The "Recent 10 orders" table is intentionally not date-range-scoped — it calls a dedicated `recent_orders(company, limit=10)` backend function with no date params, and the frontend's React Query key (`['pos-recent-orders']`) has no dependency on the Finance tab's date filters. Confirmed intentional by a named backend test (`test_recent_orders_returns_last_ten_scoped_to_company`), analogous to the Inventory Overview snapshot pattern already noted as by-design elsewhere. The four KPIs (Recent Sales, Total Revenue, Cash Sales, Card Sales) are all client-computed directly from this same fixed 10-order set, so they move together consistently — not misleading, just not date-filtered, which matches its "Recent 10" label. No issues found.

# Audit — Finance Tab

**Reviewed:** `allyvia-frontend/src/views/dashboard/Analytics/AnalyticsSection.tsx`, `allyvia-frontend/src/views/dashboard/Analytics/analyticsBuckets.ts`, `backend/app/analytics/views.py` (`PayablesByDueDateView`) — cross-checked against ALL-53's original finding (M4) and the backend's actual bucket-ordering behavior.
**Audited:** 2026-08-25, branch `nehalgarg2901/all-58-fix-ap-due-this-period-read-by-array-position-instead-of`
**Scope:** Finance tab "AP Due This Period" tile only (Dashboard → Analytics → Accounts Payable Summary chart's summary metric). This is a seed entry, not the full Finance tab inventory — the complete tile/chart/table sweep is ALL-54, still in progress.
**Verdict:** Targeted fix, not rewrite-level. Single narrow defect in a fallback path, confirmed via regression tests. Not reproducible against current live data — the backend always returns all 4 AP buckets today, so this was a latent risk caught by code review rather than an observed wrong number.

## Medium

### M1 — "AP Due This Period" fell back to array position instead of an explicit zero

**File:** `allyvia-frontend/src/views/dashboard/Analytics/AnalyticsSection.tsx`, `getChartMetrics()`, `case 'Accounts Payable Summary':`

**Problem:** The tile looked up the "Due This Week" AP-aging bucket via `xAxis.indexOf('Due This Week')`, which correctly located the bucket wherever it sat in the array — reordering was never actually broken, despite how the ticket originally framed it. The real defect was the fallback: when the label was missing entirely, the code fell back to `data[0]` — whatever value happened to sit at array position 0 — instead of showing zero. If a tenant's AP-bucket response ever omitted "Due This Week," the tile would silently display a different bucket's dollar amount as if it were this one.

**Impact:** Latent risk, not an observed production bug. `PayablesByDueDateView` (`backend/app/analytics/views.py`) currently always returns all 4 buckets (`Due This Week`, `Next Week`, `This Month`, `Overdue`) in fixed order, so the missing-bucket path isn't reachable against today's data.

**Fix:** Extracted the lookup into a standalone, side-effect-free `getBucketValueByLabel(labels, data, targetLabel)` in a new file, `analyticsBuckets.ts`, returning an explicit `0` when the label isn't found — never a neighboring bucket's value. Kept out of `AnalyticsSection.tsx` itself because that component's import tree pulls in `axios.ts` → `mockApi.ts` → `posHandlers.ts`, which reads `sessionStorage` at module load time and crashes outside a browser context (pre-existing, unrelated issue, out of scope here). Added `AnalyticsSection.test.ts` covering 4 cases: normal order, reordered buckets, missing bucket (asserts `0`, not a neighbor's value), and an empty bucket list. Full project suite: 1162/1162 passing, 0 regressions.

**Reference:** PR #102 (`nehalgarg2901/all-58-fix-ap-due-this-period-read-by-array-position-instead-of` → `develop`) · Linear ALL-58, parent ALL-15

## Summary table

| # | Sev | Issue | Fix |
|---|---|---|---|
| M1 | Medium | "AP Due This Period" fell back to array position (`data[0]`) instead of an explicit `0` when the bucket label was missing | Extracted label-keyed lookup (`getBucketValueByLabel`) with an explicit `0` fallback; 4 regression tests added |

## Reviewed — no issues found

Tiles/charts traced and checked against their intended formula with nothing wrong found. Grouped by Finance-tab sub-tab; fill in as each is walked.

- **Financial Statements:** _(not yet reviewed)_
- **Invoices:** _(not yet reviewed)_
- **Expenses:** _(not yet reviewed)_
- **Payments:** _(not yet reviewed)_
- **POS Sales:** _(not yet reviewed)_
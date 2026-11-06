# Business health UI — October 3, 2026

The header health bar and drawer consume `GET /api/v1/agent/health/` from the
paired backend finance-health continuation. The backend feature defaults off;
the UI renders nothing for off/404, loading, error or missing assessment data.

The cache key includes authenticated user, company and role. Responses must echo
the requested company/role before caching, because the shared Axios interceptor
reads the current role at send time. A changed identity resets the drawer.

The view shows the five supported component scores, available input summaries,
the qualitative twelve-month projection and explicit coverage limits. Company
health and store operating health have different labels. Missing expense data
does not become projected profit; missing components say unavailable. Currency
amounts, macro attribution and benchmark overlays are not yet supported here.
The bar remains provisional while full-business coverage or finance alignment
is unverified. The existing PostureLine remains while this new feature is off;
consolidating that display belongs to the later activation integration.

Validation: `npm run checks` passed (lint, TypeScript, Vite build). Full
`npx vitest run --maxWorkers=2` passed 2,322 tests in 129 files. An explicitly
labelled local fixture rendered the real components in the browser, checking
drawer open, initial focus, Escape close, restored focus and missing-data copy.
This was not an authenticated tenant run. No saved screenshot is claimed.
Independent read-only integration review found no actionable defects.

Backend rollout still needs the additive snapshot migration/runbook, a configured
dev-tenant observe run and evidence reconciliation. No production activation,
push or deployment occurred in this continuation.

## November 4, 2026: cash and bills in the drawer

While the drawer is open it asks `GET agent/health/?include=cash_context`
(backend contract `docs/finance-state/health-cash-context.md` on the backend
branch). The polled bar never asks, and the request key exists only for an open
drawer with a full user/company/role identity. The section shows:

- the QuickBooks bank book balance "as recorded (not a verified balance)", or
  why there is none;
- recorded bills per currency with non-empty due buckets (currencies with
  nothing owed are dropped, since the backend lists every bank or card account's
  currency);
- scheduled vendor payments, said to be "already counted in the bills above"
  only when the server checked that (`allocation_overlap ==
within_supplied_projection`), otherwise "may not be part of the bills shown";
- bank payments that may already have paid bills, only for a current match.

Roles without finance access see a permission message; store health says cash
is a company figure; a failure says so. Nothing is added together and the
score is not changed. The runway row now gives the backend's reason when cash is
unknown. Pure seam: `src/health/buildCashContextView.ts`. The drawer's runway row
comes from the polled read and the section from its own request, so a change in
the books between the two can briefly disagree; both carry their own reason.
When a store header is added, the store belongs in both cache keys.

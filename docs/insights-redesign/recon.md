# Insights redesign: recon (S0)

Written 2026-11-06 against `origin/main` at `2546eae` ("Health drawer: cash and bills (#162)").
This file is the source of truth for file paths and setup in later sessions. If something
here turns out wrong, fix it here in the same PR that discovers it.

## 1. Branching

- **Base on `main`, not `develop`.** GitHub's default branch is `main`. `origin/develop` is
  fully contained in `main` and 18 commits behind it (last commit `04af230`, a CI change).
  The repo's own `CLAUDE.md` said "Default branch is `develop`"; S1 corrected it to `main`.
- S0 branch: `insights-redesign/s0-recon`, cut from `origin/main`.
- Later sessions: `insights-redesign/s<n>-<name>`. Base on `main` if the previous session's PR
  has merged, otherwise on the previous session's branch.

## 2. Local dev setup (what actually works)

| Step         | Command / note                                                                                                                                                                                                                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install      | `npm ci --ignore-scripts --no-audit --no-fund` (about a minute). `--ignore-scripts` keeps husky from rewriting the shared repo's `core.hooksPath` when you work in a worktree. The pre-commit hook then does not run, so run lint yourself.                                                              |
| Env          | `.env` files are gitignored. Copy `.env.example` (or another checkout's `.env.local`) to `.env.local`. Without `VITE_APP_API_URL` the app crashes at load (`src/api/crm.ts` builds a `URL` at module level) and shows only "Loading Allyvia...".                                                         |
| No backend   | Set `VITE_USE_MOCK_API=true` in `.env.local`. The login page is then prefilled with the fixture account (`src/utils/mockApi.ts`, admin role). Auth, roles and company are mocked; every other request goes to `VITE_APP_API_URL` and fails with a network error, which pages show as their error states. |
| Dev server   | `npx vite --host 127.0.0.1` from the checkout you are testing (`npm start` is the same thing with `--host`). Port **3000 is hardcoded** with `strictPort` in `vite.config.mts`, so only one checkout can serve at a time.                                                                                |
| Login + page | Open `http://127.0.0.1:3000/login`, press Sign In, then go to `/insights`. The mock session lives in localStorage, so `localStorage.clear()` signs you out: sign in again before checking anything that depends on cleared storage.                                                                      |
| Lint         | `npm run lint:ci` (`eslint . --max-warnings=0`; prettier problems are lint warnings, so they fail too). Fix only your own files (`npx eslint --fix <paths>`); never reformat the tree.                                                                                                                   |
| Typecheck    | `npm run typecheck`                                                                                                                                                                                                                                                                                      |
| Tests        | `npx vitest run`. CI does **not** run vitest (only lint, typecheck, build), so a red test is invisible on the PR unless you run it.                                                                                                                                                                      |
| Build        | `npm run build`                                                                                                                                                                                                                                                                                          |

Trap: the desktop app's `preview_start` reads `.claude/launch.json` from the main
`allyvia-frontend` checkout and starts Vite **there**, not in your worktree. Check the
server's working directory (`lsof -p <pid> -a -d cwd`) before trusting what the browser shows.

Component test limits (from earlier work in this repo): there is no jsdom or Testing Library.
Tests render with `renderToStaticMarkup`, MUI `Dialog`/`Drawer` render nothing when statically
rendered, and anything importing `src/api/*` needs `vi.mock('utils/axios')`. Pure view-model
functions (like `src/health/buildHealthView.ts`) are the easiest thing to test well, so keep
mapping logic in plain `.ts` files.

## 3. What the Insights tab is today

- Route: `/insights` in `src/routes/MainRoutes.tsx:194` renders `src/views/insights/index.tsx`
  (`InsightsDashboard`, 650 lines). Sidebar entry: `src/menu-items/pages.ts:197`.
- The page is **not** built on agent recommendations. It shows:
  1. `CompanyProfileCard` (`src/views/insights/components/CompanyProfileCard.tsx`). Everything
     below it is hidden until a company profile exists (`showInsightsContent = !!profile`).
  2. Category tabs from `src/views/insights/constants.ts` (Sales Trends, Supplier Risk,
     Overstock, Weather; three more placeholder ids are declared but have no metadata, so they
     render nothing).
  3. Four analysis cards driven by the Redux `analytics` slice (`fetchSupplierRisk`,
     `fetchOverstock`, `fetchSalesTrends`, `generateWeatherInsight` in
     `src/store/slices/analytics`), each with its own 404 / error / "Generate Insights" state.
  4. `SurveyInsightsSection` (Inner Circle survey results, `api/innerCircle.api`).
- Baseline screenshot (mock API, no backend): `screenshots/S0-insights-baseline.png`. The
  profile gate shows "Failed to generate profile", so none of the analysis cards render, and
  the survey section is stuck on skeletons.

## 4. Where agent recommendations live today

The recommendation cards the redesign is replacing live on the **Dashboard**, in the
"Today's insights" panel, not on `/insights`.

| Concern                                           | File                                                                                                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API client and types                              | `src/api/agent.api.ts` (`AgentAPI.Recommendations`)                                                                                                         |
| Feedback payload rules, snooze days, reason codes | `src/api/agentFeedback.ts`                                                                                                                                  |
| List + generate hook                              | `src/views/dashboard/useRecommendations.ts` (query key `PENDING_QUERY_KEY = ['agent-pending-recommendations']`, exported from `RecommendationFeedback.tsx`) |
| Card list and row                                 | `src/views/dashboard/RecommendationCard.tsx` (`RecommendationRow`, `impactColumn`)                                                                          |
| Thumbs, reason chips, snooze, the "Dismiss" X     | `src/views/dashboard/RecommendationFeedback.tsx`                                                                                                            |
| Rationale panel (lazy fetch on open)              | `src/views/dashboard/RecommendationRationale.tsx`                                                                                                           |
| Signal labels, impact kind                        | `src/views/dashboard/recommendationSignals.ts`                                                                                                              |
| Title/body split of `recommendation_text`         | `splitLead` in `src/ui-component/frame/frame.ts:105`                                                                                                        |

Endpoints the client calls (all under `VITE_APP_API_URL`):

| Call                        | Method + path                                | Used by the UI today?                                                             |
| --------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| `list()`                    | `GET /agent/recommendations/pending/`        | yes (Dashboard)                                                                   |
| `rationale(id)`             | `GET /agent/recommendations/{id}/rationale/` | yes, when a row is expanded                                                       |
| `submitFeedback(id, input)` | `POST /agent/recommendations/{id}/feedback/` | yes; thumbs-down **and the X labelled "Dismiss"** both go here, with reason chips |
| `snooze(id, days)`          | `POST /agent/recommendations/{id}/snooze/`   | yes                                                                               |
| `dismiss(id)`               | `POST /agent/recommendations/{id}/dismiss/`  | **no caller on `main`**; open PR #164 starts using it                             |
| `generate(force)`           | `POST /agent/recommendations/generate/`      | yes (Dashboard header button)                                                     |

Behaviour worth keeping in mind:

- A thumbs-down dismisses the card server-side, and a later thumbs-up un-dismisses it. The
  current UI therefore dims a declined card instead of removing it, so the undo stays reachable.
- The dollar figure is `predicted_impact_dollars` (a decimal string). `impact_source` says
  whether it was calculated (`generator_computed` or a formula name) or is the model's own
  guess (`llm_estimate`). The UI labels the second kind "Model estimate" on purpose.
- The rationale endpoint returns `summary` (the model's stored words, labelled as such),
  `signals[]` (each with `source`, `cited`, `facts`, `abstained`, `unavailable`),
  `ground_truth[]` (each with `metric`, `baseline_value`, `source`), `expected_value` and
  `learned_facts[]`. **There is no ordered "steps" list** in the response today.

## 5. Open PR that overlaps this work

**Allyvia-Teams/allyvia-frontend#164**, "Dashboard shows one recommendation; Inventory Insights gets a
Recommendations tab", is open against `main` (updated 2026-11-06). It:

- adds `surface` and `limit` params to `AgentAPI.Recommendations.list()` and new optional
  fields (`sector`, `composite_score`, `remaining_by_sector`, `total_live`);
- moves `RecommendationRow` to `src/ui-component/agent/RecommendationRow.tsx` and adds
  `recommendationFixtures.ts` there;
- wires the bare `dismiss(id)` endpoint to a "show me the next" X on the Dashboard;
- adds a Recommendations tab to Inventory Insights (`/inventory/insights?tab=recommendations`).

The redesign's live adapter should be written against #164's `agent.api.ts`, not against
today's `main`. If #164 merges first, rebase; if not, the adapter must not depend on its fields.

Three older insights branches on the remote (`dev-ai-insights`, `dev-weather-insights-bugfix`,
`ritik/insights_tab_fixes`) are fully merged into `main` (0 commits ahead) and can be ignored.

## 6. The Business Health drawer

- It is **not part of the Insights tab**. It is a global header control:
  `src/layout/MainLayout/Header/index.tsx:111` renders `HealthBar`, which opens
  `HealthDrawer` (an MUI right-anchored `Drawer`) on click.
- Files: `HealthBar.tsx`, `HealthDrawer.tsx`, `HealthCashSection.tsx` in
  `src/layout/MainLayout/Header/`; data from `useHealth()` in `src/api/health.api.ts`
  (`GET agent/health/`, polled every 60s); view model in `src/health/buildHealthView.ts`.
- **It already defaults to closed.** `HealthBarView` keeps `openedIdentity` in state starting
  `undefined`, and the drawer's `open` is `openedIdentity === identity`. It also resets to
  closed when the user, company or role changes. Nothing persists an open state.
- It renders nothing at all unless `agent/health/` answers with an assessment. The backend
  feature defaults off, and mock API mode has no handler for it, so the bar is absent in local
  runs. To see it locally a later session needs a fixture for `agent/health/` (for example a
  dev-only branch in the redesign's mock flag), without touching the drawer's internals.

## 7. Feature flag mechanism

- There is no runtime feature-flag service in the frontend. The only switch in use is the
  build-time env var `VITE_USE_MOCK_API`, read as a module-level constant so Vite folds it to a
  literal and drops the dead branch from production builds (see the comment at the top of
  `src/utils/axios.ts`).
- The backend has a company feature-flags admin branch (`feat/company-feature-flags-admin`),
  not on the frontend. Not used here.
- Proposal (see `data-spec.md` section 5): one build-time var, `VITE_INSIGHTS_REDESIGN`, read
  once in a module-level constant. Unset in `.env.production`, so production keeps today's
  page until someone sets it.

## 8. File layout for the redesign

`CLAUDE.md` says feature code goes in `src/features/<domain>/` (only `pos` exists so far).

```
src/features/insights/
  types.ts                 Recommendation, Fact, InsightsPayload (S1; see data-spec.md)
  flag.ts                  getInsightsMode() from VITE_INSIGHTS_REDESIGN (S1)
  adapter.ts               the single seam: getInsights(), getInsightDetail(id), dismissInsight(id, reason?) (S1)
  mock/insights.mock.ts    INSIGHTS_MOCK, the five design-reference cards (S1)
  fromAgent.ts             PendingRecommendation + RecommendationRationale -> Recommendation (S1)
  insightsView.ts          pure view model: subtitle, chips, filtered list, impact format (S2)
  sectionState.ts          localStorage open state for the collapsible sections (S2)
  InsightsPage.tsx         the new page top: InsightsPage (data) + InsightsPageView (props only) (S2)
  components/
    ModePill.tsx           Save / Growth pill and menu (S2)
    CategoryChips.tsx      category filter chips, aria-pressed (S2)
    CollapsibleSection.tsx titled section, starts collapsed, children stay mounted (S2)
    (cards, rationale panel, fact rows: S3 / S4)
src/views/insights/
  InsightsByMode.tsx       off -> today's layout; mock/live -> InsightsPage + two collapsed sections (S2)
  index.tsx                LegacyAnalytics (today's tabs + cards, owns their fetch effect) and the mode switch (S2)
```

S1's temporary console probe (`useAdapterProbe.ts`) was deleted in S2.

Leave `src/views/dashboard/*` alone. The Dashboard keeps its own recommendation panel; #164
is changing it.

## 9. Baseline checks on `main` (2546eae)

Measured 2026-11-06 in a fresh worktree, before any S0 change:

- `npm run typecheck`: clean.
- `npx vitest run`: 164 files, 2,845 tests, all passing (about 6 s).
- `npm run lint:ci`: clean (0 warnings).

A later session that sees a red test should compare against these numbers first.

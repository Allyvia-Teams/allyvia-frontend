# Insights redesign

Impact-ranked recommendation cards at the top of `/insights`, built over several sessions.
Read `recon.md` (paths, setup, what exists today) and `data-spec.md` (types, mock, flag,
adapter, live mapping) before starting a session.

| Session | Scope                                                                                                 | Branch                           | Status                          |
| ------- | ----------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------- |
| S0      | Recon and data spec                                                                                   | `insights-redesign/s0-recon`     | done (PR #165)                  |
| S1      | Types, mock data, adapter, `VITE_INSIGHTS_REDESIGN` flag                                              | `insights-redesign/s1-data`      | done (PR #166, landed via #169) |
| S2      | Page shell: header, mode pill, category chips, placeholder list; legacy content in collapsed sections | `insights-redesign/s2-header`    | done (PR #167, landed via #169) |
| S3      | Recommendation cards (replace the placeholder list); dismiss                                          | `insights-redesign/s3-cards`     | done (PR #168, landed via #169) |
| S4      | Rationale panel: two-column why and facts, fetched per card on first expand                           | `insights-redesign/s4-rationale` | done (PR #171)                  |
| S5      | Primary actions, "Acted on" state, `/insights/history`                                                | `insights-redesign/s5-actions`   | done (PR #174)                  |
| S6      | Polish, responsive, states, Prettier cleanup, accessibility, QA, backend handoff                      | `insights-redesign/s6-polish`    | done                            |

Flag: `VITE_INSIGHTS_REDESIGN=off|mock|live`. Unset means `mock` under `vite` dev and `off` in
builds. `off` stays the production default and `mock` is the staging value; flip to `live` only
once the backend fields in "Backend wiring" below exist. See `data-spec.md` section 3 and
`.env.example`.

## How to demo the new Insights page

1. **Flag.** Set `VITE_INSIGHTS_REDESIGN=mock`. Locally, put it in `.env.local` with
   `VITE_USE_MOCK_API=true` and run `npm start`; that mock API needs no backend. For staging, the
   build has to set it: `.github/workflows/deploy-staging.yml` does not pass it today, so a
   staging build gets `off` until `VITE_INSIGHTS_REDESIGN: mock` is added to the build step's
   `env`.
2. **Sign in.** Locally with the mock API the login form comes prefilled; press Sign in. On
   staging, sign in with any account whose role has the Insights module. Open **Insights** in
   the sidebar.
3. **What to show.** Five cards in impact order under "Juniper & Rye". Expand "Reorder the
   Mara cable-knit sweater" (six facts, and Ask about this shows "Coming soon") and "Move the
   $4,200 spring deposit to December 1" (held cash: no plus sign) to show two panels open at once. Dismiss
   "Add a second associate Saturday", pick a reason, then Undo. Press "Draft purchase order" on the Mara
   card: it opens the purchase-order editor, and back on Insights the card reads "Acted on" with
   "Open again". "View history" lists both. Switch the mode pill to Growth mode.
4. **States** (local `vite` dev only; the switches are compiled out of builds): add
   `?insightsMock=slow` for the loading skeleton, `?insightsMock=error` for the error panel,
   or `?insightsMock=dismiss-error` to see a dismiss fail and the card come back.
5. **The old page.** Set `VITE_INSIGHTS_REDESIGN=off` and restart: `/insights` is today's page.

## Page structure (as of S6)

With the flag on (`mock` or `live`), `/insights` renders, top to bottom:

1. `InsightsPage` (`src/features/insights/InsightsPage.tsx`): breadcrumb `<store> / Insights`,
   h1 and subtitle, `ModePill` and "View history" (a link to `/insights/history`, S5),
   `CategoryChips`, then the recommendation cards (S3) on a light gray panel, and
   the undo toast while a dismissal is pending.
2. "Analytics": today's tabs and analysis cards, collapsed by default.
3. "Business profile": the company-profile card and Inner Circle survey section, collapsed by
   default.

Both sections remember being opened in `localStorage` under
`allyvia.insights.section.<analytics|business-profile>.open`, and their content stays mounted
while collapsed, so the profile fetch and the analytics gate work as before. The new list is
not behind the profile gate. With the flag `off`, the page is today's, unchanged.

Page state lives in `InsightsPage`: the payload, the dismiss state (`dismissedIds` plus the
pending dismissal behind the toast), the chip filter and a local mode override.
`InsightsPageView` takes all of it as props.

## Cards and dismiss (S3)

- `components/RecommendationCard.tsx` (props only) renders one card collapsed: icon tile, meta
  line, title, summary, `ImpactBadge`, then the primary action, Dismiss and the rationale
  toggle. The card is a `<section>` labelled by its title (an `h2`). The primary action only
  logs its rec id; the rationale toggle opens the S4 panel.
- The toggle reads "See rationale and N facts" from `facts.length` (always, in mock). Live
  cards have no facts until `getInsightDetail(id)` resolves, so until then it reads "See
  rationale and N signals" from `signalCount`, or "See rationale" when that is 0.
- `categoryTheme.ts` holds the five category colors and icons. The hues are fixed rather than
  taken from the theme, because a brand palette replaces primary/secondary. Label text uses
  the 700 shade (4.5:1 on white). The impact figure uses the cash green: the theme's success
  green is 2.2:1 on white. The chips use no category colors, so they don't read this map.
- `dismissals.ts` is the dismiss state machine, pure and tested in node. Dismiss removes the
  card at once. The toast (`components/DismissToast.tsx`, MUI Snackbar, 6 s, paused while the
  pointer or focus is on it) offers Undo and three optional reasons. On timeout or Escape,
  `dismissInsight(id, reason)` is called. Undo sends nothing. A second dismiss while a toast
  is open sends the first at once. Leaving the page with a toast open sends it too.
- Reason chips map to the Dashboard thumbs-down's codes: "Not relevant" -> `not_relevant`,
  "Already did this" -> `already_doing_it`, "Numbers look wrong" -> `data_looks_wrong`.
- A chip whose cards are all dismissed stays at 0 until the next load. The two empty states
  are "Nothing left in <Category> this week." and "You are caught up. New recommendations
  arrive each morning."
- Keyboard: Dismiss activated from the keyboard moves focus to the toast's Undo. When the toast
  closes while it holds focus, focus moves to the card list (`tabIndex=-1`) rather than
  `<body>`.
- Breakpoints: this theme's `sm` is 375px, so `sm` already applies on phones. The card puts
  the impact beside the text from `md` (768px) up and under the summary below that.
- The mock adapter makes no request on dismiss; it logs
  `[insights-redesign] dismissInsight(<id>, "<reason>")` to the console.

## Rationale panel (S4)

- The toggle expands `components/RationalePanel.tsx` inside the card, in a `Collapse` with
  `role="region"`. The toggle carries `aria-expanded` and `aria-controls` and reads "Hide
  rationale" with the chevron up while open. Several cards can be open at once. Open state is
  page-local (`openIds` in `InsightsPage`) and never persisted.
- First expand calls `getInsightDetail(id)` through `createDetailCache` (`rationale.ts`): one
  request per id for the page's lifetime, so collapsing and re-expanding does not refetch.
  Live mode shows a two-column skeleton while pending and "Could not load the rationale." with
  Retry on failure; a failed request is forgotten so Retry (or re-expanding) fetches again.
  The mock adapter logs `[insights-redesign] getInsightDetail(<id>) (mock: no request)` per
  call. After a live card's detail loads, the collapsed toggle counts its facts.
- Live mapping reuses S1's `rationaleFromAgent` (`fromAgent.ts`), which already builds facts
  with the Dashboard's exported `humanizeKey`. The Dashboard panel
  (`views/dashboard/RecommendationRationale.tsx`) keeps its own `humanize`/`formatValue`
  private, so there was nothing further to share; its component is not imported.
- Layout: top hairline, a lighter gray than the card list's panel (that panel's gray at 50%
  over the card's white). Two columns from `md` (55fr / 45fr, 32px gutter), stacked below `md`
  with Why first. Padding is 24px from `md` up and 16px on phones, where 24px left the facts
  column about 210px wide and wrapped every label to three or four lines.
- Why: "Why Allyvia recommends this" (an `h3`, uppercase), the narrative at 15px, then the
  steps as an `<ol>` with 22px hairline circles. Empty steps (always, in live today) drop the
  list, not the label.
- Facts: "The facts behind it" over a white bordered box (12px radius) of `FactRow`s: a 6px dot
  and the source name in the source color, the label at 14px, the value at 16px semibold and
  the sub-line at 12px muted on the right. No facts renders "No supporting facts were recorded
  for this recommendation." Colors and names are `factSourceTheme` in `categoryTheme.ts`;
  sources that share a name with a category share its color, and every source text color is
  at least 4.5:1 on white (tested).
- Footer: "Built from N signals · last checked <time>" (a part with nothing behind it drops
  out), and "Ask about this".
- **"Ask about this" has no chat to open.** No agent chat is reachable from `/insights`: the
  only chat is the buy planner's `ChatRail` (`views/inventory/plan/components/ChatRail.tsx`),
  bound to one inventory plan inside Inventory › Plan, and the header's "Chat" mega-menu item
  is a template link to `#!`. So `INSIGHT_CHAT` in `askAbout.ts` is `null`, the button is
  `aria-disabled` with a "Coming soon" tooltip (still focusable, so the tooltip is reachable by
  keyboard), and a click logs
  `askAboutInsight(<id>): no agent chat on /insights yet; would send "Tell me more about: <title>"`.
  Implementing `InsightChat` over a real chat and setting `INSIGHT_CHAT` enables the button;
  the seed is `{ message: "Tell me more about: <title>", context: { recommendationId } }`.
- Expanding scrolls only when the panel's top would be off screen (less than 48px of it
  visible), and then just far enough to put it a third of the way down the viewport: the app's
  header is fixed, so scrolling it to the top would hide it.
- Dismissing an open card closes its panel, so Undo brings it back collapsed; the cached detail
  is kept.
- S4 also moved the page header's title/controls split from `sm` to `md`: at 375px the mode
  pill and "View history" sat beside the title and "View history" was cut off.

## Primary actions, "Acted on" and history (S5)

- **What each button does.** `actions.ts` maps each `primaryAction.kind` to a flow and
  `runPrimaryAction(rec, { navigate, notify })` returns `{ kind, outcome, detail }`. S5 opened
  every flow: none accepts a prefill, so all five navigate (table in `data-spec.md` section 7):
  purchase order -> `/inventory/purchase-orders/new`, markdown ->
  `/inventory/insights?tab=markdown-candidates` (there is no price-change flow), shift ->
  `/scheduling`, invite -> `/inner-circle?tab=outreach`, payment -> `/expense/bills`. A kind
  mapped to `null` shows "This action is coming soon" (notistack) and is not marked; none is
  today.
- **`actionPayload`.** New optional field on `Recommendation`. The mock fills it for all five
  (item, sizes and quantities, percentage, date and times, segment, bill and dates); live leaves
  it undefined. It is logged with the navigation as `notSent`, because no flow takes it.
- **Acted on.** `actOnRecommendation` runs the flow; for `prefilled` or `navigated` it writes
  the card to the visit record and marks it acted on (`actedIds` in `InsightsPage`). Acted cards
  move after the others (`listedRecommendations(recs, filter, actedIds)`, impact order within
  each group), end the meta line with a green check and "Acted on", and swap the primary button
  for an outlined "Open again" that reruns the same action. Counts and the subtitle include them.
  Dismiss still works on them.
- **Visit record.** `visitRecord.ts`: one sessionStorage key, `allyvia.insights.visit`, holding
  `{ refreshedAt, acted: [{ id, at }], dismissed: [{ id, reason, at }] }`. A record whose
  `refreshedAt` is not the loaded payload's reads as empty, so a new morning starts clean.
  Every read and write is in try/catch; corrupt entries are dropped. On load `InsightsPage`
  restores dismissed and acted-on ids from it, so coming back from a flow shows the same list.
  Dismissals are written when they go final (toast timeout or close, or leaving the page with a
  toast open), never on Undo.
- **History.** `/insights/history` (`InsightsHistoryPage.tsx`, routed through
  `views/insights/history.tsx`): breadcrumb, "History", "Back to Insights", the note "Showing
  actions from this visit. Full history arrives when the outcome ledger is connected.", and a
  table (Date, Category, Title, Impact, Outcome) built by `history.ts` from the visit record
  resolved against a fresh `getInsights()`. One row per card, newest first; outcomes read
  "Acted on", "Dismissed · <reason>", or "Acted on, then dismissed · <reason>". The table keeps
  a 720px minimum and scrolls inside its own bordered container on phones. The route shares
  `/insights`'s module gate (prefix match in `moduleAccess.ts`) and redirects to `/insights`
  when the flag is `off`.
- **Icons on phones.** Below 768px a global rule sets every `svg` to
  `width: 100% !important` (the ApexCharts responsive fix), so a Tabler icon's `size` prop does
  nothing there. Every insights icon pins its width: spread `pinIcon(size)`
  (`components/pinIcon.ts`) into the sx of the element that holds it. That covers the category
  tile, the "Acted on" check, the Rationale chevron, the "Ask about this" icon, the mode pill's
  chevron and menu check, and the section chevrons.

## Polish, states and accessibility (S6)

- **Layout.** Content is capped at 1020px and centered (`InsightsByMode.tsx`), with 24px gutters
  from 1024px and 16px below. Targets met and measured in the browser: h1 32px, subtitle 15px
  muted, chips 36px with a count badge, card padding 24px (16px on a narrow page), 16px between
  cards, meta row and impact figure top-aligned, impact 24px semibold, title 18px, summary 14px
  clamped to two lines when wide, footer buttons 40px. The legacy sections' headings are 15px
  and muted, with no card chrome until opened.
- **Narrow page, wide viewport.** From 768px to about 1090px the sidebar is open and the page is
  430-700px wide. The page root is a size container (`layout.ts`); below 600px of page width the
  header, the card's impact figure and the rationale columns stack as they do on a phone. Write
  new md rules as `{ xs, md }` followed by `[NARROW_PAGE]: <narrow value>`.
- **Chips below 768px** stay on one row and scroll sideways (no wrap). The mode pill and View
  history sit on their own row under the title.
- **Loading** shows three `RecommendationCardSkeleton`s in the card frame on the gray panel.
  **Error** shows a card-shaped panel: "We couldn't load this week's recommendations." and Retry.
- **Dismiss failure.** `dismissSend.ts` writes the visit record, then sends. If
  `dismissInsight` rejects, the entry leaves the record (`forgetDismissed`), the dismiss reducer's
  `failed` action puts the card back (the list is derived from payload order, so it returns at
  its position), and a notistack error toast says "Couldn't dismiss. Try again." with no Undo.
  The first dismissal of a pair is final when the second card is dismissed, so it can fail while
  the second toast is still up; the pending card is not touched.
- **Accessibility.** Chips are named "Inventory, 1 recommendation" (the count badge is
  `aria-hidden`). The impact figure's two visible lines are `aria-hidden`, and a visually hidden
  "<label>: <amount>" carries both. Chips and the card list use the theme's focus ring;
  every control shows a visible focus ring on keyboard focus.
- **Dev-only mock switches** (`adapter.ts`, `import.meta.env.DEV` only): `?insightsMock=error`,
  `?insightsMock=slow` (a one-minute load) and `?insightsMock=dismiss-error`.
- **Prettier.** The 7 files `prettier:check` failed on are formatted in their own commit, after a
  one-line fix to a broken code span in `analytics-AUDIT.md` that Prettier would otherwise have
  mangled. `npm run ci` passes repo-wide.

### S6 QA (mock mode, browser, 2026-11-07)

| Check                                           | Result | Evidence                                                                                                                                                                                                        |
| ----------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh load (storage cleared, signed back in)    | PASS   | 5 cards, spring-deposit first; both legacy sections `aria-expanded="false"`; no Health drawer open (the bar renders nothing in mock API mode)                                                                   |
| Chip counts and filtering                       | PASS   | All 5, each category 1; each chip shows only its category and is `aria-pressed="true"`                                                                                                                          |
| Sort order                                      | PASS   | impacts 4,200 > 2,050 > 1,860 > 1,140 > 620                                                                                                                                                                     |
| Dismiss, reason, undo, second dismiss           | PASS   | Undo restored shift at index 4 with no send; second dismiss sent shift with `not_relevant` and moved the toast to mara                                                                                          |
| Both empty states                               | PASS   | "Nothing left in Staffing this week."; "You are caught up. New recommendations arrive each morning."                                                                                                            |
| Expand/collapse, two open, no refetch           | PASS   | spring-deposit and mara open together; `getInsightDetail` logged twice, still twice after collapse and reopen; mara shows 6 facts                                                                               |
| Ask about this                                  | PASS   | `aria-disabled="true"`, tooltip "Coming soon", click logs the message it would send                                                                                                                             |
| Five primary actions                            | PASS   | PO `/inventory/purchase-orders/new`, markdown `/inventory/insights?tab=markdown-candidates`, shift `/scheduling`, invite `/inner-circle?tab=outreach`, payment `/expense/bills`; each card "Acted on" on return |
| Open again                                      | PASS   | reran `/expense/bills`; first acted-on time kept                                                                                                                                                                |
| View history and Back                           | PASS   | 5 rows newest first, incl. "Acted on, then dismissed · Numbers look wrong"; Back to Insights returns to `/insights`                                                                                             |
| Mode pill                                       | PASS   | Save (amber tint) -> Growth (green tint), menu closes                                                                                                                                                           |
| Dismiss failure (`?insightsMock=dismiss-error`) | PASS   | linen back at index 1, record empty, toast "Couldn't dismiss. Try again." with no buttons                                                                                                                       |
| 375px                                           | PASS   | page `scrollWidth` 375; no card or header element past the edge with two panels open; chips one row (666px in a 321px scroller)                                                                                 |
| 768px                                           | PASS   | page 432px beside the sidebar: header and impact stack, no overflow                                                                                                                                             |
| 1024px                                          | PASS   | page 672px: wide card layout, 24px gutters, no overflow                                                                                                                                                         |
| Flag off                                        | PASS   | `VITE_INSIGHTS_REDESIGN=off`: no `[data-insights-page]`, no sections, the legacy profile card renders                                                                                                           |
| Console                                         | PASS   | no React warnings; insights logged only the two warnings forced by the mock switches; the rest is pre-existing translation and no-backend noise                                                                 |

Screenshots: `screenshots/s6-final-desktop.png`, `s6-final-tablet.png`, `s6-final-mobile.png`,
`s6-loading.png`, `s6-error.png`. At 375px the walk also finds the legacy "Survey Insights"
heading past the edge, inside the collapsed Business profile section (a legacy icon stretched
by the global svg rule); it is hidden while collapsed and does not scroll the page, even open.

## Rules for S3 and later (S2 amendments)

- **Container / view split.** `InsightsPage` (in `InsightsPage.tsx`) is the data container;
  `InsightsPageView` in the same file is props-only. The pure view model is `insightsView.ts`
  and the section-storage helpers are `sectionState.ts`. Keep the split: new UI goes in the
  view, new state in the container or the view model, and tests render the view statically
  (`renderToStaticMarkup`; there is no jsdom).
- **MUI first.** The UI library is MUI with Emotion. Reach for MUI primitives (`Button`,
  `Chip`, `Snackbar`, `Skeleton`, `Collapse`, `Tooltip`) and the theme's tokens before writing
  anything custom.
- **Toggles and chips.** Toggle buttons use `aria-pressed`, the pattern the repo already uses.
  Chips are focusable `<button>`s (`CategoryChips` renders `ButtonBase`).
- **Legacy sections.** "Analytics" and "Business profile" sit below the new content, collapsed
  by default, with their content kept mounted while collapsed (hidden, not unmounted): the
  analytics fetches wait on the profile card having loaded. Do not change that.
- **View history.** S2 shipped it disabled; S5 enabled it as a link to `/insights/history`.
- **Checking a fresh load.** Clearing `localStorage` in the browser also signs out the mock
  login. Sign back in before checking cleared-storage behaviour.
- **Console noise.** Every route already logs sidebar missing-translation messages and refused
  network calls (no backend). That predates this work; "no console errors" means nothing new
  from insights code.

## Rules for S4 and later (S3 amendments)

- **Where the card code lives.** `src/features/insights/`: `categoryTheme.ts` (five fixed
  category colors, deliberately not themeable), `components/ImpactBadge.tsx`, the pure
  `dismissals.ts` state machine and the undo toast on MUI `Snackbar`. Reason chips send the
  Dashboard's existing reason codes (`not_relevant`, `already_doing_it`, `data_looks_wrong`);
  do not invent new ones.
- **Panel and rationale colors.** The cards sit on a rounded light-gray panel because the app's
  content background is white. Keep that panel. The rationale area inside a card (S4) uses a
  slightly lighter gray than the panel, so it reads as part of the card, not the page.
- **Breakpoints.** The theme's `sm` is 375px, so phone layouts key off `md` (768px). Below `md`
  the impact badge stacks under the summary; the rationale panel stacks at `md` too.
- **Rationale toggle count.** Mock counts facts. Live counts signals, or shows no count, until
  the detail loads (see "Cards and dismiss" above). Once S4 loads the detail, the fact count
  takes over.
- **Toast timing is intended.** The 6 s timer pauses on hover and focus and while the window is
  in the background (MUI Snackbar's blur handling). Leaving `/insights` with a toast open
  commits the dismissal. Do not "fix" either.
- **Chips stay neutral.** Category chips carry no category colors; leave them.
- **Lint.** `npm run prettier:check` (one step of `npm run ci`) fails on 7 files this work
  does not touch, all identical on `main`: `.github/workflows/deploy-staging.yml`,
  `analytics-AUDIT.md`, `docs/analytics-b05-landing-runbook.md`,
  `docs/brand-studio/live-integration-result.json`,
  `docs/finance-top-tiles-customization-design.md`, `finance-AUDIT.md` and `README.md`.
  `npm run lint:ci` (ESLint) passes. Run lint, typecheck, tests and build as separate steps,
  report the `prettier:check` failure as pre-existing, and do not reformat those files in an
  insights session.

## Rules for S5 and later (S4 amendments)

- **Where the rationale code lives.** `src/features/insights/`: `components/RationalePanel.tsx`,
  the `factSourceTheme` map in `categoryTheme.ts`, the per-id detail cache
  (`createDetailCache` in `rationale.ts`) and the `askAbout.ts` stub.
- **"Ask about this" stays a stub.** No agent chat is reachable from `/insights`; the only chat
  is the buy planner's `ChatRail` inside Inventory › Plan. `INSIGHT_CHAT` stays `null`: the
  button shows "Coming soon" and a click logs the message it would send. Do not wire it to
  `ChatRail` or build a chat in an insights session.
- **Breakpoints.** The page header's title/controls row goes horizontal at `md`, not `sm`.
  Rationale panel padding is 16px below `md` and 24px from `md` up.
- **Expand scrolling.** Expanding a card scrolls only when less than 48px of the panel is
  visible, and then puts the panel's top about a third of the way down the viewport. The app
  header is fixed (76px), so never scroll a panel to the top of the window.
- **Dismiss and the panel.** Dismissing an open card closes its panel; Undo restores the card
  collapsed. Keep that.
- **Lint.** The pre-existing failure is `npm run prettier:check` (the 7 files listed above,
  untouched by this work and identical on `main`), not `npm run lint:ci`. Report it as
  pre-existing; do not reformat those files until S6.
- **Branches and PRs.** PRs target `main` directly. Base a session on `main` if the previous
  session's PR has merged, otherwise on the previous session's branch, and still target
  `main`. S5 based on `insights-redesign/s4-rationale` because PR #171 had not merged (and
  #171 waits on #169).

## Rules for S6 and later (S5 amendments)

- **Every kind navigates.** `actions.ts` resolves all five `primaryAction.kind`s to a plain
  navigation, because no flow accepts a prefill today (`data-spec.md` section 7 lists what each
  flow would need). `actionPayload` is logged as `notSent`. The "coming soon" toast exists for a
  kind mapped to `null`, and no kind uses it. Keep all of this.
- **Visit record and history.** Acted-on and dismissed ids live in sessionStorage
  (`allyvia.insights.visit`), keyed by the payload's `refreshedAt`; `/insights/history` reads
  them. The Outcome column has exactly three cases: "Acted on", "Dismissed · <reason>", and
  "Acted on, then dismissed · <reason>".
- **Icons.** The global `svg { width: 100% !important }` rule below 768px stays. Pin the width
  of every insights icon with `pinIcon(size)`, including any icon a later session adds.
- **Stale recon.** `recon.md` section 3 describes the old Insights tab's flows and is stale.
  `data-spec.md` section 7 is the current account of the primary-action flows.
- **Branches and PRs.** All earlier PRs (#169, #171, #174) are merged or merging to `main`.
  Base S6 on `main`.

## Backend wiring

What `live` mode needs from the backend, per `Recommendation` field. Today's live mapping and
its defaults are in `data-spec.md` section 5; each gap is a `TODO(insights-live)` in
`fromAgent.ts`.

| Field                                    | Should come from                                                                                                                                                                               | Today in live                                         |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `id`                                     | the recommendation row's id (feedback, rationale and the ledger key on it)                                                                                                                     | `rec.id`; fine                                        |
| `category`                               | the candidate's type, mapped through the backend `RecType` table                                                                                                                               | `rec_type`, then sector; untyped rows -> `inventory`  |
| `title`, `summary`                       | separate fields in the candidate output of the agent's single LLM call                                                                                                                         | one text block split at the first sentence            |
| `rationale.narrative`, `rationale.steps` | the same candidate output: the narrative, plus ordered steps as a list                                                                                                                         | narrative from the rationale summary; steps `[]`      |
| `facts` (with `Fact.source`)             | the signal tool results the candidate cites, each tagged with its source (sales history, inventory, weather, local events, …)                                                                  | humanized signal keys; `sub` empty                    |
| `signalCount`                            | the number of cited, usable signals                                                                                                                                                            | `driving_signals.length`; 0 on older rows             |
| `impact.amount`                          | the candidate's expected value                                                                                                                                                                 | `predicted_impact_dollars`                            |
| `impact.label`, `impact.signed`          | a new impact kind (revenue protected, sales captured, cash freed, cash kept on hand); the kind decides the label and whether it signs                                                          | "estimated impact" / "model estimate"; signed if > 0  |
| `confidence`                             | the p20/p80 spread of the expected value: narrow -> high, wide -> low                                                                                                                          | bands over `confidence_score`                         |
| `deadline`                               | an action deadline on the candidate ("Order by 5 PM today"), distinct from `expires_at`                                                                                                        | `''`                                                  |
| `primaryAction`                          | a verb label plus one of the five kinds, from the candidate                                                                                                                                    | kind from category, label "Review"                    |
| `actionPayload`                          | per kind, the prefill listed in `data-spec.md` section 7: PO lines by item id; markdown items, percent, start; shift date, start, end, role; invite segment and campaign; bill id and new date | `undefined`                                           |
| `lastChecked`, payload `refreshedAt`     | the run's `generated_at`                                                                                                                                                                       | fine                                                  |
| payload `mode`                           | the shop's posture ladder (Save or Growth), stored so the mode pill can write it back                                                                                                          | `'save'`; the pill's change is local                  |
| payload `storeName`                      | the company name                                                                                                                                                                               | `''`; the page falls back to the store's company name |

Three items that are not fields:

1. **Outcome ledger.** Dismiss (with its reason) and Acted on should write to the outcome ledger,
   and `/insights/history` should read it. Today both live in sessionStorage for one visit
   (`visitRecord.ts`), and the history page says so.
2. **"Ask about this"** needs a general agent chat reachable from `/insights`. The only chat
   today is the buy planner's `ChatRail` inside Inventory › Plan; `INSIGHT_CHAT` in `askAbout.ts`
   stays `null` until one exists.
3. **Prefill entry points.** The five flows (purchase order, markdown, shift, invite, bill
   payment) need routes or openers that take the `actionPayload` (table in `data-spec.md`
   section 7). Each then gets an `open(payload)` in `ACTION_FLOWS`.

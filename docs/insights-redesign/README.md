# Insights redesign

Impact-ranked recommendation cards at the top of `/insights`, built over several sessions.
Read `recon.md` (paths, setup, what exists today) and `data-spec.md` (types, mock, flag,
adapter, live mapping) before starting a session.

| Session | Scope                                                                                                 | Branch                        | Status         |
| ------- | ----------------------------------------------------------------------------------------------------- | ----------------------------- | -------------- |
| S0      | Recon and data spec                                                                                   | `insights-redesign/s0-recon`  | done (PR #165) |
| S1      | Types, mock data, adapter, `VITE_INSIGHTS_REDESIGN` flag                                              | `insights-redesign/s1-data`   | done           |
| S2      | Page shell: header, mode pill, category chips, placeholder list; legacy content in collapsed sections | `insights-redesign/s2-header` | done           |
| S3      | Recommendation cards (replace the placeholder list); dismiss                                          | `insights-redesign/s3-cards`  | done           |

Flag: `VITE_INSIGHTS_REDESIGN=off|mock|live`. Unset means `mock` under `vite` dev and `off` in
builds. See `data-spec.md` section 3.

## Page structure (as of S3)

With the flag on (`mock` or `live`), `/insights` renders, top to bottom:

1. `InsightsPage` (`src/features/insights/InsightsPage.tsx`): breadcrumb `<store> / Insights`,
   h1 and subtitle, `ModePill` and "View history" (disabled, "Coming soon": there is no history
   route yet), `CategoryChips`, then the recommendation cards (S3) on a light gray panel, and
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
  toggle. The card is a `<section>` labelled by its title (an `h2`). The primary action and
  the rationale toggle only log their rec id; S4 opens the rationale.
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
- **View history.** Disabled with a "Coming soon" tooltip because no history route exists
  (`HISTORY_ROUTE` is `null`). S5 builds the route.
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
- **Lint.** A repo-wide Prettier check fails on files this work does not touch, and they are
  identical on `main` (on 2026-11-06, `npx prettier --check .` flagged 9: workflow YAML,
  audit/runbook docs, `README.md`, `vite.config.mts`). `npm run lint:ci` is ESLint only and
  passed then. Run lint, typecheck, tests and build as separate steps, report any Prettier
  failure in untouched files as pre-existing, and do not reformat them in an insights session.

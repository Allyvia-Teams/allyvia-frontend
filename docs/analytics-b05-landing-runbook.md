# Landing session B05 — Analytics UI (ALL-139 … ALL-144)

Everything in this session is committed locally and verified. Two steps need a
human because this machine cannot perform them.

**Status when written:** 2026-09-03. Frontend branches exist locally in
`allyvia-frontend`; the backend commit exists locally in the `backend-b05`
worktree.

---

## BLOCKED-ON-HUMAN 1 — push the frontend branches and open the PR stack

`git push` from this session is refused by the sandbox's command classifier
(the repo itself is reachable — `git ls-remote origin develop` succeeds — so
this is a local permission boundary, not a credential problem).

The four branches are stacked; each builds on the one above, so open them in
order and set each PR's **base** to the previous branch, not to `develop`.
That keeps each diff reviewable on its own.

```bash
cd ~/Allyvia/allyvia-frontend
git push -u origin sweep/b05-analytics-audit-fixes
git push -u origin sweep/b05-analytics-registry
git push -u origin sweep/b05-analytics-picker
git push -u origin sweep/b05-analytics-persistence
```

Then open four PRs (github.com → New pull request), base → head:

| # | Base | Head | Title | Closes |
|---|---|---|---|---|
| 1 | `develop` | `sweep/b05-analytics-audit-fixes` | ALL-140/141: Audit every Analytics metric and fix the incorrect ones | ALL-140, ALL-141 |
| 2 | `sweep/b05-analytics-audit-fixes` | `sweep/b05-analytics-registry` | ALL-142: Drive the Analytics tab from a widget registry | ALL-142 |
| 3 | `sweep/b05-analytics-registry` | `sweep/b05-analytics-picker` | ALL-143: Widget picker behind the + button | ALL-143 |
| 4 | `sweep/b05-analytics-picker` | `sweep/b05-analytics-persistence` | ALL-144: Persist the widget layout per user account | ALL-144 |

As each merges, GitHub retargets the next one at `develop` automatically.

**PR 4 must not merge before BLOCKED-ON-HUMAN 2 below.** Its frontend calls
`GET/PUT /analytics/layout/`; without the backend deployed, the layout request
404s. That is handled — the provider catches the failure and keeps the local
cache, so the tab still works — but the feature does nothing until the endpoint
exists.

## BLOCKED-ON-HUMAN 2 — push the backend layout endpoint

The stored git credential cannot reach `Allyvia-Teams/backend` from this
machine at all (`git ls-remote` → "Repository not found"; the token resolves to
a user without access — a long-standing constraint, not new to this session).
The commit is made and its tests pass locally.

```bash
cd ~/Allyvia/backend-b05
git log --oneline -1        # expect: ALL-144: Per-user analytics widget layout endpoint
git push -u origin sweep/b05-analytics-persistence
```

Then open a PR into `dev-stripe` titled
**"ALL-144: Per-user analytics widget layout endpoint"**.

It adds `analytics/migrations/0002_analyticswidgetlayout.py`, so the deploy
needs a migration run:

```bash
python manage.py migrate analytics
```

The migration only creates a new table (`AnalyticsWidgetLayout`) — it alters no
existing table and is safe to run ahead of the frontend merge. Doing it first
is in fact the right order: the endpoint can be live and simply return
`{"layouts": {}}` for everyone until PR 4 lands.

---

## Verification already done (no need to repeat)

- **Backend suite:** `9 failed, 3932 passed, 10 skipped, 3253 warnings, 1043 subtests passed in 155.76s`.
  All 9 failures are in `tests/test_agent_learning_layer.py`,
  `tests/test_agent_closed_loop_e2e.py` and `tests/test_langfuse_tracing.py`.
  The identical 9 fail on unmodified `dev-stripe` (verified in a throwaway
  worktree at `b68ec7f0`), so they are pre-existing and unrelated to the
  analytics work. Zero analytics or layout failures.
- **Backend layout endpoint:** `16 passed` — `analytics/tests_widget_layout.py`.
- **Frontend:** `60 files, 1358 tests passed`; `tsc --noEmit` 0 errors;
  `eslint` clean; `npm run build` succeeds.

Run the backend suite the ALL-159 way (never `docker compose`, which collects
zero tests and looks green):

```bash
cd ~/Allyvia/backend-b05/app && export USE_POSTGRES=True DB_NAME=allyvia_b05 DB_USER=allyvia DB_PASSWORD=allyvia_pass DB_HOST=127.0.0.1 DB_PORT=5432 DB_SSLMODE=disable QUEUE_BACKEND=sqs SECRET_KEY=test-key DEBUG=True METRICS_ENABLED=0 && ~/venv/bin/python -m pytest -q --no-cov -p no:cacheprovider --maxfail=100000
```

---

## Still outstanding (not blocked — just not in this session's scope)

1. **ALL-140's review gate.** The ticket says to post the findings and review
   them with Nigel *before* fixing. This session was instructed to run
   140 → 144 in sequence, so the fixes were made in the same pass. The audit
   matrix is `allyvia-frontend/analytics-AUDIT.md`; the three High findings are
   worth reading before PR 1 merges, since each changes a number on screen.
2. **ALL-143 / ALL-144 demos.** Both tickets require a demo to Nigel before
   merge, and ALL-144 additionally wants a manual pass across supported
   browsers and screen sizes. Neither can be done from here: the Analytics tab
   needs an authenticated session against a seeded tenant, and port 3000 on
   this machine is held by Docker.
3. **A new ticket for audit finding L3.** The Analytics "Download Report"
   button is a stub — it assembles five report sections, `console.log`s them,
   and alerts *"PDF generation functionality would be implemented here"*. It is
   fully styled and looks working. Out of ALL-141's scope (it is not a wrong
   number), so it needs its own ticket: implement the export, or hide the
   control until it exists.
4. **ALL-19's stricter reading.** See the appendix in `analytics-AUDIT.md`. If
   "picks what data each widget shows" meant per-widget *data-source*
   configuration rather than choosing between fixed-purpose widgets, that is
   not delivered by ALL-142/143 and needs its own ticket.

# Insights redesign

Impact-ranked recommendation cards at the top of `/insights`, built over several sessions.
Read `recon.md` (paths, setup, what exists today) and `data-spec.md` (types, mock, flag,
adapter, live mapping) before starting a session.

| Session | Scope                                                    | Branch                       | Status         |
| ------- | -------------------------------------------------------- | ---------------------------- | -------------- |
| S0      | Recon and data spec                                      | `insights-redesign/s0-recon` | done (PR #165) |
| S1      | Types, mock data, adapter, `VITE_INSIGHTS_REDESIGN` flag | `insights-redesign/s1-data`  | done           |
| S2      | Page wiring behind the flag (fallback to today's page)   |                              | not started    |

Flag: `VITE_INSIGHTS_REDESIGN=off|mock|live`. Unset means `mock` under `vite` dev and `off` in
builds. See `data-spec.md` section 3.

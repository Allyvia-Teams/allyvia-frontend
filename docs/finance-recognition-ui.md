# Recorded expenses in Finance

Frontend branch: `predictive-finance-foundation`, based on
`expense-catalogue-analytics` at `9d7ac0b`. Backend companion: the same-named
backend branch, including expense-recognition API commit `98e4dc34`.

Finance Overview and Financial Statements include a shared Recorded expenses
panel. It reads `summary.expense_recognition` from Finance KPIs or
`expense_recognition` from P&L. P&L normalization preserves decimal strings in
this breakdown. No extra API request is introduced.

Each currency has its own row for operating costs, cash paid, outstanding, and
unclassified amounts. There is no converted or combined total. Missing or invalid
money is an em dash; missing API data is an unavailable state; no recorded rows
is an empty state with coverage still visible. Loading hides old panel values.

Unavailable sources and partial coverage are shown alongside the figures. The
panel explains that inventory payments are cash uses and that outstanding amounts
are recorded commitments, not total debt. Existing payable-spend KPI cards are
labelled Bill and Purchase Spend. Headline net income and legacy P&L formulas are
not recalculated by this change, and the panel says so explicitly.

The frontend handles an older backend by displaying the unavailable state. This
change does not enable vendor payments or supply a verified spendable balance.
It is not a deployment or an authenticated end-to-end validation of the whole
Finance application. The component was inspected in an isolated local browser
preview with sample USD/CAD data, including the narrow-layout horizontal table.

Validation includes component rendering, multi-currency/missing-money behavior,
P&L normalization, and the existing expense capture/Redux tests. A pre-existing
TypeScript mismatch in expense capture was fixed by requiring only the three
Storage methods the implementation actually uses.

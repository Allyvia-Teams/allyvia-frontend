import React, { useMemo } from 'react';
import { Grid, Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { gridSpacing } from 'store/constant';
import MainCard from 'ui-component/cards/MainCard';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import { useSelector } from 'store';
import type { RootState } from 'store';
import { COLORS } from 'styles/colors';

const FinancialStatementsTab: React.FC = () => {
  const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  // Get data directly from Redux with proper types
  const {
    profitAndLoss: pnlSummary,
    cogsDetail,
    grossProfitDetail,
    balanceSheet,
    cashFlow,
    loading: loadingState
  } = useSelector((state: RootState) => state.finance);

  const totalCashIn = useMemo(() => {
    if (!cashFlow) return 0;
    return cashFlow.cash_flow?.summary?.cash_in_total || 0;
  }, [cashFlow]);

  const totalCashOut = useMemo(() => {
    if (!cashFlow) return 0;
    return cashFlow.cash_flow?.summary?.cash_out_total || 0;
  }, [cashFlow]);

  const netCashFlow = useMemo(() => {
    if (!cashFlow) return 0;
    return cashFlow.cash_flow?.summary?.net_cash_flow || 0;
  }, [cashFlow]);

  // Extract balance sheet totals from new structure, computing total equity manually
  const totalAssets = balanceSheet?.balance_sheet?.assets?.total_assets || 0;
  const totalLiabilities = balanceSheet?.balance_sheet?.liabilities?.total_liabilities || 0;
  const totalEquity = balanceSheet?.balance_sheet?.equity?.total || 0;

  // Calculate financial ratios
  const currentAssets = balanceSheet?.balance_sheet?.assets?.current_assets?.total || 0;
  const currentLiabilities = balanceSheet?.balance_sheet?.liabilities?.current_liabilities?.total || 0;
  const currentRatio = currentLiabilities > 0 ? (currentAssets / currentLiabilities).toFixed(2) : '0.00';
  const debtToEquityRatio = totalEquity > 0 ? (totalLiabilities / totalEquity).toFixed(2) : '0.00';

  // P&L KPIs Configuration - Essential metrics only
  const pnlKPIs = [
    {
      title: 'Total Revenue',
      value: grossProfitDetail ? fmtMoney(Number(grossProfitDetail.revenue)) : pnlSummary ? fmtMoney(pnlSummary.total_income) : fmtMoney(0),
      theme: 'default' as const,
      loading: loadingState.profitAndLoss || false
    },
    {
      title: 'Gross Profit',
      value: grossProfitDetail
        ? fmtMoney(Number(grossProfitDetail.gross_profit))
        : pnlSummary
          ? fmtMoney(pnlSummary.gross_profit)
          : fmtMoney(0),
      theme: 'success' as const,
      loading: loadingState.grossProfitDetail || loadingState.profitAndLoss || false
    },
    {
      title: 'Net Income',
      value: pnlSummary ? fmtMoney(pnlSummary.net_income) : fmtMoney(0),
      theme: pnlSummary && pnlSummary.net_income >= 0 ? ('default' as const) : ('alert' as const),
      loading: loadingState.profitAndLoss || false
    },
    {
      title: 'Total Expenses',
      value: pnlSummary ? fmtMoney(pnlSummary.total_expenses) : fmtMoney(0),
      theme: 'alert' as const,
      loading: loadingState.profitAndLoss || false
    }
  ];

  // Financial Ratios KPIs Configuration
  const financialRatiosKPIs = [
    {
      title: 'Current Ratio',
      value: currentRatio,
      theme: parseFloat(currentRatio) >= 1.0 ? ('success' as const) : ('alert' as const),
      loading: loadingState.balanceSheet || false
    },
    {
      title: 'Debt to Equity',
      value: debtToEquityRatio,
      theme: parseFloat(debtToEquityRatio) <= 1.0 ? ('success' as const) : ('alert' as const),
      loading: loadingState.balanceSheet || false
    },
    {
      title: 'Gross Margin',
      value:
        grossProfitDetail && grossProfitDetail.revenue
          ? ((Number(grossProfitDetail.gross_profit) / Number(grossProfitDetail.revenue)) * 100).toFixed(1) + '%'
          : pnlSummary && pnlSummary.total_income
            ? ((pnlSummary.gross_profit / pnlSummary.total_income) * 100).toFixed(1) + '%'
            : '0.0%',
      theme: 'success' as const,
      loading: loadingState.grossProfitDetail || loadingState.profitAndLoss || false
    },
    {
      title: 'Net Margin',
      value:
        grossProfitDetail && grossProfitDetail.revenue
          ? ((Number(pnlSummary?.net_income || 0) / Number(grossProfitDetail.revenue)) * 100).toFixed(1) + '%'
          : pnlSummary && pnlSummary.total_income
            ? ((pnlSummary.net_income / pnlSummary.total_income) * 100).toFixed(1) + '%'
            : '0.0%',
      theme: pnlSummary && pnlSummary.net_income >= 0 ? ('success' as const) : ('alert' as const),
      loading: loadingState.profitAndLoss || false
    }
  ];

  // Cash Flow KPIs Configuration
  const cashFlowKPIs = [
    {
      title: 'Total Cash In',
      value: fmtMoney(totalCashIn),
      theme: 'success' as const,
      loading: loadingState.cashFlow || false
    },
    {
      title: 'Total Cash Out',
      value: fmtMoney(totalCashOut),
      theme: 'alert' as const,
      loading: loadingState.cashFlow || false
    },
    {
      title: 'Net Cash Flow',
      value: fmtMoney(netCashFlow),
      theme: netCashFlow >= 0 ? ('success' as const) : ('alert' as const),
      loading: loadingState.cashFlow || false
    }
  ];

  return (
    <>
      {/* P&L Summary Cards */}
      <Grid container spacing={gridSpacing} sx={{ mb: 2 }}>
        {pnlKPIs.map((kpi, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} size="medium" loading={kpi.loading} />
          </Grid>
        ))}
      </Grid>
      {/* P&L Statement and COGS Breakdown */}
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, md: 12 }}>
          <MainCard title="Profit & Loss Statement">
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <strong>Revenue</strong>
                    </TableCell>
                    <TableCell align="right">
                      {grossProfitDetail
                        ? fmtMoney(Number(grossProfitDetail.revenue))
                        : pnlSummary
                          ? fmtMoney(pnlSummary.total_income)
                          : fmtMoney(0)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>Cost of Goods Sold</strong>
                    </TableCell>
                    <TableCell align="right">
                      {cogsDetail
                        ? fmtMoney(Number(cogsDetail.total_cogs))
                        : grossProfitDetail
                          ? fmtMoney(Number(grossProfitDetail.cost_of_goods_sold))
                          : pnlSummary
                            ? fmtMoney(pnlSummary.cost_of_goods_sold)
                            : fmtMoney(0)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>Gross Profit</strong>
                    </TableCell>
                    <TableCell align="right">
                      {grossProfitDetail
                        ? fmtMoney(Number(grossProfitDetail.gross_profit))
                        : pnlSummary
                          ? fmtMoney(pnlSummary.gross_profit)
                          : fmtMoney(0)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>Operating Expenses</strong>
                    </TableCell>
                    <TableCell align="right">
                      {pnlSummary
                        ? fmtMoney(
                            Math.max(
                              0,
                              pnlSummary.total_expenses -
                                (cogsDetail
                                  ? Number(cogsDetail.total_cogs)
                                  : grossProfitDetail
                                    ? Number(grossProfitDetail.cost_of_goods_sold)
                                    : pnlSummary.cost_of_goods_sold)
                            )
                          )
                        : fmtMoney(0)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>Net Operating Income</strong>
                    </TableCell>
                    <TableCell align="right">{pnlSummary ? fmtMoney(pnlSummary.net_operating_income) : fmtMoney(0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>Net Income</strong>
                    </TableCell>
                    <TableCell align="right">{pnlSummary ? fmtMoney(pnlSummary.net_income) : fmtMoney(0)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </MainCard>
        </Grid>
      </Grid>
      {/* Financial Ratios */}
      <Grid container spacing={gridSpacing}>
        {financialRatiosKPIs.map((kpi, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} size="medium" loading={kpi.loading} />
          </Grid>
        ))}
      </Grid>

      {/* Balance Sheet Tables */}
      <Grid container spacing={gridSpacing} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12 }}>
          <MainCard title="Balance Sheet" sx={{ border: '1px solid #e0e0e0' }}>
            <Grid container spacing={0} sx={{ alignItems: 'stretch' }}>
              {/* Assets */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ p: 2, borderRight: { md: '1px solid #e0e0e0' }, height: '100%' }}>
                  <Typography variant="h4" sx={{ textAlign: 'center', fontWeight: 'bold', mb: 2 }}>
                    Assets
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ py: 1, px: 2 }}>Account</TableCell>
                          <TableCell align="right" sx={{ py: 1, px: 2 }}>
                            Amount
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {balanceSheet?.balance_sheet?.assets && (
                          <>
                            {/* Current Assets */}
                            <TableRow>
                              <TableCell sx={{ py: 1, px: 2 }}>
                                <strong>Current Assets</strong>
                              </TableCell>
                              <TableCell align="right" sx={{ color: '#2e7d32', py: 1, px: 2 }}>
                                <strong>+{fmtMoney(balanceSheet.balance_sheet.assets.current_assets.total)}</strong>
                              </TableCell>
                            </TableRow>
                            {Object.entries(balanceSheet.balance_sheet.assets.current_assets.accounts).map(([accountName, account]) => (
                              <TableRow key={accountName}>
                                <TableCell sx={{ pl: 3, py: 0.5, px: 2 }}>{accountName}</TableCell>
                                <TableCell align="right" sx={{ color: '#2e7d32', py: 0.5, px: 2 }}>
                                  +{fmtMoney(account.balance)}
                                </TableCell>
                              </TableRow>
                            ))}

                            {/* Fixed Assets */}
                            <TableRow>
                              <TableCell sx={{ py: 1, px: 2 }}>
                                <strong>Fixed Assets</strong>
                              </TableCell>
                              <TableCell align="right" sx={{ color: '#2e7d32', py: 1, px: 2 }}>
                                <strong>+{fmtMoney(balanceSheet.balance_sheet.assets.fixed_assets.total)}</strong>
                              </TableCell>
                            </TableRow>
                            {Object.entries(balanceSheet.balance_sheet.assets.fixed_assets.accounts).map(([accountName, account]) => (
                              <TableRow key={accountName}>
                                <TableCell sx={{ pl: 3, py: 0.5, px: 2 }}>{accountName}</TableCell>
                                <TableCell align="right" sx={{ color: '#2e7d32', py: 0.5, px: 2 }}>
                                  +{fmtMoney(account.balance)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </>
                        )}
                        <TableRow>
                          <TableCell sx={{ py: 1, px: 2 }}>
                            <strong>Total Assets</strong>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 1, px: 2 }}>
                            <strong>{fmtMoney(totalAssets)}</strong>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Grid>

              {/* Liabilities */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ p: 2, borderRight: { md: '1px solid #e0e0e0' }, height: '100%' }}>
                  <Typography variant="h4" sx={{ textAlign: 'center', fontWeight: 'bold', mb: 2 }}>
                    Liabilities
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ py: 1, px: 2 }}>Account</TableCell>
                          <TableCell align="right" sx={{ py: 1, px: 2 }}>
                            Amount
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {balanceSheet?.balance_sheet?.liabilities && (
                          <>
                            {/* Current Liabilities */}
                            <TableRow>
                              <TableCell sx={{ py: 1, px: 2 }}>
                                <strong>Current Liabilities</strong>
                              </TableCell>
                              <TableCell align="right" sx={{ color: 'error.main', py: 1, px: 2 }}>
                                <strong>-{fmtMoney(balanceSheet.balance_sheet.liabilities.current_liabilities.total)}</strong>
                              </TableCell>
                            </TableRow>
                            {Object.entries(balanceSheet.balance_sheet.liabilities.current_liabilities.accounts).map(
                              ([accountName, account]) => (
                                <TableRow key={accountName}>
                                  <TableCell sx={{ pl: 3, py: 0.5, px: 2 }}>{accountName}</TableCell>
                                  <TableCell align="right" sx={{ color: 'error.main', py: 0.5, px: 2 }}>
                                    -{fmtMoney(account.balance)}
                                  </TableCell>
                                </TableRow>
                              )
                            )}

                            {/* Long-term Liabilities */}
                            <TableRow>
                              <TableCell sx={{ py: 1, px: 2 }}>
                                <strong>Long-term Liabilities</strong>
                              </TableCell>
                              <TableCell align="right" sx={{ color: 'error.main', py: 1, px: 2 }}>
                                <strong>-{fmtMoney(balanceSheet.balance_sheet.liabilities.long_term_liabilities.total)}</strong>
                              </TableCell>
                            </TableRow>
                            {Object.entries(balanceSheet.balance_sheet.liabilities.long_term_liabilities.accounts).map(
                              ([accountName, account]) => (
                                <TableRow key={accountName}>
                                  <TableCell sx={{ pl: 3, py: 0.5, px: 2 }}>{accountName}</TableCell>
                                  <TableCell align="right" sx={{ color: 'error.main', py: 0.5, px: 2 }}>
                                    -{fmtMoney(account.balance)}
                                  </TableCell>
                                </TableRow>
                              )
                            )}
                          </>
                        )}
                        <TableRow>
                          <TableCell sx={{ py: 1, px: 2 }}>
                            <strong>Total Liabilities</strong>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 1, px: 2 }}>
                            <strong>{fmtMoney(totalLiabilities)}</strong>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Grid>

              {/* Equity */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h4" sx={{ textAlign: 'center', fontWeight: 'bold', mb: 2 }}>
                    Equity
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ py: 1, px: 2 }}>Account</TableCell>
                          <TableCell align="right" sx={{ py: 1, px: 2 }}>
                            Amount
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {balanceSheet?.balance_sheet?.equity && (
                          <>
                            {Object.entries(balanceSheet.balance_sheet.equity.accounts).map(([accountName, account]) => (
                              <TableRow key={accountName}>
                                <TableCell sx={{ py: 0.5, px: 2 }}>{accountName}</TableCell>
                                <TableCell
                                  align="right"
                                  sx={{ color: account.balance >= 0 ? COLORS.goodGreen : COLORS.badRed, py: 0.5, px: 2 }}
                                >
                                  {account.balance >= 0 ? '+' : ''}
                                  {fmtMoney(account.balance)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </>
                        )}
                        <TableRow>
                          <TableCell sx={{ py: 1, px: 2 }}>
                            <strong>Total Equity</strong>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 1, px: 2 }}>
                            <strong>{fmtMoney(totalEquity)}</strong>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Grid>
            </Grid>

            {/* Balance Sheet Equation Check */}
            {balanceSheet?.balance_sheet && (
              <Box
                sx={{
                  mt: 4,
                  mb: 4,
                  textAlign: 'center',
                  borderTop: '1px solid #e0e0e0',
                  pt: 3,
                  pb: 2,
                  bgcolor: 'grey.50',
                  borderRadius: '0 0 8px 8px'
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
                  Balance Sheet as of: {balanceSheet.as_of_date}
                </Typography>
                {(() => {
                  const calculatedTotal = totalLiabilities + totalEquity;
                  const difference = Math.abs(totalAssets - calculatedTotal);
                  const isBalanced = difference <= 0.2; // Tolerance of 20 cents

                  return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6" color={isBalanced ? COLORS.goodGreen : COLORS.badRed} fontWeight="bold" sx={{ mb: 1 }}>
                        Assets = Liabilities + Equity: {isBalanced ? '✓ Balanced' : '✗ Not Balanced'}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                        {fmtMoney(totalAssets)} = {fmtMoney(totalLiabilities)} + {fmtMoney(totalEquity)} = {fmtMoney(calculatedTotal)}
                        {difference > 0 && (
                          <span
                            style={{
                              color: difference <= 0.2 ? COLORS.goodGreen : COLORS.badRed,
                              fontWeight: 'bold'
                            }}
                          >
                            {' '}
                            (Difference: {fmtMoney(difference)})
                          </span>
                        )}
                      </Typography>
                    </Box>
                  );
                })()}
              </Box>
            )}
          </MainCard>
        </Grid>
      </Grid>

      {/* Cash Flow */}
      <Grid container spacing={gridSpacing}>
        {cashFlowKPIs.map((kpi, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
            <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} size="medium" loading={kpi.loading} />
          </Grid>
        ))}
      </Grid>

      {/* Cash Flow Table */}
      <Grid container spacing={gridSpacing} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12 }}>
          <MainCard title="Cash Flow Statement">
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Activity Type</TableCell>
                    <TableCell>Cash In</TableCell>
                    <TableCell>Cash Out</TableCell>
                    <TableCell align="right">Net Flow</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cashFlow && (
                    <>
                      <TableRow>
                        <TableCell>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize', color: 'black' }}>
                            Operating Activities
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: COLORS.goodGreen }}>
                          {fmtMoney(cashFlow.cash_flow?.operating_activities?.cash_in?.total_operating_in || 0)}
                        </TableCell>
                        <TableCell sx={{ color: COLORS.badRed }}>
                          {fmtMoney(cashFlow.cash_flow?.operating_activities?.cash_out?.total_operating_out || 0)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: (cashFlow.cash_flow?.operating_activities?.net_operating || 0) >= 0 ? COLORS.goodGreen : COLORS.badRed,
                            fontWeight: 'bold'
                          }}
                        >
                          {fmtMoney(cashFlow.cash_flow?.operating_activities?.net_operating || 0)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize', color: 'black' }}>
                            Investing Activities
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: COLORS.goodGreen }}>
                          {fmtMoney(cashFlow.cash_flow?.investing_activities?.cash_in || 0)}
                        </TableCell>
                        <TableCell sx={{ color: COLORS.badRed }}>
                          {fmtMoney(cashFlow.cash_flow?.investing_activities?.cash_out || 0)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: (cashFlow.cash_flow?.investing_activities?.net_investing || 0) >= 0 ? COLORS.goodGreen : COLORS.badRed,
                            fontWeight: 'bold'
                          }}
                        >
                          {fmtMoney(cashFlow.cash_flow?.investing_activities?.net_investing || 0)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize', color: 'black' }}>
                            Financing Activities
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: COLORS.goodGreen }}>
                          {fmtMoney(cashFlow.cash_flow?.financing_activities?.cash_in || 0)}
                        </TableCell>
                        <TableCell sx={{ color: COLORS.badRed }}>
                          {fmtMoney(cashFlow.cash_flow?.financing_activities?.cash_out || 0)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: (cashFlow.cash_flow?.financing_activities?.net_financing || 0) >= 0 ? COLORS.goodGreen : COLORS.badRed,
                            fontWeight: 'bold'
                          }}
                        >
                          {fmtMoney(cashFlow.cash_flow?.financing_activities?.net_financing || 0)}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </MainCard>
        </Grid>
      </Grid>

      {/* Cash Flow Period Information */}
      {cashFlow?.period && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Cash Flow Period: {cashFlow.period.from} to {cashFlow.period.to}
          </Typography>
        </Box>
      )}
    </>
  );
};

export default FinancialStatementsTab;

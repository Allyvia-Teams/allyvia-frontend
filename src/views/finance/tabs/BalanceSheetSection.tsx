import React from 'react';
import { Grid, Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { gridSpacing } from 'store/constant';
import MainCard from 'ui-component/cards/MainCard';
import { AlertStrip } from 'ui-component/frame';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import { useSelector } from 'store';
import type { RootState } from 'store';
import { formatRatio, localToday, ratioOf } from 'utils/financeFormat';
import { balanceGap, balanceSheetTitle } from '../statementsView';

// The QuickBooks balance sheet and its two ratios, moved unchanged from the Financial Statements
// tab (finance tab Task 8). When QuickBooks' own report answered (`is_point_in_time`), the title
// says so; otherwise it keeps today's "Current balances" wording, which a QuickBooks outage returns.

const BalanceSheetSection: React.FC = () => {
  const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const { balanceSheet, loading: loadingState } = useSelector((state: RootState) => state.finance);
  // Extract balance sheet totals from new structure, computing total equity manually
  const totalAssets = balanceSheet?.balance_sheet?.assets?.total_assets || 0;
  const totalLiabilities = balanceSheet?.balance_sheet?.liabilities?.total_liabilities || 0;
  const totalEquity = balanceSheet?.balance_sheet?.equity?.total || 0;

  // Calculate financial ratios
  const currentAssets = balanceSheet?.balance_sheet?.assets?.current_assets?.total || 0;
  const currentLiabilities = balanceSheet?.balance_sheet?.liabilities?.current_liabilities?.total || 0;
  // Both ratios go through ratioOf/formatRatio rather than an inline
  // computation, so an undefined ratio renders as an em dash instead of
  // '0.00'. A company with no current liabilities, or with zero or negative
  // equity, was reading "0.00" on both tiles -- which looks like "no risk"
  // when the truth is either "not computable" or, for negative equity, the
  // opposite. ratioOf already treats denominator <= 0 as undefined, so the
  // negative-equity case is covered by using it. (ALL-15 M2)
  const currentRatioValue = ratioOf(currentAssets, currentLiabilities);
  const debtToEquityValue = ratioOf(totalLiabilities, totalEquity);
  const currentRatio = formatRatio(currentRatioValue);
  const debtToEquityRatio = formatRatio(debtToEquityValue);

  const financialRatiosKPIs = [
    {
      title: 'Current Ratio',
      value: currentRatio,
      theme: currentRatioValue === null ? ('default' as const) : currentRatioValue >= 1.0 ? ('success' as const) : ('alert' as const),
      loading: loadingState.balanceSheet || false
    },
    {
      title: 'Debt to Equity',
      value: debtToEquityRatio,
      theme: debtToEquityValue === null ? ('default' as const) : debtToEquityValue <= 1.0 ? ('success' as const) : ('alert' as const),
      loading: loadingState.balanceSheet || false
    }
  ];

  return (
    <>
      <Grid container spacing={gridSpacing}>
        {financialRatiosKPIs.map((kpi, index) => (
          <Grid size={{ xs: 12, sm: 6 }} key={index}>
            <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} size="medium" loading={kpi.loading} />
          </Grid>
        ))}
      </Grid>
      {/* Balance Sheet Tables */}
      <Grid container spacing={gridSpacing} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12 }}>
          <MainCard title={balanceSheetTitle(balanceSheet, localToday())} sx={{ border: '1px solid #e0e0e0' }}>
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
                              <TableCell align="right" sx={{ py: 1, px: 2 }}>
                                <strong>{fmtMoney(balanceSheet.balance_sheet.assets.current_assets.total)}</strong>
                              </TableCell>
                            </TableRow>
                            {Object.entries(balanceSheet.balance_sheet.assets.current_assets.accounts).map(([accountName, account]) => (
                              <TableRow key={accountName}>
                                <TableCell sx={{ pl: 3, py: 0.5, px: 2 }}>{accountName}</TableCell>
                                <TableCell align="right" sx={{ py: 0.5, px: 2 }}>
                                  {fmtMoney(account.balance)}
                                </TableCell>
                              </TableRow>
                            ))}

                            {/* Fixed Assets */}
                            <TableRow>
                              <TableCell sx={{ py: 1, px: 2 }}>
                                <strong>Fixed Assets</strong>
                              </TableCell>
                              <TableCell align="right" sx={{ py: 1, px: 2 }}>
                                <strong>{fmtMoney(balanceSheet.balance_sheet.assets.fixed_assets.total)}</strong>
                              </TableCell>
                            </TableRow>
                            {Object.entries(balanceSheet.balance_sheet.assets.fixed_assets.accounts).map(([accountName, account]) => (
                              <TableRow key={accountName}>
                                <TableCell sx={{ pl: 3, py: 0.5, px: 2 }}>{accountName}</TableCell>
                                <TableCell align="right" sx={{ py: 0.5, px: 2 }}>
                                  {fmtMoney(account.balance)}
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
                              <TableCell align="right" sx={{ py: 1, px: 2 }}>
                                <strong>{fmtMoney(balanceSheet.balance_sheet.liabilities.current_liabilities.total)}</strong>
                              </TableCell>
                            </TableRow>
                            {Object.entries(balanceSheet.balance_sheet.liabilities.current_liabilities.accounts).map(
                              ([accountName, account]) => (
                                <TableRow key={accountName}>
                                  <TableCell sx={{ pl: 3, py: 0.5, px: 2 }}>{accountName}</TableCell>
                                  <TableCell align="right" sx={{ py: 0.5, px: 2 }}>
                                    {fmtMoney(account.balance)}
                                  </TableCell>
                                </TableRow>
                              )
                            )}

                            {/* Long-term Liabilities */}
                            <TableRow>
                              <TableCell sx={{ py: 1, px: 2 }}>
                                <strong>Long-term Liabilities</strong>
                              </TableCell>
                              <TableCell align="right" sx={{ py: 1, px: 2 }}>
                                <strong>{fmtMoney(balanceSheet.balance_sheet.liabilities.long_term_liabilities.total)}</strong>
                              </TableCell>
                            </TableRow>
                            {Object.entries(balanceSheet.balance_sheet.liabilities.long_term_liabilities.accounts).map(
                              ([accountName, account]) => (
                                <TableRow key={accountName}>
                                  <TableCell sx={{ pl: 3, py: 0.5, px: 2 }}>{accountName}</TableCell>
                                  <TableCell align="right" sx={{ py: 0.5, px: 2 }}>
                                    {fmtMoney(account.balance)}
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
                                <TableCell align="right" sx={{ py: 0.5, px: 2 }}>
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

            {balanceSheet?.balance_sheet && balanceGap(totalAssets, totalLiabilities, totalEquity) !== null && (
              <Box sx={{ mt: 2 }}>
                <AlertStrip
                  title={`Balance sheet is out by ${fmtMoney(balanceGap(totalAssets, totalLiabilities, totalEquity) as number)}.`}
                  body="Re-sync QuickBooks to refresh these balances."
                  action={{ label: 'Integrations', to: '/settings?tab=integrations' }}
                />
              </Box>
            )}
          </MainCard>
        </Grid>
      </Grid>
    </>
  );
};

export default BalanceSheetSection;

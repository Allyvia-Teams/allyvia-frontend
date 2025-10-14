import React, { useMemo } from 'react';
import { Grid, Box, Divider, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { gridSpacing } from 'store/constant';
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';
import { useSelector } from 'store';
import type { RootState } from 'store';
import type { ProfitAndLossData, COGSData, GrossProfitData, BalanceSheetData, CashFlowData } from 'types/finance';

const FinancialStatementsTab: React.FC = () => {
  const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  // Get data directly from Redux with proper types
  const {
    profitAndLoss: pnlSummary,
    cogsDetail,
    grossProfitDetail,
    balanceSheet,
    cashFlow
  } = useSelector((state: RootState) => state.finance);

  // Extract balance sheet totals from new structure
  // Cash Flow KPIs with proper null checks
  const totalCashIn = useMemo(() => {
    if (!cashFlow) return 0;
    return (
      (cashFlow.operating_activities?.cash_in?.total || 0) +
      (cashFlow.investing_activities?.cash_in?.total || 0) +
      (cashFlow.financing_activities?.cash_in?.total || 0)
    );
  }, [cashFlow]);

  const totalCashOut = useMemo(() => {
    if (!cashFlow) return 0;
    return (
      (cashFlow.operating_activities?.cash_out?.total || 0) +
      (cashFlow.investing_activities?.cash_out?.total || 0) +
      (cashFlow.financing_activities?.cash_out?.total || 0)
    );
  }, [cashFlow]);

  const netCashFlow = useMemo(() => {
    if (!cashFlow) return 0;
    return totalCashIn - totalCashOut;
  }, [cashFlow, totalCashIn, totalCashOut]);

  // Extract balance sheet totals from new structure, computing total equity manually
  const totalAssets = balanceSheet?.assets?.total_assets || 0;
  const totalLiabilities = balanceSheet?.liabilities?.total_liabilities || 0;
  const totalEquity =
    (balanceSheet?.equity?.owner_equity || 0) +
    (balanceSheet?.equity?.retained_earnings || 0) +
    (balanceSheet?.equity?.current_earnings || 0);

  return (
    <>
      {/* P&L Summary Cards */}
      <Grid container spacing={gridSpacing} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            value={pnlSummary ? fmtMoney(pnlSummary.total_income) : fmtMoney(0)}
            title="Total Income"
            showIcon={false}
            height={88}
            isTaggable={false}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            value={pnlSummary ? fmtMoney(pnlSummary.cost_of_goods_sold) : fmtMoney(0)}
            title="Cost of Goods Sold"
            showIcon={false}
            height={88}
            isTaggable={false}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            value={pnlSummary ? fmtMoney(pnlSummary.gross_profit) : fmtMoney(0)}
            title="Gross Profit"
            showIcon={false}
            height={88}
            isTaggable={false}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            value={pnlSummary ? fmtMoney(pnlSummary.net_income) : fmtMoney(0)}
            title="Net Income"
            showIcon={false}
            height={88}
            isTaggable={false}
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 1.5 }} />

      {/* P&L Statement and COGS Breakdown */}
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, md: 8 }}>
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
                    <TableCell align="right">{pnlSummary ? fmtMoney(pnlSummary.total_income) : fmtMoney(0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>Cost of Goods Sold</strong>
                    </TableCell>
                    <TableCell align="right">{pnlSummary ? fmtMoney(pnlSummary.cost_of_goods_sold) : fmtMoney(0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>Gross Profit</strong>
                    </TableCell>
                    <TableCell align="right">{pnlSummary ? fmtMoney(pnlSummary.gross_profit) : fmtMoney(0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <strong>Operating Expenses</strong>
                    </TableCell>
                    <TableCell align="right">
                      {pnlSummary ? fmtMoney(pnlSummary.total_expenses - pnlSummary.cost_of_goods_sold) : fmtMoney(0)}
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

        <Grid size={{ xs: 12, md: 4 }}>
          <MainCard title="COGS Breakdown">
            {cogsDetail ? (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cogsDetail?.cost_breakdown?.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell align="right">{fmtMoney(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell>
                        <strong>Total COGS</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{fmtMoney(cogsDetail.total_cost)}</strong>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                No COGS data available
              </Typography>
            )}
          </MainCard>
        </Grid>
      </Grid>
      {/* Period Information */}
      {pnlSummary && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Period: {pnlSummary.period.start_date} to {pnlSummary.period.end_date}
          </Typography>
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Balance Sheet */}
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard value={fmtMoney(totalAssets)} title="Total Assets" showIcon={false} height={88} isTaggable={false} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            value={fmtMoney(totalLiabilities)}
            title="Total Liabilities"
            showIcon={false}
            height={88}
            isTaggable={false}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard value={fmtMoney(totalEquity)} title="Total Equity" showIcon={false} height={88} isTaggable={false} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            value={totalAssets > 0 ? (((totalAssets - totalLiabilities) / totalAssets) * 100).toFixed(1) + '%' : '0%'}
            title="Solvency Ratio"
            showIcon={false}
            height={88}
            isTaggable={false}
          />
        </Grid>
      </Grid>

      {/* Balance Sheet Tables */}
      <Grid container spacing={gridSpacing} sx={{ mt: 2 }}>
        {/* Assets */}
        <Grid size={{ xs: 12, md: 4 }}>
          <MainCard title="Assets" sx={{ textAlign: 'center', fontWeight: 'bold' }}>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Account</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {balanceSheet?.assets && (
                    <>
                      <TableRow>
                        <TableCell>Current Assets</TableCell>
                        <TableCell align="right" sx={{ color: 'success.main' }}>
                          +{fmtMoney(balanceSheet.assets.current_assets.total)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Fixed Assets</TableCell>
                        <TableCell align="right" sx={{ color: 'success.main' }}>
                          +{fmtMoney(balanceSheet.assets.fixed_assets.total)}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                  <TableRow>
                    <TableCell>
                      <strong>Total Assets</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>{fmtMoney(totalAssets)}</strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </MainCard>
        </Grid>

        {/* Liabilities */}
        <Grid size={{ xs: 12, md: 4 }}>
          <MainCard title="Liabilities" sx={{ textAlign: 'center', fontWeight: 'bold' }}>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Account</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {balanceSheet?.liabilities && (
                    <>
                      <TableRow>
                        <TableCell>Current Liabilities</TableCell>
                        <TableCell align="right" sx={{ color: 'error.main' }}>
                          -{fmtMoney(balanceSheet.liabilities.current_liabilities.total)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Long-term Liabilities</TableCell>
                        <TableCell align="right" sx={{ color: 'error.main' }}>
                          -{fmtMoney(balanceSheet.liabilities.long_term_liabilities.total)}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                  <TableRow>
                    <TableCell>
                      <strong>Total Liabilities</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>{fmtMoney(totalLiabilities)}</strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </MainCard>
        </Grid>

        {/* Equity */}
        <Grid size={{ xs: 12, md: 4 }}>
          <MainCard title="Equity" sx={{ textAlign: 'center', fontWeight: 'bold' }}>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Account</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {balanceSheet?.equity && (
                    <>
                      <TableRow>
                        <TableCell>Owner Equity</TableCell>
                        <TableCell align="right" sx={{ color: 'success.main' }}>
                          +{fmtMoney(balanceSheet.equity.owner_equity)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Retained Earnings</TableCell>
                        <TableCell align="right" sx={{ color: 'success.main' }}>
                          +{fmtMoney(balanceSheet.equity.retained_earnings)}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                  <TableRow>
                    <TableCell>
                      <strong>Total Equity</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>{fmtMoney(totalEquity)}</strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </MainCard>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Cash Flow */}
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard value={fmtMoney(totalCashIn)} title="Total Cash In" showIcon={false} height={88} isTaggable={false} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard value={fmtMoney(totalCashOut)} title="Total Cash Out" showIcon={false} height={88} isTaggable={false} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard value={fmtMoney(netCashFlow)} title="Net Cash Flow" showIcon={false} height={88} isTaggable={false} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            value={fmtMoney(cashFlow?.ending_cash || 0)}
            title="Ending Cash"
            showIcon={false}
            height={88}
            isTaggable={false}
          />
        </Grid>
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
                          <Typography variant="body2" sx={{ textTransform: 'capitalize', color: 'primary.main' }}>
                            Operating Activities
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: 'success.main' }}>
                          {fmtMoney(cashFlow?.operating_activities?.cash_in?.total || 0)}
                        </TableCell>
                        <TableCell sx={{ color: 'error.main' }}>{fmtMoney(cashFlow?.operating_activities?.cash_out?.total || 0)}</TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: (cashFlow?.operating_activities?.net_operating || 0) >= 0 ? 'success.main' : 'error.main',
                            fontWeight: 'bold'
                          }}
                        >
                          {fmtMoney(cashFlow?.operating_activities?.net_operating || 0)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize', color: 'secondary.main' }}>
                            Investing Activities
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: 'success.main' }}>
                          {fmtMoney(cashFlow?.investing_activities?.cash_in?.total || 0)}
                        </TableCell>
                        <TableCell sx={{ color: 'error.main' }}>{fmtMoney(cashFlow?.investing_activities?.cash_out?.total || 0)}</TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: (cashFlow?.investing_activities?.net_investing || 0) >= 0 ? 'success.main' : 'error.main',
                            fontWeight: 'bold'
                          }}
                        >
                          {fmtMoney(cashFlow?.investing_activities?.net_investing || 0)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize', color: 'info.main' }}>
                            Financing Activities
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: 'success.main' }}>
                          {fmtMoney(cashFlow?.financing_activities?.cash_in?.total || 0)}
                        </TableCell>
                        <TableCell sx={{ color: 'error.main' }}>{fmtMoney(cashFlow?.financing_activities?.cash_out?.total || 0)}</TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: (cashFlow?.financing_activities?.net_financing || 0) >= 0 ? 'success.main' : 'error.main',
                            fontWeight: 'bold'
                          }}
                        >
                          {fmtMoney(cashFlow?.financing_activities?.net_financing || 0)}
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
    </>
  );
};

export default FinancialStatementsTab;

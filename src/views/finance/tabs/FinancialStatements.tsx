import React from 'react';
import { Grid, Box, Divider, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { gridSpacing } from 'store/constant';
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';
import type { ProfitAndLossSummary, COGSDetail, GrossProfitDetail, BalanceSheetRow, CashFlowRow } from 'types/finance';

interface FinancialStatementsTabProps {
  pnlSummary: ProfitAndLossSummary | null;
  cogsDetail: COGSDetail | null;
  grossProfitDetail: GrossProfitDetail | null;
  balanceSheet: BalanceSheetRow[];
  cashFlow: CashFlowRow[];
  startISO: string;
  endISO: string;
}

const FinancialStatementsTab: React.FC<FinancialStatementsTabProps> = ({
  pnlSummary,
  cogsDetail,
  grossProfitDetail,
  balanceSheet,
  cashFlow,
  startISO,
  endISO
}) => {
  const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  // Group balance sheet by category - with safety checks
  const assets = balanceSheet?.filter((row) => row.category === 'asset') || [];
  const liabilities = balanceSheet?.filter((row) => row.category === 'liability') || [];
  const equity = balanceSheet?.filter((row) => row.category === 'equity') || [];

  const totalAssets = assets.reduce((sum, row) => sum + row.amount, 0);
  const totalLiabilities = liabilities.reduce((sum, row) => sum + row.amount, 0);
  const totalEquity = equity.reduce((sum, row) => sum + row.amount, 0);

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
                    {cogsDetail?.cost_breakdown?.map((item, index) => (
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

      {/* Monthly Gross Profit Trend */}
      {grossProfitDetail && grossProfitDetail.monthly_breakdown.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={gridSpacing}>
            <Grid size={{ xs: 12 }}>
              <MainCard title="Monthly Gross Profit Trend">
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Period</TableCell>
                        <TableCell align="right">Income</TableCell>
                        <TableCell align="right">COGS</TableCell>
                        <TableCell align="right">Gross Profit</TableCell>
                        <TableCell align="right">Margin %</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {grossProfitDetail.monthly_breakdown.map((month, index) => (
                        <TableRow key={index}>
                          <TableCell>{month.period}</TableCell>
                          <TableCell align="right">{fmtMoney(month.total_income)}</TableCell>
                          <TableCell align="right">{fmtMoney(month.cost_of_goods_sold)}</TableCell>
                          <TableCell align="right">{fmtMoney(month.gross_profit)}</TableCell>
                          <TableCell align="right">{(month.gross_margin_percentage * 100).toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </MainCard>
            </Grid>
          </Grid>
        </>
      )}

      {/* Period Information */}
      {pnlSummary && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Period: {pnlSummary.period}
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
                  {assets.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.account}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>
                        +{fmtMoney(row.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
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
                  {liabilities.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.account}</TableCell>
                      <TableCell align="right" sx={{ color: 'error.main' }}>
                        -{fmtMoney(row.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
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
                  {equity.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.account}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>
                        +{fmtMoney(row.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
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
          <TotalIncomeDarkCard
            value={fmtMoney(cashFlow?.reduce((sum, row) => sum + row.cash_in, 0) || 0)}
            title="Total Cash In"
            showIcon={false}
            height={88}
            isTaggable={false}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            value={fmtMoney(cashFlow?.reduce((sum, row) => sum + row.cash_out, 0) || 0)}
            title="Total Cash Out"
            showIcon={false}
            height={88}
            isTaggable={false}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            value={fmtMoney(cashFlow?.reduce((sum, row) => sum + row.net_cash_flow, 0) || 0)}
            title="Net Cash Flow"
            showIcon={false}
            height={88}
            isTaggable={false}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            value={(cashFlow?.length || 0).toString()}
            title="Cash Flow Items"
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
                    <TableCell>Type</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Cash In</TableCell>
                    <TableCell align="right">Cash Out</TableCell>
                    <TableCell align="right">Net Flow</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cashFlow?.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            textTransform: 'capitalize',
                            color: row.type === 'operating' ? 'primary.main' : row.type === 'investing' ? 'secondary.main' : 'info.main'
                          }}
                        >
                          {row.type}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.description}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>
                        {row.cash_in > 0 ? fmtMoney(row.cash_in) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'error.main' }}>
                        {row.cash_out > 0 ? fmtMoney(row.cash_out) : '—'}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color: row.net_cash_flow >= 0 ? 'success.main' : 'error.main',
                          fontWeight: 'bold'
                        }}
                      >
                        {fmtMoney(row.net_cash_flow)}
                      </TableCell>
                    </TableRow>
                  ))}
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

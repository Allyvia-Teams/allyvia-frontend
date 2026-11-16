import React from 'react';
import { Grid, Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { gridSpacing } from 'store/constant';
import MainCard from 'ui-component/cards/MainCard';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import { useSelector } from 'store';
import type { RootState } from 'store';
import { COLORS } from 'styles/colors';

// The QuickBooks cash flow statement, moved unchanged from the Financial Statements tab
// (finance tab Task 8) to the Cash page.

const CashFlowSection: React.FC = () => {
  const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const { cashFlow, loading: loadingState } = useSelector((state: RootState) => state.finance);
  const totalCashIn = React.useMemo(() => {
    if (!cashFlow) return 0;
    return cashFlow.cash_flow?.summary?.cash_in_total || 0;
  }, [cashFlow]);

  const totalCashOut = React.useMemo(() => {
    if (!cashFlow) return 0;
    return cashFlow.cash_flow?.summary?.cash_out_total || 0;
  }, [cashFlow]);

  const netCashFlow = React.useMemo(() => {
    if (!cashFlow) return 0;
    return cashFlow.cash_flow?.summary?.net_cash_flow || 0;
  }, [cashFlow]);

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

export default CashFlowSection;

import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Link
} from '@mui/material';
import { CRMAnalyticsStalledResponse } from 'types/analytics';

interface CRMAnalyticsTablesProps {
  stalledData?: CRMAnalyticsStalledResponse;
  isLoading: boolean;
}

const CRMAnalyticsTables: React.FC<CRMAnalyticsTablesProps> = ({ stalledData, isLoading }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStageColor = (stage: string) => {
    const stageColors: { [key: string]: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' } = {
      Prospecting: 'default',
      Qualification: 'info',
      Proposal: 'primary',
      Negotiation: 'warning',
      'Closed Won': 'success',
      'Closed Lost': 'error'
    };
    return stageColors[stage] || 'default';
  };

  return (
    <Grid container spacing={3}>
      {/* Stalled Deals */}
      <Grid size={{ xs: 12, lg: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Stalled Deals (No Activity &gt; 14 Days)
            </Typography>
            {isLoading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : stalledData?.deals?.length ? (
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Deal</TableCell>
                      <TableCell>Stage</TableCell>
                      <TableCell align="right">Value</TableCell>
                      <TableCell align="right">Days No Activity</TableCell>
                      <TableCell>Last Activity</TableCell>
                      <TableCell>Owner</TableCell>
                      <TableCell>Next Step</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stalledData.deals.map((deal) => (
                      <TableRow key={deal.id} hover>
                        <TableCell>
                          <Link href="/crm" underline="hover">
                            {deal.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Chip label={deal.stage} color={getStageColor(deal.stage)} size="small" />
                        </TableCell>
                        <TableCell align="right">{formatCurrency(deal.value)}</TableCell>
                        <TableCell align="right">{deal.days_no_activity}</TableCell>
                        <TableCell>{formatDate(deal.last_activity)}</TableCell>
                        <TableCell>{deal.owner}</TableCell>
                        <TableCell>No next step</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="textSecondary">No stalled deals found</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default CRMAnalyticsTables;

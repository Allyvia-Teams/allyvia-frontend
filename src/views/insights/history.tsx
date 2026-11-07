// /insights/history (insights redesign S5). Only the redesigned page links
// here, so with VITE_INSIGHTS_REDESIGN off the route sends people back to
// /insights. The module gate is /insights's: moduleAccess.ts matches
// '/insights' as a prefix.

import { Navigate } from 'react-router-dom';

import { Box, Container } from '@mui/material';

import InsightsHistoryPage from 'features/insights/InsightsHistoryPage';
import { getInsightsMode } from 'features/insights/flag';

export default function InsightsHistory() {
  if (getInsightsMode() === 'off') return <Navigate to="/insights" replace />;
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <InsightsHistoryPage />
      </Box>
    </Container>
  );
}

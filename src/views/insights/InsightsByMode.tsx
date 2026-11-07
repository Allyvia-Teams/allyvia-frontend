// Which /insights layout renders, by VITE_INSIGHTS_REDESIGN (features/insights/flag.ts).
//
//   off          today's page, exactly as before: profile card, analytics, survey
//   mock / live  the new InsightsPage on top, then today's content in two
//                collapsed sections ("Analytics", "Business profile")
//
// The legacy pieces arrive as nodes so this file stays free of the store and
// the analytics slice, and can be rendered statically in a test.

import type { ReactNode } from 'react';

import { Box, Container } from '@mui/material';

import InsightsPage from 'features/insights/InsightsPage';
import CollapsibleSection from 'features/insights/components/CollapsibleSection';
import type { InsightsMode } from 'features/insights/flag';

interface InsightsByModeProps {
  mode: InsightsMode;
  profileCard: ReactNode;
  analytics: ReactNode;
  survey: ReactNode;
}

export default function InsightsByMode({ mode, profileCard, analytics, survey }: InsightsByModeProps) {
  if (mode === 'off') {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          {profileCard}
          {analytics}
          <Box sx={{ mt: 3 }}>{survey}</Box>
        </Box>
      </Container>
    );
  }

  // About 1020px of content, centered (S6). The gutters shrink from 24px to 16px below lg (1024px).
  return (
    <Container maxWidth={false} sx={{ maxWidth: { xs: 1020 + 32, lg: 1020 + 48 }, px: { xs: 2, lg: 3 } }} data-insights-content>
      <Box sx={{ py: 3 }}>
        <InsightsPage />
        <CollapsibleSection name="analytics" title="Analytics">
          {analytics}
        </CollapsibleSection>
        <CollapsibleSection name="business-profile" title="Business profile">
          {profileCard}
          <Box sx={{ mt: 3 }}>{survey}</Box>
        </CollapsibleSection>
      </Box>
    </Container>
  );
}

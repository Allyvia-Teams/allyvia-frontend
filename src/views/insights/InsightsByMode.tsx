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

  // Full width of the page frame, like every other tab; the layout supplies the gutters.
  return (
    <Box data-insights-content>
      <InsightsPage />
      <CollapsibleSection name="analytics" title="Analytics">
        {analytics}
      </CollapsibleSection>
      <CollapsibleSection name="business-profile" title="Business profile">
        {profileCard}
        <Box sx={{ mt: 3 }}>{survey}</Box>
      </CollapsibleSection>
    </Box>
  );
}

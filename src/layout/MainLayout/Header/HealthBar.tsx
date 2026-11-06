import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useHealth } from 'api/health.api';
import HealthDrawer from './HealthDrawer';
import type { HealthView } from 'health/buildHealthView';

export default function HealthBar() {
  const { view, identity } = useHealth();
  return view && identity ? <HealthBarView key={identity} view={view} identity={identity} /> : null;
}

export function HealthBarView({ view, identity }: { view: HealthView; identity: string }) {
  const [openedIdentity, setOpenedIdentity] = useState<string>();
  return (
    <>
      <Button
        aria-label={`${view.label}: ${view.scoreText}${view.mode ? `, ${view.mode}` : ''}${view.provisional ? ', provisional' : ''}. Open details`}
        aria-haspopup="dialog"
        aria-expanded={openedIdentity === identity}
        onClick={() => setOpenedIdentity(identity)}
        sx={{ color: 'text.primary', mx: 1, minWidth: 120 }}
      >
        <Box sx={{ width: 120, textAlign: 'left' }}>
          <Typography variant="caption" component="span">
            {view.label}
          </Typography>
          <Box aria-hidden="true" sx={{ height: 6, borderRadius: 1, my: 0.5, bgcolor: 'action.disabledBackground', overflow: 'hidden' }}>
            <Box
              sx={{
                width: `${view.score ?? 0}%`,
                height: '100%',
                bgcolor: view.color,
                backgroundImage: view.provisional
                  ? 'repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(255,255,255,.55) 3px, rgba(255,255,255,.55) 5px)'
                  : undefined
              }}
            />
          </Box>
          <Typography variant="caption" component="span">
            {view.scoreText} {view.mode}
          </Typography>
        </Box>
      </Button>
      <HealthDrawer view={view} open={openedIdentity === identity} onClose={() => setOpenedIdentity(undefined)} />
    </>
  );
}

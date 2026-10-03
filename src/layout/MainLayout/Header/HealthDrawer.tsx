import { Box, Button, Divider, Drawer, Stack, Typography } from '@mui/material';
import type { HealthView } from 'health/buildHealthView';

export default function HealthDrawer({ view, open, onClose }: { view: HealthView; open: boolean; onClose: () => void }) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box role="dialog" aria-modal="true" aria-labelledby="health-title" sx={{ width: { xs: 'min(100vw, 420px)', sm: 420 }, p: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography id="health-title" variant="h3">
            {view.label}
          </Typography>
          <Button autoFocus onClick={onClose} aria-label="Close health details">
            Close
          </Button>
        </Stack>
        {view.location && <Typography>{view.location}</Typography>}
        <Typography sx={{ mt: 2 }} variant="h4">
          {view.scoreText} {view.mode}
        </Typography>
        <Typography sx={{ my: 2 }}>
          Calculated from observed business inputs. {view.provisional ? 'Provisional assessment.' : ''}
        </Typography>
        <Typography color="text.secondary">{view.coverage}</Typography>
        <Stack divider={<Divider />} sx={{ my: 2 }} spacing={2}>
          {view.rows.map((row) => (
            <Box key={row.key}>
              <Typography variant="subtitle1">
                {row.label}: {row.score}
              </Typography>
              <Typography color="text.secondary">{row.detail}</Typography>
            </Box>
          ))}
        </Stack>
        <Typography variant="h4">12-month outlook</Typography>
        <Typography sx={{ my: 1 }}>{view.projection}</Typography>
        {view.gaps.length > 0 && (
          <>
            <Typography variant="h4" sx={{ mt: 2 }}>
              Coverage gaps and limits
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              {view.gaps.map((gap, index) => (
                <li key={`${gap}-${index}`}>
                  <Typography>{gap}</Typography>
                </li>
              ))}
            </Box>
          </>
        )}
        <Typography variant="caption" color="text.secondary">
          As of {view.asOf} · {view.source === 'snapshot' ? 'Daily snapshot' : 'Live assessment'} · Observed {view.observedAt}
        </Typography>
      </Box>
    </Drawer>
  );
}

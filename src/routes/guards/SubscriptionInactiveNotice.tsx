import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'store';
import { logoutAsync } from 'store/slices/auth';

/**
 * Shown instead of the plan picker when the subscription has lapsed and the
 * person at the screen may not manage billing (a locked kiosk, a member).
 * Only the owner can renew, from their own sign-in.
 *
 * `retryTo` is where the member guard would have sent this screen. The router
 * keeps the subscription gate's marker on this history entry across reloads,
 * so once the owner renews, a reload alone would still land here: Try again
 * goes there without the marker, and the gate brings it back only if the
 * subscription is still lapsed.
 */
export default function SubscriptionInactiveNotice({ retryTo }: { retryTo: string }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Paper variant="outlined" sx={{ p: 4, maxWidth: 440, width: '100%' }}>
        <Stack spacing={2}>
          <Typography variant="h3">This store&apos;s subscription isn&apos;t active</Typography>
          <Typography variant="body1" color="text.secondary">
            Allyvia is paused for this store until the subscription is renewed. Ask the owner to sign in on their own device and renew it
            from the plan page.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" fullWidth onClick={() => navigate(retryTo, { replace: true })}>
              Try again
            </Button>
            <Button variant="outlined" color="inherit" onClick={() => dispatch(logoutAsync())} sx={{ whiteSpace: 'nowrap' }}>
              Sign out
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}

import { useNavigate } from 'react-router-dom';

import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

import Branding from 'ui-component/settings/Branding';

// ==============================|| ONBOARDING — MAKE IT YOURS ||============================== //
//
// Optional post-checkout branding step. Reuses the Phase-2 Branding panel (in "onboarding" variant)
// which persists via the Phase-3 endpoint. Both "Apply & continue" and "Skip for now" land the
// user on the dashboard; skipping keeps the Allyvia default.

export default function BrandingOnboarding() {
  const navigate = useNavigate();
  const goToDashboard = () => navigate('/dashboard', { replace: true });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'grey.200' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  A
                </Typography>
              </Avatar>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Allyvia
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Optional
            </Typography>
          </Box>
        </Container>
      </Paper>

      <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 } }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h2" sx={{ fontWeight: 700, mb: 1 }}>
            Make it yours
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, mx: 'auto' }}>
            Add your logo and brand colors to theme Allyvia for your whole team — or skip and use the Allyvia default. You can change this
            anytime in Settings.
          </Typography>
        </Box>

        <Paper elevation={0} sx={{ borderRadius: 4, border: 1, borderColor: 'grey.200', p: { xs: 2, sm: 4 } }}>
          <Branding variant="onboarding" onDone={goToDashboard} />
        </Paper>
      </Container>
    </Box>
  );
}

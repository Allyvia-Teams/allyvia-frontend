import React from 'react';
import { Box, Button, Container, Typography, Stack } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconShieldX, IconHome } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';

/**
 * 403 Unauthorized Page
 *
 * Shown when user tries to access a route they don't have permission for.
 */
export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/dashboard';

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4
        }}
      >
        <MainCard>
          <Stack spacing={3} alignItems="center" sx={{ py: 4, px: 2 }}>
            <IconShieldX size={64} stroke={1.5} style={{ color: '#f44336' }} />
            <Typography variant="h4" component="h1" align="center" sx={{ fontWeight: 600 }}>
              Access Denied
            </Typography>
            <Typography variant="body1" align="center" color="text.secondary">
              You don't have permission to access this page.
            </Typography>
            {from && from !== location.pathname && (
              <Typography variant="body2" align="center" color="text.secondary">
                Attempted to access: <strong>{from}</strong>
              </Typography>
            )}
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button variant="contained" startIcon={<IconHome size={18} />} onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
              <Button variant="outlined" onClick={() => navigate(-1)}>
                Go Back
              </Button>
            </Stack>
          </Stack>
        </MainCard>
      </Box>
    </Container>
  );
}

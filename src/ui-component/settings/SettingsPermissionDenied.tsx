import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { IconLock, IconArrowLeft } from '@tabler/icons-react';

export interface SettingsPermissionDeniedProps {
  currentRoleDisplay?: string;
}

export default function SettingsPermissionDenied({ currentRoleDisplay }: SettingsPermissionDeniedProps) {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 } }}>
      <Box
        sx={{
          textAlign: 'center',
          px: 2,
          py: 4,
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: (t) => `1px solid ${t.palette.divider}`,
          boxShadow: (t) => t.shadows[1]
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: 'action.hover',
              color: 'text.secondary',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IconLock size={32} stroke={1.5} />
          </Box>
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
          Access restricted
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2, maxWidth: 400, mx: 'auto' }}>
          Settings are available only to administrators. Your current role
          {currentRoleDisplay ? (
            <> ({currentRoleDisplay})</>
          ) : (
            ''
          )}{' '}
          does not have permission to view or change settings.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          If you need access, please ask an administrator to change your role or contact your account owner.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<IconArrowLeft size={20} stroke={1.5} />}
          onClick={() => navigate('/dashboard', { replace: true })}
          sx={{ textTransform: 'none' }}
        >
          Go to Dashboard
        </Button>
      </Box>
    </Container>
  );
}

import { useState } from 'react';
import useSWR from 'swr';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { IconLock } from '@tabler/icons-react';

import SettingsSectionCard from './SettingsSectionCard';
import ChangePasswordDialog from './security/ChangePasswordDialog';
import TwoFactorSetupWizard from './security/TwoFactorSetupWizard';
import TwoFactorDisableDialog from './security/TwoFactorDisableDialog';
import { getTwoFactorStatus } from 'api/twofa';
import useAuth from 'hooks/useAuth';

export default function Security() {
  const { data, isLoading, mutate } = useSWR('twofa-status', getTwoFactorStatus);
  const { logout } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await logout();
    } catch (err) {
      console.error(err);
      setSigningOut(false);
    }
  };

  const enabled = !!data?.enabled;

  return (
    <SettingsSectionCard
      title="Security"
      description="Password and two-factor authentication"
      icon={<IconLock size={24} stroke={1.5} />}
    >
      <Stack spacing={3}>
        {/* Password section */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Password
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Update the password you use to sign in.
              </Typography>
            </Box>
            <Button variant="outlined" size="small" onClick={() => setPasswordOpen(true)}>
              Change password
            </Button>
          </Stack>
        </Box>

        {/* 2FA section */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Two-factor authentication
                </Typography>
                {isLoading || !data ? (
                  <Skeleton variant="rounded" width={70} height={22} />
                ) : (
                  <Chip
                    label={enabled ? 'Enabled' : 'Disabled'}
                    size="small"
                    color={enabled ? 'success' : 'default'}
                    variant="outlined"
                  />
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Add an extra step at sign-in using an authenticator app.
              </Typography>
            </Box>
            {isLoading || !data ? (
              <Skeleton variant="rounded" width={90} height={32} />
            ) : enabled ? (
              <Button variant="outlined" color="error" size="small" onClick={() => setDisableOpen(true)}>
                Disable
              </Button>
            ) : (
              <Button variant="contained" size="small" onClick={() => setSetupOpen(true)}>
                Enable
              </Button>
            )}
          </Stack>
        </Box>

        {/* Sign out section */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Sign out
              </Typography>
              <Typography variant="body2" color="text.secondary">
                End your session on this device.
              </Typography>
            </Box>
            <Button variant="outlined" color="error" size="small" onClick={handleLogout} disabled={signingOut}>
              {signingOut ? 'Signing out...' : 'Sign out'}
            </Button>
          </Stack>
        </Box>
      </Stack>

      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <TwoFactorSetupWizard
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        onCompleted={() => mutate()}
      />
      <TwoFactorDisableDialog
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
        onDisabled={() => mutate()}
      />
    </SettingsSectionCard>
  );
}

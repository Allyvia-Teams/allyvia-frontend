import React, { useEffect } from 'react';
import { Container, Stack, Typography, Alert, Paper, Snackbar, Box } from '@mui/material';
import { useDispatch, useSelector } from 'store';
import { loadMyProfile } from 'store/profileSlice';
import ProfileForm from 'ui-component/profile/ProfileForm';
import { COLORS } from 'styles/colors';

export default function MyProfile() {
  const dispatch = useDispatch();
  const { profile, isLoading, error } = useSelector((s) => s.profile);
  const [openError, setOpenError] = React.useState(false);

  useEffect(() => {
    if (!profile) {
      dispatch(loadMyProfile());
    }
  }, [dispatch]);

  useEffect(() => {
    if (error) setOpenError(true);
  }, [error]);

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${COLORS.brandBlue} 0%, ${COLORS.blue700} 100%)`,
            color: COLORS.white
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            My Profile
          </Typography>
          <Typography variant="body2">Manage your personal information and preferences</Typography>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          {profile ? <ProfileForm profile={profile} /> : <Typography>{isLoading ? 'Loading…' : 'No profile found'}</Typography>}
        </Paper>
        <Snackbar open={openError} autoHideDuration={3000} onClose={() => setOpenError(false)} message={error} />
      </Stack>
    </Container>
  );
}

import React, { useEffect } from 'react';
import { Container, Stack, Typography, Alert, Paper, Snackbar, Box } from '@mui/material';
import { useDispatch, useSelector } from 'store';
import { loadMyProfile } from 'store/profileSlice';
import ProfileForm from 'ui-component/profile/ProfileForm';

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
            p: { xs: 2, sm: 3 },
            borderRadius: 2,
            background: (t) => `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)`,
            color: (t) => t.palette.common.white
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            My Profile
          </Typography>
          <Typography variant="body2">Manage your personal information and preferences</Typography>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }} elevation={1}>
          {profile ? <ProfileForm profile={profile} /> : <Typography>{isLoading ? 'Loading…' : 'No profile found'}</Typography>}
        </Paper>
        <Snackbar open={openError} autoHideDuration={3000} onClose={() => setOpenError(false)} message={error} />
      </Stack>
    </Container>
  );
}

import React, { useEffect } from 'react';
import { Container, Stack, Typography, Alert, Paper, Snackbar } from '@mui/material';
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
        <Typography variant="h4">My Profile</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <Paper sx={{ p: 2 }}>
          {profile ? <ProfileForm profile={profile} /> : <Typography>{isLoading ? 'Loading…' : 'No profile found'}</Typography>}
        </Paper>
        <Snackbar open={openError} autoHideDuration={3000} onClose={() => setOpenError(false)} message={error} />
      </Stack>
    </Container>
  );
}

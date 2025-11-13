import React, { useEffect } from 'react';
import { Typography, Alert, Snackbar } from '@mui/material';
import { useDispatch, useSelector } from 'store';
import { loadMyProfile } from 'store/profileSlice';
import ProfileForm from './ProfileForm';
import type { MyProfile } from 'api/profile';

type Props = {
  editMode?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
};

/**
 * ProfileInfoWidget - Redux-based profile management widget
 *
 * Features:
 * - Loads profile from Redux store
 * - Displays ProfileForm for editing
 * - Handles errors with Snackbar
 * - Full profile management (name, email, phone, avatar, preferences)
 */
export default function ProfileInfoWidget({ editMode = false, onSaved, onCancel }: Props) {
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

  const handleSaved = (p: MyProfile) => {
    onSaved?.();
  };

  return (
    <>
      {error && <Alert severity="error">{error}</Alert>}
      {profile ? (
        <ProfileForm profile={profile} editMode={editMode} onSaved={handleSaved} onCancel={onCancel} />
      ) : (
        <Typography>{isLoading ? 'Loading…' : 'No profile found'}</Typography>
      )}
      <Snackbar open={openError} autoHideDuration={3000} onClose={() => setOpenError(false)} message={error} />
    </>
  );
}

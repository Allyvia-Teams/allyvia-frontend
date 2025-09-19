import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, TextField } from '@mui/material';
import type { CreateContact, UpdateContact, Contact } from 'types/crm';

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: Contact | null;
  onSubmit: (data: CreateContact | UpdateContact) => Promise<void> | void;
  isSubmitting?: boolean;
  serverErrors?: Record<string, string[]> | null;
};

export default function ContactForm({ open, onClose, initial, onSubmit, isSubmitting, serverErrors }: Props) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors }
  } = useForm<CreateContact | UpdateContact>({
    defaultValues: initial
      ? {
          name: initial.name,
          email: initial.email,
          phone: initial.phone || '',
          company_name: initial.company_name || '',
          notes: initial.notes || ''
        }
      : {
          name: '',
          email: '',
          phone: '',
          company_name: '',
          notes: ''
        }
  });

  useEffect(() => {
    if (serverErrors && serverErrors.email) {
      setError('email', { type: 'server', message: serverErrors.email.join(', ') });
    }
  }, [serverErrors, setError]);

  useEffect(() => {
    if (open) {
      reset(
        initial
          ? {
              name: initial.name,
              email: initial.email,
              phone: initial.phone || '',
              company_name: initial.company_name || '',
              notes: initial.notes || ''
            }
          : { name: '', email: '', phone: '', company_name: '', notes: '' }
      );
    }
  }, [open, initial, reset]);

  const onSubmitHandler = async (data: CreateContact | UpdateContact) => {
    await onSubmit(data);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Name"
              fullWidth
              {...register('name', { required: 'Name is required' })}
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Email"
              fullWidth
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email format' }
              })}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField label="Phone" fullWidth {...register('phone')} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField label="Company" fullWidth {...register('company_name')} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField label="Notes" fullWidth multiline minRows={3} {...register('notes')} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={!!isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit(onSubmitHandler)} variant="contained" disabled={!!isSubmitting}>
          {initial ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

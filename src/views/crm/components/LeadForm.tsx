import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, TextField, MenuItem, Autocomplete } from '@mui/material';
import type { CreateLead, UpdateLead, Lead, Contact } from 'types/crm';
import { useContacts } from 'hooks/useContacts';

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: Lead | null;
  onSubmit: (data: CreateLead | UpdateLead) => Promise<void> | void;
  isSubmitting?: boolean;
  serverErrors?: Record<string, string[]> | null;
};

export default function LeadForm({ open, onClose, initial, onSubmit, isSubmitting, serverErrors }: Props) {
  const {
    control,
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors }
  } = useForm<CreateLead | UpdateLead>({
    defaultValues: initial
      ? {
          contact: initial.contact,
          status: initial.status,
          priority: initial.priority,
          score: initial.score,
          estimated_value: initial.estimated_value,
          expected_close_date: initial.expected_close_date || undefined,
          assigned_to: initial.assigned_to || ''
        }
      : {
          contact: '',
          status: 'New',
          priority: 'Medium',
          score: 0,
          estimated_value: 0,
          expected_close_date: undefined,
          assigned_to: ''
        }
  });

  useEffect(() => {
    if (serverErrors) {
      Object.entries(serverErrors).forEach(([key, msgs]) => {
        setError(key as any, { type: 'server', message: msgs.join(', ') });
      });
    }
  }, [serverErrors, setError]);

  useEffect(() => {
    if (open) {
      reset(
        initial
          ? {
              contact: initial.contact,
              status: initial.status,
              priority: initial.priority,
              score: initial.score,
              estimated_value: initial.estimated_value,
              expected_close_date: initial.expected_close_date || undefined,
              assigned_to: initial.assigned_to || ''
            }
          : {
              contact: '',
              status: 'New',
              priority: 'Medium',
              score: 0,
              estimated_value: 0,
              expected_close_date: undefined,
              assigned_to: ''
            }
      );
    }
  }, [open, initial, reset]);

  // Contacts for selector (simple first page)
  const { data: contactsPage } = useContacts({ page: 1, page_size: 50 });
  const contacts = contactsPage?.results || [];

  const onSubmitHandler = async (data: CreateLead | UpdateLead) => {
    await onSubmit(data);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial ? 'Edit Lead' : 'Add Lead'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Contact selector */}
          <Grid item xs={12}>
            <Controller
              control={control}
              name="contact"
              rules={{ required: 'Contact is required' }}
              render={({ field }) => (
                <Autocomplete
                  options={contacts as unknown as Contact[]}
                  getOptionLabel={(c) => (c?.name ? c.name : '')}
                  value={(contacts as unknown as Contact[]).find((c) => c.id === field.value) || null}
                  onChange={(_, val) => field.onChange(val ? (val as any).id : '')}
                  renderInput={(params) => (
                    <TextField {...params} label="Contact" error={!!errors.contact} helperText={(errors as any).contact?.message} />
                  )}
                />
              )}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField select label="Status" fullWidth defaultValue={watch('status') || 'New'} {...register('status', { required: true })}>
              {['New', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'].map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6}>
            <TextField
              select
              label="Priority"
              fullWidth
              defaultValue={watch('priority') || 'Medium'}
              {...register('priority', { required: true })}
            >
              {['Low', 'Medium', 'High'].map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={6}>
            <TextField type="number" label="Score" fullWidth {...register('score', { valueAsNumber: true })} />
          </Grid>
          <Grid item xs={6}>
            <TextField type="number" label="Value ($)" fullWidth {...register('estimated_value', { valueAsNumber: true })} />
          </Grid>

          <Grid item xs={6}>
            <TextField
              type="date"
              label="Expected Close"
              fullWidth
              InputLabelProps={{ shrink: true }}
              {...register('expected_close_date')}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Assigned To" fullWidth {...register('assigned_to')} />
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

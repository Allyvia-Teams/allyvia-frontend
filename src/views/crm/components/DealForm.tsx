import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  MenuItem,
  Autocomplete,
  InputAdornment
} from '@mui/material';
import type { CreateDeal, UpdateDeal, Deal, Contact } from 'types/crm';
import { useContacts } from 'hooks/useContacts';

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: Deal | null;
  onSubmit: (data: CreateDeal | UpdateDeal) => Promise<void> | void;
  isSubmitting?: boolean;
  serverErrors?: Record<string, string[]> | null;
};

export default function DealForm({ open, onClose, initial, onSubmit, isSubmitting, serverErrors }: Props) {
  const {
    control,
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors }
  } = useForm<CreateDeal | UpdateDeal>({
    defaultValues: initial
      ? {
          contact: initial.contact,
          name: initial.name,
          description: initial.description || '',
          value: initial.value,
          stage: initial.stage,
          probability: initial.probability,
          expected_close_date: initial.expected_close_date || undefined,
          assigned_to: initial.assigned_to || ''
        }
      : {
          contact: '',
          name: '',
          description: '',
          value: 0,
          stage: 'Prospecting',
          probability: 0,
          expected_close_date: undefined,
          assigned_to: ''
        }
  });

  useEffect(() => {
    if (serverErrors) {
      Object.entries(serverErrors).forEach(([key, msgs]) => setError(key as any, { type: 'server', message: msgs.join(', ') }));
    }
  }, [serverErrors, setError]);

  useEffect(() => {
    if (open) {
      reset(
        initial
          ? {
              contact: initial.contact,
              name: initial.name,
              description: initial.description || '',
              value: initial.value,
              stage: initial.stage,
              probability: initial.probability,
              expected_close_date: initial.expected_close_date || undefined,
              assigned_to: initial.assigned_to || ''
            }
          : {
              contact: '',
              name: '',
              description: '',
              value: 0,
              stage: 'Prospecting',
              probability: 0,
              expected_close_date: undefined,
              assigned_to: ''
            }
      );
    }
  }, [open, initial, reset]);

  const { data: contactsPage } = useContacts({ page: 1, page_size: 50 });
  const contacts = contactsPage?.results || [];

  const onSubmitHandler = async (data: CreateDeal | UpdateDeal) => {
    await onSubmit(data);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>{initial ? 'Edit Deal' : 'Add Deal'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <Controller
              control={control}
              name="contact"
              rules={{ required: 'Contact is required' }}
              render={({ field }) => (
                <Autocomplete
                  fullWidth
                  options={contacts as unknown as Contact[]}
                  getOptionLabel={(c) => (c?.name ? c.name : '')}
                  value={(contacts as unknown as Contact[]).find((c) => c.id === field.value) || null}
                  onChange={(_, val) => field.onChange(val ? (val as any).id : '')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Contact"
                      size="small"
                      fullWidth
                      error={!!errors.contact}
                      helperText={(errors as any).contact?.message}
                    />
                  )}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} md={8}>
            <TextField
              label="Deal Name"
              size="small"
              fullWidth
              {...register('name', { required: 'Deal name is required' })}
              error={!!errors.name}
              helperText={(errors as any).name?.message}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              type="number"
              label="Value ($)"
              size="small"
              fullWidth
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              {...register('value', { valueAsNumber: true })}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField label="Description" size="small" fullWidth multiline minRows={3} {...register('description')} />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              select
              label="Stage"
              size="small"
              fullWidth
              defaultValue={watch('stage') || 'Prospecting'}
              {...register('stage', { required: true })}
            >
              {['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'].map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              type="number"
              label="Probability (%)"
              size="small"
              fullWidth
              inputProps={{ min: 0, max: 100 }}
              {...register('probability', { valueAsNumber: true })}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              type="date"
              label="Expected Close"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              {...register('expected_close_date')}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField label="Assigned To" size="small" fullWidth placeholder="e.g., Account Owner" {...register('assigned_to')} />
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

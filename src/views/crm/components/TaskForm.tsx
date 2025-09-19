import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, TextField, MenuItem, Autocomplete } from '@mui/material';
import type { CreateTask, UpdateTask, Task, Contact } from 'types/crm';
import { useContacts } from 'hooks/useContacts';

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: Task | null;
  onSubmit: (data: CreateTask | UpdateTask) => Promise<void> | void;
  isSubmitting?: boolean;
  serverErrors?: Record<string, string[]> | null;
};

export default function TaskForm({ open, onClose, initial, onSubmit, isSubmitting, serverErrors }: Props) {
  const {
    control,
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors }
  } = useForm<CreateTask | UpdateTask>({
    defaultValues: initial
      ? {
          contact: initial.contact,
          subject: initial.subject,
          description: initial.description || '',
          activity_type: initial.activity_type,
          status: initial.status,
          priority: initial.priority,
          due_date: initial.due_date || undefined,
          assigned_to: initial.assigned_to || ''
        }
      : {
          contact: '',
          subject: '',
          description: '',
          activity_type: 'Call',
          status: 'Pending',
          priority: 'Medium',
          due_date: undefined,
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
              subject: initial.subject,
              description: initial.description || '',
              activity_type: initial.activity_type,
              status: initial.status,
              priority: initial.priority,
              due_date: initial.due_date || undefined,
              assigned_to: initial.assigned_to || ''
            }
          : {
              contact: '',
              subject: '',
              description: '',
              activity_type: 'Call',
              status: 'Pending',
              priority: 'Medium',
              due_date: undefined,
              assigned_to: ''
            }
      );
    }
  }, [open, initial, reset]);

  const { data: contactsPage } = useContacts({ page: 1, page_size: 50 });
  const contacts = contactsPage?.results || [];

  const onSubmitHandler = async (data: CreateTask | UpdateTask) => {
    await onSubmit(data);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{initial ? 'Edit Task' : 'Add Task'}</DialogTitle>
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
              label="Task"
              size="small"
              fullWidth
              {...register('subject', { required: 'Task is required' })}
              error={!!errors.subject}
              helperText={(errors as any).subject?.message}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField type="date" label="Due Date" size="small" fullWidth InputLabelProps={{ shrink: true }} {...register('due_date')} />
          </Grid>

          <Grid item xs={12}>
            <TextField label="Task Description" size="small" fullWidth multiline minRows={3} {...register('description')} />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              select
              label="Type"
              size="small"
              fullWidth
              defaultValue={watch('activity_type') || 'Call'}
              {...register('activity_type', { required: true })}
            >
              {['Call', 'Email', 'Meeting', 'Demo', 'Proposal', 'Follow Up', 'Other'].map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              select
              label="Status"
              size="small"
              fullWidth
              defaultValue={watch('status') || 'Pending'}
              {...register('status', { required: true })}
            >
              {['Pending', 'Completed', 'Cancelled'].map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              select
              label="Priority"
              size="small"
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

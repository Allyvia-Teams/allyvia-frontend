import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, TextField, MenuItem, Autocomplete } from '@mui/material';
import type { CreateNote, UpdateNote, Note, Contact } from 'types/crm';
import { useContacts } from 'hooks/useContacts';

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: Note | null;
  defaultContactId?: string;
  onSubmit: (data: CreateNote | UpdateNote) => Promise<void> | void;
  isSubmitting?: boolean;
  serverErrors?: Record<string, string[]> | null;
};

export default function NoteForm({ open, onClose, initial, defaultContactId, onSubmit, isSubmitting, serverErrors }: Props) {
  const {
    control,
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors }
  } = useForm<CreateNote | UpdateNote>({
    defaultValues: initial
      ? {
          contact: initial.contact,
          title: initial.title,
          content: initial.content || '',
          note_type: initial.note_type,
          created_by: initial.created_by,
          created_date: initial.created_date || undefined
        }
      : {
          contact: defaultContactId ?? '',
          title: '',
          content: '',
          note_type: 'General',
          created_by: '',
          created_date: undefined
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
              title: initial.title,
              content: initial.content || '',
              note_type: initial.note_type,
              created_by: initial.created_by,
              created_date: initial.created_date || undefined
            }
          : { contact: defaultContactId ?? '', title: '', content: '', note_type: 'General', created_by: '', created_date: undefined }
      );
    }
  }, [open, initial, defaultContactId, reset]);

  const { data: contactsPage } = useContacts({ page: 1, page_size: 50 });
  const contacts = contactsPage?.results || [];

  const onSubmitHandler = async (data: CreateNote | UpdateNote) => {
    await onSubmit(data);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{initial ? 'Edit Note' : 'Add Note'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={12}>
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

          <Grid size={{ xs: 12, md: 8 }}>
            <TextField
              label="Note Name"
              size="small"
              fullWidth
              {...register('title', { required: 'Note name is required' })}
              error={!!errors.title}
              helperText={(errors as any).title?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              label="Type"
              size="small"
              fullWidth
              defaultValue={watch('note_type') || 'General'}
              {...register('note_type', { required: true })}
            >
              {['Meeting Notes', 'Call Log', 'Email', 'General'].map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={12}>
            <TextField label="Notes" size="small" fullWidth multiline minRows={4} {...register('content')} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Created By"
              size="small"
              fullWidth
              {...register('created_by', { required: 'Required' })}
              error={!!errors.created_by}
              helperText={(errors as any).created_by?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              type="date"
              label="Created Date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              {...register('created_date')}
            />
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

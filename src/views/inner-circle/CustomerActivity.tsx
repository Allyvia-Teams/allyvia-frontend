import { useMemo, useState } from 'react';
import { useSnackbar } from 'notistack';

import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { IconChecklist, IconNotes, IconPlus } from '@tabler/icons-react';

import { useCreateNote, useCreateTask, useNotes, useTasks, useUpdateNote, useUpdateTask } from 'hooks/useContacts';
import { useIsAdmin } from 'hooks/usePermission';
import type { CreateNote, CreateTask, Note, Task, UpdateNote, UpdateTask } from 'types/crm';
import NoteForm from 'ui-component/inner-circle/NoteForm';
import TaskForm from 'ui-component/inner-circle/TaskForm';
import { formatDate } from 'utils/dateUtils';

import { forContact, mergeActivity, type ActivityEntry } from './activity';

interface CustomerActivityProps {
  customerId: string;
  customerName: string;
}

type ServerErrors = Record<string, string[]> | null;

const PAGE_SIZE = 100;

function entryKey(entry: ActivityEntry): string {
  return entry.kind === 'note' ? `note-${entry.note.id}` : `task-${entry.task.id}`;
}

// ==============================|| CUSTOMER ACTIVITY (drawer tab) ||============================== //

export default function CustomerActivity({ customerId, customerName }: CustomerActivityProps) {
  const isAdmin = useIsAdmin();
  const { enqueueSnackbar } = useSnackbar();

  // The CRM list endpoints have no ?contact= filter (DRF SearchFilter only),
  // so narrow server-side by the customer's name and enforce exactness below.
  const listParams = { search: customerName || undefined, page: 1, page_size: PAGE_SIZE };
  const notesQuery = useNotes(listParams);
  const tasksQuery = useTasks(listParams);

  const timeline = useMemo(
    () =>
      mergeActivity(
        forContact(notesQuery.data?.results ?? [], customerId),
        forContact(tasksQuery.data?.results ?? [], customerId)
      ),
    [notesQuery.data, tasksQuery.data, customerId]
  );

  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteErrors, setNoteErrors] = useState<ServerErrors>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskErrors, setTaskErrors] = useState<ServerErrors>(null);

  const createNoteMutation = useCreateNote();
  const updateNoteMutation = useUpdateNote();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();

  const isLoading = notesQuery.isLoading || tasksQuery.isLoading;
  const isError = notesQuery.isError || tasksQuery.isError;

  const submitNote = async (data: CreateNote | UpdateNote) => {
    try {
      if (editingNote) {
        await updateNoteMutation.mutateAsync({ id: editingNote.id, data });
      } else {
        await createNoteMutation.mutateAsync(data as CreateNote);
      }
      setNoteFormOpen(false);
      setEditingNote(null);
      setNoteErrors(null);
      enqueueSnackbar(editingNote ? 'Note updated' : 'Note added', { variant: 'success' });
    } catch (error) {
      const axiosError = error as { response?: { data?: Record<string, string[]> } };
      setNoteErrors(axiosError.response?.data ?? null);
      enqueueSnackbar('Failed to save note', { variant: 'error' });
    }
  };

  const submitTask = async (data: CreateTask | UpdateTask) => {
    try {
      if (editingTask) {
        await updateTaskMutation.mutateAsync({ id: editingTask.id, data });
      } else {
        await createTaskMutation.mutateAsync(data as CreateTask);
      }
      setTaskFormOpen(false);
      setEditingTask(null);
      setTaskErrors(null);
      enqueueSnackbar(editingTask ? 'Task updated' : 'Task added', { variant: 'success' });
    } catch (error) {
      const axiosError = error as { response?: { data?: Record<string, string[]> } };
      setTaskErrors(axiosError.response?.data ?? null);
      enqueueSnackbar('Failed to save task', { variant: 'error' });
    }
  };

  return (
    <Stack spacing={2}>
      {isAdmin && (
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconPlus size={16} />}
            onClick={() => {
              setEditingNote(null);
              setNoteErrors(null);
              setNoteFormOpen(true);
            }}
            sx={{ textTransform: 'none' }}
          >
            Add note
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconPlus size={16} />}
            onClick={() => {
              setEditingTask(null);
              setTaskErrors(null);
              setTaskFormOpen(true);
            }}
            sx={{ textTransform: 'none' }}
          >
            Add task
          </Button>
        </Stack>
      )}

      {isLoading && (
        <Typography variant="body2" color="textSecondary">
          Loading activity…
        </Typography>
      )}

      {isError && !isLoading && (
        <Stack spacing={1} alignItems="flex-start">
          <Typography color="error" variant="body2">
            Failed to load activity.
          </Typography>
          <Button
            size="small"
            onClick={() => {
              notesQuery.refetch();
              tasksQuery.refetch();
            }}
          >
            Retry
          </Button>
        </Stack>
      )}

      {!isLoading && !isError && timeline.length === 0 && (
        <Typography variant="body2" color="textSecondary">
          No notes or tasks for this customer yet.
        </Typography>
      )}

      {!isLoading &&
        !isError &&
        timeline.map((entry) => (
          <Box
            key={entryKey(entry)}
            onClick={() => {
              if (!isAdmin) return;
              if (entry.kind === 'note') {
                setEditingNote(entry.note);
                setNoteErrors(null);
                setNoteFormOpen(true);
              } else {
                setEditingTask(entry.task);
                setTaskErrors(null);
                setTaskFormOpen(true);
              }
            }}
            sx={{
              p: 1.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              cursor: isAdmin ? 'pointer' : 'default'
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              {entry.kind === 'note' ? <IconNotes size={16} /> : <IconChecklist size={16} />}
              <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>
                {entry.kind === 'note' ? entry.note.title : entry.task.subject}
              </Typography>
              {entry.kind === 'task' && (
                <Chip
                  label={entry.task.status}
                  size="small"
                  color={entry.task.status === 'Completed' ? 'success' : entry.task.status === 'Cancelled' ? 'default' : 'warning'}
                  variant="outlined"
                />
              )}
            </Stack>
            {entry.kind === 'note' && entry.note.content && (
              <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {entry.note.content}
              </Typography>
            )}
            {entry.kind === 'task' && entry.task.description && (
              <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {entry.task.description}
              </Typography>
            )}
            <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
              {entry.kind === 'note' ? entry.note.note_type : entry.task.activity_type}
              {' · '}
              {formatDate(entry.timestamp, 'MMM dd, yyyy')}
              {entry.kind === 'task' && entry.task.due_date ? ` · due ${formatDate(entry.task.due_date, 'MMM dd, yyyy')}` : ''}
            </Typography>
          </Box>
        ))}

      <NoteForm
        open={noteFormOpen}
        onClose={() => {
          setNoteFormOpen(false);
          setEditingNote(null);
        }}
        initial={editingNote}
        defaultContactId={customerId}
        onSubmit={submitNote}
        isSubmitting={createNoteMutation.isPending || updateNoteMutation.isPending}
        serverErrors={noteErrors}
      />
      <TaskForm
        open={taskFormOpen}
        onClose={() => {
          setTaskFormOpen(false);
          setEditingTask(null);
        }}
        initial={editingTask}
        defaultContactId={customerId}
        onSubmit={submitTask}
        isSubmitting={createTaskMutation.isPending || updateTaskMutation.isPending}
        serverErrors={taskErrors}
      />
    </Stack>
  );
}

import { useMemo, useState } from 'react';

// material-ui
import {
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  Avatar,
  IconButton,
  Tooltip
} from '@mui/material';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';
import { gridSpacing, smallWidgetHeight } from 'store/constant';

// assets
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { useIsAdmin } from 'hooks/usePermission';
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from 'hooks/useContacts';
import type { Note } from 'types/crm';
import NoteForm from '../components/NoteForm';
import { useSnackbar } from 'notistack';

// Mock data
// No mock data; use API

const getNoteTypeColor = (type: string) => {
  switch (type) {
    case 'Meeting Notes':
      return 'primary';
    case 'Call Log':
      return 'info';
    case 'Email':
      return 'secondary';
    case 'General':
      return 'default';
    default:
      return 'default';
  }
};

// ==============================|| NOTES TAB ||============================== //

export default function NotesTab() {
  const isAdmin = useIsAdmin();
  const { enqueueSnackbar } = useSnackbar();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { data, isLoading, isError, refetch } = useNotes({ page: page + 1, page_size: rowsPerPage });
  const rows: Note[] = useMemo(() => data?.results || [], [data]);
  const total = data?.count || 0;
  const createMutation = useCreateNote();
  const updateMutation = useUpdateNote();
  const deleteMutation = useDeleteNote();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]> | null>(null);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const openCreate = () => {
    setEditing(null);
    setServerErrors(null);
    setFormOpen(true);
  };

  const openEdit = (note: Note) => {
    setEditing(note);
    setServerErrors(null);
    setFormOpen(true);
  };

  const submitForm = async (payload: any) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: payload });
        enqueueSnackbar('Note updated', { variant: 'success' });
      } else {
        await createMutation.mutateAsync(payload);
        enqueueSnackbar('Note created', { variant: 'success' });
      }
      setFormOpen(false);
      setEditing(null);
      setServerErrors(null);
    } catch (err: any) {
      const errorData = err?.response?.data;
      if (errorData && typeof errorData === 'object') setServerErrors(errorData as Record<string, string[]>);
      let message = 'Failed to save note';
      if (errorData && typeof errorData === 'object') {
        const parts: string[] = [];
        Object.entries(errorData as Record<string, any>).forEach(([field, msgs]) => {
          const text = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
          parts.push(`${field}: ${text}`);
        });
        if (parts.length) message = `Please fix these fields: ${parts.join(' | ')}`;
      }
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteMutation.mutateAsync(noteId);
      enqueueSnackbar('Note deleted', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to delete note', { variant: 'error' });
    }
  };

  const noteStats = {
    isLoading: false,
    showIcon: false,
    height: smallWidgetHeight,
    isTaggable: false
  };

  // Calculate stats from current data
  const totalNotes = total;
  const meetingNotes = rows.filter((n) => n.note_type === 'Meeting Notes').length;
  const callLogs = rows.filter((n) => n.note_type === 'Call Log').length;
  const generalNotes = rows.filter((n) => n.note_type === 'General').length;

  return (
    <Grid container spacing={gridSpacing}>
      {/* Stats Cards */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...noteStats} value={totalNotes} title="Total Notes" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...noteStats} value={meetingNotes} title="Meeting Notes" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...noteStats} value={callLogs} title="Call Logs" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...noteStats} value={generalNotes} title="General Notes" />
      </Grid>

      {/* Notes Table */}
      <Grid size={12}>
        <MainCard
          title="Notes"
          secondary={
            isAdmin && (
              <Button
                onClick={openCreate}
                variant="contained"
                color="primary"
                size="large"
                startIcon={<IconPlus stroke={1.5} size="20px" />}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 2.5,
                  py: 1,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  transition: 'all 0.2s ease',
                  '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.16)', transform: 'translateY(-1px)' }
                }}
              >
                Add Note
              </Button>
            )
          }
        >
          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table sx={{ minWidth: 650 }} aria-label="notes table">
              <TableHead>
                <TableRow>
                  <TableCell>Note</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell>Created Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={6}>Loading...</TableCell>
                  </TableRow>
                )}
                {isError && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography color="error">Failed to load notes.</Typography>
                        <Button onClick={() => refetch()} size="small">
                          Retry
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !isError && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography color="textSecondary">No notes found.</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((note) => (
                  <TableRow key={note.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle1">{note.title}</Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {note.content}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {(note.contact_name || 'N T')
                            .split(' ')
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">{note.contact_name || note.contact}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            {note.contact_company_name || '-'}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={note.note_type} color={getNoteTypeColor(note.note_type) as any} size="small" />
                    </TableCell>
                    <TableCell>{note.created_by}</TableCell>
                    <TableCell>{note.created_date || '-'}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {isAdmin && (
                          <>
                            <Tooltip title="Edit">
                              <IconButton size="small" color="primary" onClick={() => openEdit(note)}>
                                <IconEdit stroke={1.5} size="16px" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => handleDeleteNote(note.id)}>
                                <IconTrash stroke={1.5} size="16px" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={total}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </MainCard>
      </Grid>

      <NoteForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        onSubmit={submitForm}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        serverErrors={serverErrors}
      />
    </Grid>
  );
}

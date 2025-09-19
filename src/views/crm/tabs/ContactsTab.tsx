import { useEffect, useMemo, useState } from 'react';

// material-ui
import {
  Box,
  Button,
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
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';
import { gridSpacing, smallWidgetHeight } from 'store/constant';
import { useIsAdmin } from 'hooks/usePermission';
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact } from 'hooks/useContacts';
import type { Contact } from 'types/crm';
import ContactForm from '../components/ContactForm';
import { useSnackbar } from 'notistack';

// assets
import { IconPlus, IconEdit, IconTrash, IconEye } from '@tabler/icons-react';

// Helpers
function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const second = parts[1]?.[0] || '';
  return (first + second).toUpperCase();
}

// ==============================|| CONTACTS TAB ||============================== //

export default function ContactsTab() {
  const isAdmin = useIsAdmin();
  const { enqueueSnackbar } = useSnackbar();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0); // 0-based for MUI
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, refetch } = useContacts({
    search: debouncedSearch || undefined,
    page: page + 1, // API is 1-based
    page_size: rowsPerPage
  });

  const rows: Contact[] = useMemo(() => data?.results || [], [data]);
  const total = data?.count || 0;

  const createMutation = useCreateContact();
  const updateMutation = useUpdateContact();
  const deleteMutation = useDeleteContact();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const openEdit = (contact: Contact) => {
    setEditing(contact);
    setServerErrors(null);
    setFormOpen(true);
  };

  const submitForm = async (payload: any) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: payload });
        enqueueSnackbar('Contact updated', { variant: 'success' });
      } else {
        await createMutation.mutateAsync(payload);
        enqueueSnackbar('Contact created', { variant: 'success' });
      }
      setFormOpen(false);
      setEditing(null);
      setServerErrors(null);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data && typeof data === 'object') {
        setServerErrors(data as Record<string, string[]>);
      }
      let message = 'Failed to save contact';
      if (data && typeof data === 'object') {
        const parts: string[] = [];
        Object.entries(data as Record<string, any>).forEach(([field, msgs]) => {
          const text = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
          parts.push(`${field}: ${text}`);
        });
        if (parts.length) message = `Please fix these fields: ${parts.join(' | ')}`;
      }
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      enqueueSnackbar('Contact deleted', { variant: 'success' });
      setDeleteId(null);
    } catch (err) {
      enqueueSnackbar('Failed to delete contact', { variant: 'error' });
    }
  };

  const contactStats = {
    isLoading: false,
    showIcon: false,
    height: smallWidgetHeight,
    isTaggable: false
  };

  const totalContacts = total;

  return (
    <Grid container spacing={gridSpacing}>
      {/* Stats Cards */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...contactStats} value={totalContacts} title="Total Contacts" />
      </Grid>

      {/* Contacts Table */}
      <Grid size={12}>
        <MainCard
          title="Contacts"
          secondary={
            isAdmin && (
              <Button
                onClick={openCreate}
                variant="contained"
                startIcon={<IconPlus stroke={1.5} size="20px" />}
                sx={{ textTransform: 'none' }}
              >
                Add Contact
              </Button>
            )
          }
        >
          <Box sx={{ mb: 2 }}>
            <TextField
              placeholder="Search by name or email"
              size="small"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              sx={{ width: 320 }}
            />
          </Box>
          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table size="small" sx={{ minWidth: 650, tableLayout: 'fixed' }} aria-label="contacts table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 200 }}>Name</TableCell>
                  <TableCell sx={{ width: 220 }}>Email</TableCell>
                  <TableCell sx={{ width: 120 }}>Phone</TableCell>
                  <TableCell sx={{ width: 180 }}>Company</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell sx={{ width: 120 }} align="right">
                    Actions
                  </TableCell>
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
                        <Typography color="error">Failed to load contacts.</Typography>
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
                      <Typography color="textSecondary">No contacts found.</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((contact) => (
                  <TableRow key={contact.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: 'primary.main' }}>{getInitials(contact.name)}</Avatar>
                        <Box>
                          <Typography variant="subtitle1">{contact.name}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.email}</TableCell>
                    <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.phone}</TableCell>
                    <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {contact.company_name}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      <Typography variant="body2">{contact.notes}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {isAdmin && (
                          <>
                            <Tooltip title="Edit">
                              <IconButton size="small" color="primary" onClick={() => openEdit(contact)}>
                                <IconEdit stroke={1.5} size="16px" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => setDeleteId(contact.id)}>
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

      <ContactForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        onSubmit={submitForm}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        serverErrors={serverErrors}
      />

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete contact?</DialogTitle>
        <DialogContent>Are you sure you want to delete this contact?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={deleteMutation.isPending} onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}

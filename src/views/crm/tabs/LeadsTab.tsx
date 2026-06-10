import { useEffect, useMemo, useRef, useState } from 'react';

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
import { useLeads, useCreateLead, useUpdateLead, useDeleteLead } from 'hooks/useContacts';
import { getLead } from 'api/crm';
import type { Lead } from 'types/crm';
import LeadForm from '../components/LeadForm';
import { useSnackbar } from 'notistack';

// No mock data; use API

const getStatusColor = (status: string) => {
  switch (status) {
    case 'New':
      return 'info';
    case 'Qualified':
      return 'warning';
    case 'Proposal':
      return 'primary';
    case 'Negotiation':
      return 'secondary';
    case 'Closed Won':
      return 'success';
    case 'Closed Lost':
      return 'error';
    default:
      return 'default';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'High':
      return 'error';
    case 'Medium':
      return 'warning';
    case 'Low':
      return 'success';
    default:
      return 'default';
  }
};

interface LeadsTabProps {
  deepLinkRecordId?: string | null;
  onDeepLinkHandled?: () => void;
}

// ==============================|| LEADS TAB ||============================== //

export default function LeadsTab({ deepLinkRecordId, onDeepLinkHandled }: LeadsTabProps) {
  const isAdmin = useIsAdmin();
  const { enqueueSnackbar } = useSnackbar();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { data, isLoading, isError, refetch } = useLeads({ page: page + 1, page_size: rowsPerPage });
  const rows: Lead[] = useMemo(() => data?.results || [], [data]);
  const total = data?.count || 0;
  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();
  const deleteMutation = useDeleteLead();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
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

  const openEdit = (lead: Lead) => {
    setEditing(lead);
    setServerErrors(null);
    setFormOpen(true);
  };

  const processedDeepLinkRef = useRef<string | null>(null);

  useEffect(() => {
    if (!deepLinkRecordId || processedDeepLinkRef.current === deepLinkRecordId) {
      return;
    }

    const openRecord = async () => {
      const found = rows.find((lead) => lead.id === deepLinkRecordId);
      try {
        const lead = found || (await getLead(deepLinkRecordId));
        openEdit(lead);
      } finally {
        processedDeepLinkRef.current = deepLinkRecordId;
        onDeepLinkHandled?.();
      }
    };

    void openRecord();
  }, [deepLinkRecordId, onDeepLinkHandled, rows]);

  const submitForm = async (payload: any) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: payload });
        enqueueSnackbar('Lead updated', { variant: 'success' });
      } else {
        await createMutation.mutateAsync(payload);
        enqueueSnackbar('Lead created', { variant: 'success' });
      }
      setFormOpen(false);
      setEditing(null);
      setServerErrors(null);
    } catch (err: any) {
      const errorData = err?.response?.data;
      if (errorData && typeof errorData === 'object') setServerErrors(errorData as Record<string, string[]>);
      let message = 'Failed to save lead';
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

  const handleDeleteLead = async (leadId: string) => {
    try {
      await deleteMutation.mutateAsync(leadId);
      enqueueSnackbar('Lead deleted', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to delete lead', { variant: 'error' });
    }
  };

  const leadStats = {
    isLoading: false,
    showIcon: false,
    height: smallWidgetHeight,
    isTaggable: false
  };

  // Calculate stats from current data
  const totalLeads = total;
  const newLeads = rows.filter((l) => l.status === 'New').length;
  const qualifiedLeads = rows.filter((l) => l.status === 'Qualified').length;
  const totalValue = rows.reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);

  return (
    <Grid container spacing={gridSpacing}>
      {/* Stats Cards */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...leadStats} value={totalLeads} title="Total Leads" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...leadStats} value={newLeads} title="New Leads" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...leadStats} value={qualifiedLeads} title="Qualified" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...leadStats} value={`$${(totalValue / 1000).toFixed(0)}k`} title="Total Value" />
      </Grid>

      {/* Leads Table */}
      <Grid size={12}>
        <MainCard
          title="Leads"
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
                Add Lead
              </Button>
            )
          }
        >
          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table sx={{ minWidth: 650 }} aria-label="leads table">
              <TableHead>
                <TableRow>
                  <TableCell>Contact</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Expected Close</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={9}>Loading...</TableCell>
                  </TableRow>
                )}
                {isError && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography color="error">Failed to load leads.</Typography>
                        <Button onClick={() => refetch()} size="small">
                          Retry
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !isError && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <Typography color="textSecondary">No leads found.</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((lead) => (
                  <TableRow key={lead.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {(lead.contact_name || 'L D')
                            .split(' ')
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1">{lead.contact_name || lead.contact}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>{lead.contact_company_name || '-'}</TableCell>
                    <TableCell>
                      <Chip label={lead.status} color={getStatusColor(lead.status) as any} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={lead.priority} color={getPriorityColor(lead.priority) as any} size="small" />
                    </TableCell>
                    <TableCell>{lead.score}</TableCell>
                    <TableCell>${Number(lead.estimated_value || 0).toLocaleString()}</TableCell>
                    <TableCell>{lead.expected_close_date || '-'}</TableCell>
                    <TableCell>{lead.assigned_to || '-'}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {isAdmin && (
                          <>
                            <Tooltip title="Edit">
                              <IconButton size="small" color="primary" onClick={() => openEdit(lead)}>
                                <IconEdit stroke={1.5} size="16px" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => handleDeleteLead(lead.id)}>
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

      <LeadForm
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

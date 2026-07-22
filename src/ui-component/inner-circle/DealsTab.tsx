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
import { useDeals, useCreateDeal, useUpdateDeal, useDeleteDeal } from 'hooks/useContacts';
import { getDeal } from 'api/crm';
import type { Deal } from 'types/crm';
import DealForm from './DealForm';
import { useSnackbar } from 'notistack';

// Mock data
// No mock data; use API

const getStageColor = (stage: string) => {
  switch (stage) {
    case 'Prospecting':
      return 'info';
    case 'Qualification':
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

const getProbabilityColor = (probability: number) => {
  if (probability >= 80) return 'success';
  if (probability >= 60) return 'warning';
  if (probability >= 40) return 'info';
  return 'error';
};

interface DealsTabProps {
  deepLinkRecordId?: string | null;
  onDeepLinkHandled?: () => void;
}

// ==============================|| DEALS TAB ||============================== //

export default function DealsTab({ deepLinkRecordId, onDeepLinkHandled }: DealsTabProps) {
  const isAdmin = useIsAdmin();
  const { enqueueSnackbar } = useSnackbar();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { data, isLoading, isError, refetch } = useDeals({ page: page + 1, page_size: rowsPerPage });
  const rows: Deal[] = useMemo(() => data?.results || [], [data]);
  const total = data?.count || 0;
  const createMutation = useCreateDeal();
  const updateMutation = useUpdateDeal();
  const deleteMutation = useDeleteDeal();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
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

  const openEdit = (deal: Deal) => {
    setEditing(deal);
    setServerErrors(null);
    setFormOpen(true);
  };

  const processedDeepLinkRef = useRef<string | null>(null);

  useEffect(() => {
    if (!deepLinkRecordId || processedDeepLinkRef.current === deepLinkRecordId) {
      return;
    }

    const openRecord = async () => {
      const found = rows.find((deal) => deal.id === deepLinkRecordId);
      try {
        const deal = found || (await getDeal(deepLinkRecordId));
        openEdit(deal);
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
        enqueueSnackbar('Deal updated', { variant: 'success' });
      } else {
        await createMutation.mutateAsync(payload);
        enqueueSnackbar('Deal created', { variant: 'success' });
      }
      setFormOpen(false);
      setEditing(null);
      setServerErrors(null);
    } catch (err: any) {
      const errorData = err?.response?.data;
      if (errorData && typeof errorData === 'object') setServerErrors(errorData as Record<string, string[]>);
      let message = 'Failed to save deal';
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

  const handleDeleteDeal = async (dealId: string) => {
    try {
      await deleteMutation.mutateAsync(dealId);
      enqueueSnackbar('Deal deleted', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to delete deal', { variant: 'error' });
    }
  };

  const dealStats = {
    isLoading: false,
    showIcon: false,
    height: smallWidgetHeight,
    isTaggable: false
  };

  // Calculate stats from current data
  const totalDeals = total;
  const totalValue = rows.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
  const wonDeals = rows.filter((d) => d.stage === 'Closed Won').length;
  const activeDeals = rows.filter((d) => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost').length;

  return (
    <Grid container spacing={gridSpacing}>
      {/* Stats Cards */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...dealStats} value={totalDeals} title="Total Deals" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...dealStats} value={`$${(totalValue / 1000).toFixed(0)}k`} title="Total Value" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...dealStats} value={wonDeals} title="Won Deals" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...dealStats} value={activeDeals} title="Active Deals" />
      </Grid>

      {/* Deals Table */}
      <Grid size={12}>
        <MainCard
          title="Deals"
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
                Add Deal
              </Button>
            )
          }
        >
          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table sx={{ minWidth: 650 }} aria-label="deals table">
              <TableHead>
                <TableRow>
                  <TableCell>Deal Name</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Stage</TableCell>
                  <TableCell>Probability</TableCell>
                  <TableCell>Expected Close</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={8}>Loading...</TableCell>
                  </TableRow>
                )}
                {isError && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography color="error">Failed to load deals.</Typography>
                        <Button onClick={() => refetch()} size="small">
                          Retry
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !isError && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Typography color="textSecondary">No deals found.</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((deal) => (
                  <TableRow key={deal.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle1">{deal.name}</Typography>
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                        >
                          {deal.description}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {(deal.contact_name || 'D L')
                            .split(' ')
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">{deal.contact_name || deal.contact}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            {deal.contact_company_name || '-'}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>${Number(deal.value || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip label={deal.stage} color={getStageColor(deal.stage) as any} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={`${deal.probability}%`} color={getProbabilityColor(Number(deal.probability || 0)) as any} size="small" />
                    </TableCell>
                    <TableCell>{deal.expected_close_date || '-'}</TableCell>
                    <TableCell>{deal.assigned_to || '-'}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {isAdmin && (
                          <>
                            <Tooltip title="Edit">
                              <IconButton size="small" color="primary" onClick={() => openEdit(deal)}>
                                <IconEdit stroke={1.5} size="16px" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => handleDeleteDeal(deal.id)}>
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

      <DealForm
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

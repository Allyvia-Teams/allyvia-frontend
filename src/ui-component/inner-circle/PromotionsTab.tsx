import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

import { deletePromotion, fetchPromotions, updatePromotion, type PromotionRule, type PromotionTriggerType } from 'api/innerCircle.api';
import MainCard from 'ui-component/cards/MainCard';
import PromotionDialog from './PromotionDialog';
import TierChip from './TierChip';
import { formatPct } from './formatters';

const TRIGGER_LABEL: Record<PromotionTriggerType, string> = {
  new_inventory: 'New inventory',
  winback: 'Win-back',
  birthday: 'Birthday',
  manual: 'Manual'
};

function ScopeChip({ promotion }: { promotion: PromotionRule }) {
  if (promotion.tier_scope === 'top_n') {
    return <Chip label={`Top ${promotion.top_n ?? '—'} by spend`} size="small" color="secondary" variant="outlined" />;
  }
  return <TierChip tier={promotion.tier_scope} />;
}

export default function PromotionsTab() {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionRule | null>(null);
  const [deleting, setDeleting] = useState<PromotionRule | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ic-promotions'],
    queryFn: () => fetchPromotions({ page: 1, page_size: 100 })
  });

  const promotions: PromotionRule[] = data?.results ?? [];

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => updatePromotion(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ic-promotions'] }),
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['ic-promotions'] });
      enqueueSnackbar('Failed to update promotion', { variant: 'error' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePromotion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ic-promotions'] });
      enqueueSnackbar('Promotion deleted', { variant: 'success' });
      setDeleting(null);
    },
    onError: () => enqueueSnackbar('Failed to delete promotion', { variant: 'error' })
  });

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (promotion: PromotionRule) => {
    setEditing(promotion);
    setDialogOpen(true);
  };

  return (
    <MainCard
      title="Promotion rules"
      secondary={
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openCreate} sx={{ textTransform: 'none' }}>
          New promotion
        </Button>
      }
    >
      <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
        <Table size="small" sx={{ minWidth: 900 }} aria-label="promotion rules table">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Eligible</TableCell>
              <TableCell align="right">Discount</TableCell>
              <TableCell>Cadence</TableCell>
              <TableCell align="right">Code valid</TableCell>
              <TableCell>Trigger</TableCell>
              <TableCell>Active</TableCell>
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
                    <Typography color="error">Failed to load promotions.</Typography>
                    <Button size="small" onClick={() => refetch()}>
                      Retry
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && promotions.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography color="textSecondary">No promotion rules yet. Create one to start generating personalized offers.</Typography>
                </TableCell>
              </TableRow>
            )}
            {promotions.map((promotion) => (
              <TableRow key={promotion.id} hover>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {promotion.name}
                  </Typography>
                  {promotion.description && (
                    <Typography variant="caption" color="textSecondary" display="block" noWrap sx={{ maxWidth: 260 }}>
                      {promotion.description}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <ScopeChip promotion={promotion} />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700}>
                    {formatPct(promotion.discount_pct)}
                  </Typography>
                </TableCell>
                <TableCell>every {promotion.cadence_days} days</TableCell>
                <TableCell align="right">{promotion.code_valid_days}d</TableCell>
                <TableCell>{TRIGGER_LABEL[promotion.trigger_type]}</TableCell>
                <TableCell>
                  <Switch
                    size="small"
                    checked={promotion.is_active}
                    disabled={toggleMutation.isPending}
                    onChange={(_, checked) => toggleMutation.mutate({ id: promotion.id, is_active: checked })}
                    inputProps={{ 'aria-label': `Toggle ${promotion.name}` }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEdit(promotion)} aria-label={`Edit ${promotion.name}`}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => setDeleting(promotion)} aria-label={`Delete ${promotion.name}`}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <PromotionDialog open={dialogOpen} promotion={editing} onClose={() => setDialogOpen(false)} />

      {/* Delete confirmation */}
      <Dialog open={deleting !== null} onClose={() => setDeleting(null)}>
        <DialogTitle>Delete this promotion?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            “{deleting?.name}” will be removed. Existing email drafts and issued codes are not affected.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)}>Back</Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            onClick={() => deleting && deleteMutation.mutate(deleting.id)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </MainCard>
  );
}

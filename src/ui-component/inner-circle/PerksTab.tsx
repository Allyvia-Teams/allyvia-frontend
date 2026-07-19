import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CelebrationOutlinedIcon from '@mui/icons-material/CelebrationOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DesignServicesOutlinedIcon from '@mui/icons-material/DesignServicesOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import RocketLaunchOutlinedIcon from '@mui/icons-material/RocketLaunchOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';

import {
  deletePerk,
  fetchPerks,
  invitePerkMembers,
  type PerkEvent,
  type PerkStatus,
  type PerkType
} from 'api/innerCircle.api';
import { gridSpacing } from 'store/constant';
import { formatDate } from 'utils/dateUtils';
import MainCard from 'ui-component/cards/MainCard';
import PerkDialog from './PerkDialog';
import PerkInvitesDrawer from './PerkInvitesDrawer';
import { tierLabel } from './TierChip';

const PERK_TYPE_CONFIG: Record<PerkType, { label: string; Icon: typeof CelebrationOutlinedIcon }> = {
  design_meeting: { label: 'Design meeting', Icon: DesignServicesOutlinedIcon },
  private_event: { label: 'Private event', Icon: CelebrationOutlinedIcon },
  early_access: { label: 'Early access', Icon: RocketLaunchOutlinedIcon }
};

const STATUS_CONFIG: Record<PerkStatus, { label: string; color: 'warning' | 'primary' | 'default' }> = {
  draft: { label: 'Draft', color: 'warning' },
  inviting: { label: 'Inviting', color: 'primary' },
  closed: { label: 'Closed', color: 'default' }
};

function eligibilityText(perk: PerkEvent): string {
  if (perk.eligible_scope === 'top_n') return `Top ${perk.top_n} by spend`;
  if (perk.tier === 'vault' || perk.tier === 'regular' || perk.tier === 'shopper') {
    return `${tierLabel(perk.tier)} tier`;
  }
  return perk.tier ? `${perk.tier} tier` : 'By tier';
}

function RsvpCount({ label, value }: { label: string; value: number }) {
  return (
    <Box sx={{ textAlign: 'center', minWidth: 56 }}>
      <Typography variant="subtitle1" fontWeight={800}>
        {value}
      </Typography>
      <Typography variant="caption" color="textSecondary">
        {label}
      </Typography>
    </Box>
  );
}

export default function PerksTab() {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PerkEvent | null>(null);
  const [deleting, setDeleting] = useState<PerkEvent | null>(null);
  const [inviting, setInviting] = useState<PerkEvent | null>(null);
  const [invitesPerk, setInvitesPerk] = useState<PerkEvent | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ic-perks'],
    queryFn: () => fetchPerks({ page: 1, page_size: 100 })
  });

  const perks: PerkEvent[] = data?.results ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePerk(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ic-perks'] });
      enqueueSnackbar('Perk deleted', { variant: 'success' });
      setDeleting(null);
    },
    onError: () => enqueueSnackbar('Failed to delete perk', { variant: 'error' })
  });

  const inviteMutation = useMutation({
    mutationFn: (id: string) => invitePerkMembers(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ic-perks'] });
      queryClient.invalidateQueries({ queryKey: ['ic-email-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['ic-perk-invites'] });
      enqueueSnackbar(
        `${result.invited} member${result.invited === 1 ? '' : 's'} invited — ${result.drafts_created} invitation email${
          result.drafts_created === 1 ? '' : 's'
        } await your approval in Approvals`,
        { variant: 'success' }
      );
      setInviting(null);
    },
    onError: () => enqueueSnackbar('Failed to invite members', { variant: 'error' })
  });

  return (
    <MainCard
      title="Member perks"
      secondary={
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          sx={{ textTransform: 'none' }}
        >
          New perk
        </Button>
      }
    >
      {isLoading && (
        <Grid container spacing={gridSpacing}>
          {[1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Skeleton variant="rounded" height={220} />
            </Grid>
          ))}
        </Grid>
      )}

      {isError && !isLoading && (
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography color="error">Failed to load perks.</Typography>
          <Button size="small" onClick={() => refetch()}>
            Retry
          </Button>
        </Stack>
      )}

      {!isLoading && !isError && perks.length === 0 && (
        <Paper elevation={0} sx={{ p: 5, textAlign: 'center', borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
          <GroupsOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h4" gutterBottom>
            No perks yet
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ maxWidth: 420, mx: 'auto' }}>
            Create a design meeting, private event, or early-access drop and invite your best members.
          </Typography>
        </Paper>
      )}

      {!isLoading && !isError && perks.length > 0 && (
        <Grid container spacing={gridSpacing}>
          {perks.map((perk) => {
            const { label: typeLabel, Icon } = PERK_TYPE_CONFIG[perk.perk_type];
            const status = STATUS_CONFIG[perk.status];
            return (
              <Grid key={perk.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                      <Icon color="primary" />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight={700} noWrap>
                          {perk.title}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {typeLabel}
                        </Typography>
                      </Box>
                    </Stack>
                    <Chip label={status.label} size="small" color={status.color} variant="filled" />
                  </Stack>

                  <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                    <Typography variant="body2" color="textSecondary">
                      {eligibilityText(perk)}
                      {perk.capacity != null ? ` · capacity ${perk.capacity}` : ''}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {perk.event_date ? formatDate(perk.event_date, 'weekDate') : 'Date TBD'}
                      {perk.location ? ` · ${perk.location}` : ''}
                    </Typography>
                  </Stack>

                  {perk.description && (
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {perk.description}
                    </Typography>
                  )}

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    sx={{ mt: 2, py: 1, borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider' }}
                  >
                    <RsvpCount label="Invited" value={perk.response_counts.invited} />
                    <RsvpCount label="Interested" value={perk.response_counts.interested} />
                    <RsvpCount label="Booked" value={perk.response_counts.booked} />
                    <RsvpCount label="Declined" value={perk.response_counts.declined} />
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 'auto', pt: 2 }}>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<SendOutlinedIcon />}
                      disabled={perk.status === 'closed' || inviteMutation.isPending}
                      onClick={() => setInviting(perk)}
                      sx={{ textTransform: 'none' }}
                    >
                      Invite eligible members
                    </Button>
                    <Button size="small" onClick={() => setInvitesPerk(perk)} sx={{ textTransform: 'none' }}>
                      Invites ({perk.invite_count})
                    </Button>
                    <Box sx={{ flex: 1 }} />
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditing(perk);
                          setDialogOpen(true);
                        }}
                        aria-label={`Edit ${perk.title}`}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => setDeleting(perk)} aria-label={`Delete ${perk.title}`}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      <PerkDialog open={dialogOpen} perk={editing} onClose={() => setDialogOpen(false)} />
      <PerkInvitesDrawer perk={invitesPerk} onClose={() => setInvitesPerk(null)} />

      {/* Invite confirmation */}
      <Dialog open={inviting !== null} onClose={() => setInviting(null)}>
        <DialogTitle>Invite eligible members?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Eligible members ({inviting ? eligibilityText(inviting) : ''}) will be added to the invite list for “{inviting?.title}”.
            Invitation emails are drafted first — they await your approval in the Approvals tab before anything is sent.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviting(null)}>Back</Button>
          <Button
            variant="contained"
            disabled={inviteMutation.isPending}
            onClick={() => inviting && inviteMutation.mutate(inviting.id)}
          >
            Invite
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleting !== null} onClose={() => setDeleting(null)}>
        <DialogTitle>Delete this perk?</DialogTitle>
        <DialogContent>
          <DialogContentText>“{deleting?.title}” and its invite list will be removed.</DialogContentText>
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

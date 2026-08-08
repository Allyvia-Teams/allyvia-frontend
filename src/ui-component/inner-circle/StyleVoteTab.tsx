import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HowToVoteOutlinedIcon from '@mui/icons-material/HowToVoteOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';

import {
  closeBuyingRound,
  deleteBuyingRound,
  fetchBuyingRounds,
  inviteBuyingRoundMembers,
  openBuyingRound,
  type BuyingRound,
  type BuyingRoundStatus
} from 'api/innerCircle.api';
import { gridSpacing } from 'store/constant';
import { formatDate } from 'utils/dateUtils';
import MainCard from 'ui-component/cards/MainCard';
import StyleVoteDialog from './StyleVoteDialog';
import StyleVoteResultsDrawer from './StyleVoteResultsDrawer';
import { tierLabel } from './TierChip';

const STATUS_CONFIG: Record<BuyingRoundStatus, { label: string; color: 'warning' | 'primary' | 'default' }> = {
  draft: { label: 'Draft', color: 'warning' },
  open: { label: 'Open', color: 'primary' },
  closed: { label: 'Closed', color: 'default' }
};

function eligibilityText(round: BuyingRound): string {
  if (round.eligible_scope === 'top_n') return `Top ${round.top_n} by spend`;
  if (round.tier === 'vault' || round.tier === 'regular' || round.tier === 'shopper') {
    return `${tierLabel(round.tier)} tier`;
  }
  return round.tier ? `${round.tier} tier` : 'By tier';
}

function turnout(round: BuyingRound): number {
  if (round.invite_count === 0) return 0;
  return Math.min(100, Math.round((round.vote_count / round.invite_count) * 100));
}

export default function StyleVoteTab() {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BuyingRound | null>(null);
  const [deleting, setDeleting] = useState<BuyingRound | null>(null);
  const [inviting, setInviting] = useState<BuyingRound | null>(null);
  const [closing, setClosing] = useState<BuyingRound | null>(null);
  const [resultsRound, setResultsRound] = useState<BuyingRound | null>(null);
  const [winnerChoice, setWinnerChoice] = useState<string>('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ic-buying-rounds'],
    queryFn: () => fetchBuyingRounds({ page: 1, page_size: 100 })
  });

  const rounds: BuyingRound[] = data?.results ?? [];

  const invalidateRounds = () => queryClient.invalidateQueries({ queryKey: ['ic-buying-rounds'] });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBuyingRound(id),
    onSuccess: () => {
      invalidateRounds();
      enqueueSnackbar('Round deleted', { variant: 'success' });
      setDeleting(null);
    },
    onError: () => enqueueSnackbar('Failed to delete round', { variant: 'error' })
  });

  const openMutation = useMutation({
    mutationFn: (id: string) => openBuyingRound(id),
    onSuccess: () => {
      invalidateRounds();
      enqueueSnackbar('Voting is open', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to open voting — a round needs at least two options', { variant: 'error' })
  });

  const inviteMutation = useMutation({
    mutationFn: (id: string) => inviteBuyingRoundMembers(id),
    onSuccess: (result) => {
      invalidateRounds();
      queryClient.invalidateQueries({ queryKey: ['ic-email-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['ic-buying-round-invites'] });
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

  const closeMutation = useMutation({
    mutationFn: (round: BuyingRound) =>
      closeBuyingRound(round.id, winnerChoice === '' ? undefined : { winning_option_index: Number(winnerChoice) }),
    onSuccess: () => {
      invalidateRounds();
      queryClient.invalidateQueries({ queryKey: ['ic-buying-round-results'] });
      enqueueSnackbar('Round closed', { variant: 'success' });
      setClosing(null);
      setWinnerChoice('');
    },
    onError: () => enqueueSnackbar('Failed to close round', { variant: 'error' })
  });

  return (
    <MainCard
      title="Style vote"
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
          New round
        </Button>
      }
    >
      {isLoading && (
        <Grid container spacing={gridSpacing}>
          {[1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Skeleton variant="rounded" height={240} />
            </Grid>
          ))}
        </Grid>
      )}

      {isError && !isLoading && (
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography color="error">Failed to load rounds.</Typography>
          <Button size="small" onClick={() => refetch()}>
            Retry
          </Button>
        </Stack>
      )}

      {!isLoading && !isError && rounds.length === 0 && (
        <Paper elevation={0} sx={{ p: 5, textAlign: 'center', borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
          <HowToVoteOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h4" gutterBottom>
            No style votes yet
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ maxWidth: 460, mx: 'auto' }}>
            Put two or more options on a ballot and let your members choose what you buy next. Their picks tell you what to stock before you
            spend on it.
          </Typography>
        </Paper>
      )}

      {!isLoading && !isError && rounds.length > 0 && (
        <Grid container spacing={gridSpacing}>
          {rounds.map((round) => {
            const status = STATUS_CONFIG[round.status];
            const winningLabel = round.winning_option_index != null ? (round.options[round.winning_option_index]?.label ?? null) : null;
            return (
              <Grid key={round.id} size={{ xs: 12, sm: 6, lg: 4 }}>
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
                      <HowToVoteOutlinedIcon color="primary" />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight={700} noWrap>
                          {round.title}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {round.options.length} option{round.options.length === 1 ? '' : 's'}
                        </Typography>
                      </Box>
                    </Stack>
                    <Chip label={status.label} size="small" color={status.color} variant="filled" />
                  </Stack>

                  <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                    <Typography variant="body2" color="textSecondary">
                      {eligibilityText(round)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {round.closes_at ? `Closes ${formatDate(round.closes_at, 'weekDate')}` : 'No closing date'}
                    </Typography>
                  </Stack>

                  {winningLabel && (
                    <Chip
                      label={`Winner: ${winningLabel}`}
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ mt: 1.5, alignSelf: 'flex-start', maxWidth: '100%' }}
                    />
                  )}

                  <Box sx={{ mt: 2, py: 1.5, borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                      <Typography variant="caption" color="textSecondary">
                        Turnout
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {round.vote_count} of {round.invite_count} voted
                      </Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={turnout(round)} sx={{ height: 8, borderRadius: 1, mt: 0.75 }} />
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 'auto', pt: 2, flexWrap: 'wrap', rowGap: 1 }}>
                    {round.status === 'draft' && (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<PlayArrowOutlinedIcon />}
                        disabled={openMutation.isPending || round.options.length < 2}
                        onClick={() => openMutation.mutate(round.id)}
                        sx={{ textTransform: 'none' }}
                      >
                        Open voting
                      </Button>
                    )}
                    {round.status === 'open' && (
                      <>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<SendOutlinedIcon />}
                          disabled={inviteMutation.isPending}
                          onClick={() => setInviting(round)}
                          sx={{ textTransform: 'none' }}
                        >
                          Invite eligible members
                        </Button>
                        <Button
                          size="small"
                          startIcon={<LockOutlinedIcon />}
                          onClick={() => {
                            setWinnerChoice('');
                            setClosing(round);
                          }}
                          sx={{ textTransform: 'none' }}
                        >
                          Close
                        </Button>
                      </>
                    )}
                    <Button size="small" onClick={() => setResultsRound(round)} sx={{ textTransform: 'none' }}>
                      Results
                    </Button>
                    <Box sx={{ flex: 1 }} />
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditing(round);
                          setDialogOpen(true);
                        }}
                        aria-label={`Edit ${round.title}`}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => setDeleting(round)} aria-label={`Delete ${round.title}`}>
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

      <StyleVoteDialog open={dialogOpen} round={editing} onClose={() => setDialogOpen(false)} />
      <StyleVoteResultsDrawer round={resultsRound} onClose={() => setResultsRound(null)} />

      {/* Invite confirmation */}
      <Dialog open={inviting !== null} onClose={() => setInviting(null)}>
        <DialogTitle>Invite eligible members?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Eligible members ({inviting ? eligibilityText(inviting) : ''}) will be added to the voter list for “{inviting?.title}”.
            Invitation emails are drafted first — they await your approval in the Approvals tab before anything is sent.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviting(null)}>Back</Button>
          <Button variant="contained" disabled={inviteMutation.isPending} onClick={() => inviting && inviteMutation.mutate(inviting.id)}>
            Invite
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close confirmation */}
      <Dialog open={closing !== null} onClose={() => setClosing(null)} fullWidth maxWidth="xs">
        <DialogTitle>Close this round?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Voting on “{closing?.title}” will end. The option with the most votes wins automatically — pick one below only to settle a tie
            or override the result.
          </DialogContentText>
          {closing && closing.vote_count === 0 && (
            <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
              Nobody has voted yet. Closing now records no winner unless you pick one.
            </Alert>
          )}
          <FormControl size="small" fullWidth>
            <InputLabel>Winning option</InputLabel>
            <Select label="Winning option" value={winnerChoice} onChange={(e) => setWinnerChoice(String(e.target.value))}>
              <MenuItem value="">
                <em>Use the vote result</em>
              </MenuItem>
              {(closing?.options ?? []).map((option, index) => (
                <MenuItem key={index} value={String(index)}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClosing(null)}>Back</Button>
          <Button variant="contained" disabled={closeMutation.isPending} onClick={() => closing && closeMutation.mutate(closing)}>
            Close round
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleting !== null} onClose={() => setDeleting(null)}>
        <DialogTitle>Delete this round?</DialogTitle>
        <DialogContent>
          <DialogContentText>“{deleting?.title}”, its voter list and every vote cast will be removed.</DialogContentText>
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

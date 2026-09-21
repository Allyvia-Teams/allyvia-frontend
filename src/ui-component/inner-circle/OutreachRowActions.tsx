import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Tooltip
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

import {
  closeBuyingRound,
  deleteBuyingRound,
  deletePerk,
  deletePromotion,
  inviteBuyingRoundMembers,
  invitePerkMembers,
  openBuyingRound,
  updatePromotion
} from 'api/innerCircle.api';
import { inviteResultMessage, perkRowActions, voteRowActions, type OutreachRowSource } from 'views/inner-circle/outreachRows';
import PerkInvitesDrawer from './PerkInvitesDrawer';
import StyleVoteResultsDrawer from './StyleVoteResultsDrawer';

// ==============================|| INNER CIRCLE - OUTREACH ROW ACTIONS ||============================== //
// Everything a row can do, lifted from the three tabs this replaces: the same
// API calls, the same confirmations, the same query invalidations. Two things
// changed on purpose. The email-draft key is gone (Session 1 retired that
// path), and the copy no longer sends the owner to an Approvals tab that
// Session 3 deleted — see `inviteResultMessage` in the seam.
//
// The confirmations and drawers live HERE rather than in Outreach.tsx, so the
// destination stays a composition and a row owns its own consequences.

export interface OutreachRowActionsProps {
  source: OutreachRowSource;
  /** The row's own words, reused in the confirmations so they name the thing. */
  title: string;
  audience: string;
  onEdit: () => void;
}

/** Row controls wrap rather than squeeze: a vote row carries six of them. */
const groupSx = { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, flexWrap: 'wrap' } as const;

export default function OutreachRowActions({ source, title, audience, onEdit }: OutreachRowActionsProps) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmInvite, setConfirmInvite] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [winnerChoice, setWinnerChoice] = useState('');

  const invalidatePromotions = () => queryClient.invalidateQueries({ queryKey: ['ic-promotions'] });
  const invalidatePerks = () => queryClient.invalidateQueries({ queryKey: ['ic-perks'] });
  const invalidateRounds = () => queryClient.invalidateQueries({ queryKey: ['ic-buying-rounds'] });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => updatePromotion(id, { is_active }),
    onSuccess: () => invalidatePromotions(),
    onError: () => {
      // Re-read rather than trust the switch: the row must show what the
      // server holds, not what the click intended.
      invalidatePromotions();
      enqueueSnackbar('Failed to update promotion', { variant: 'error' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (source.kind === 'discount') return deletePromotion(source.promotion.id);
      if (source.kind === 'event') return deletePerk(source.perk.id);
      return deleteBuyingRound(source.round.id);
    },
    onSuccess: () => {
      if (source.kind === 'discount') invalidatePromotions();
      else if (source.kind === 'event') invalidatePerks();
      else invalidateRounds();
      enqueueSnackbar('Deleted', { variant: 'success' });
      setConfirmDelete(false);
    },
    onError: () => enqueueSnackbar('Failed to delete', { variant: 'error' })
  });

  const inviteMutation = useMutation({
    mutationFn: () => {
      if (source.kind === 'event') return invitePerkMembers(source.perk.id);
      if (source.kind === 'vote') return inviteBuyingRoundMembers(source.round.id);
      throw new Error('Only events and votes have an invite list');
    },
    onSuccess: (result) => {
      if (source.kind === 'event') {
        invalidatePerks();
        queryClient.invalidateQueries({ queryKey: ['ic-perk-invites'] });
      } else {
        invalidateRounds();
        queryClient.invalidateQueries({ queryKey: ['ic-buying-round-invites'] });
      }
      enqueueSnackbar(inviteResultMessage(result.invited), { variant: 'success' });
      setConfirmInvite(false);
    },
    onError: () => enqueueSnackbar('Failed to invite members', { variant: 'error' })
  });

  const openMutation = useMutation({
    mutationFn: (id: string) => openBuyingRound(id),
    onSuccess: () => {
      invalidateRounds();
      enqueueSnackbar('Voting is open', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to open voting — a round needs at least two options', { variant: 'error' })
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => closeBuyingRound(id, winnerChoice === '' ? undefined : { winning_option_index: Number(winnerChoice) }),
    onSuccess: () => {
      invalidateRounds();
      queryClient.invalidateQueries({ queryKey: ['ic-buying-round-results'] });
      enqueueSnackbar('Round closed', { variant: 'success' });
      setConfirmClose(false);
      setWinnerChoice('');
    },
    onError: () => enqueueSnackbar('Failed to close round', { variant: 'error' })
  });

  const editAndDelete = (
    <>
      <Tooltip title="Edit">
        <IconButton size="small" onClick={onEdit} aria-label={`Edit ${title}`}>
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton size="small" color="error" onClick={() => setConfirmDelete(true)} aria-label={`Delete ${title}`}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </>
  );

  const deleteCopy =
    source.kind === 'discount'
      ? { heading: 'Delete this promotion?', body: `“${title}” will be removed. Codes already issued are not affected.` }
      : source.kind === 'event'
        ? { heading: 'Delete this perk?', body: `“${title}” and its invite list will be removed.` }
        : { heading: 'Delete this round?', body: `“${title}”, its voter list and every vote cast will be removed.` };

  const vote = source.kind === 'vote' ? voteRowActions(source.round) : null;
  const perk = source.kind === 'event' ? perkRowActions(source.perk) : null;

  return (
    <Box sx={groupSx}>
      {source.kind === 'discount' && (
        <Tooltip title={source.promotion.is_active ? 'Live — turn off to stop issuing codes' : 'Draft — turn on to go live'}>
          <Switch
            size="small"
            checked={source.promotion.is_active}
            disabled={toggleMutation.isPending}
            onChange={(_, checked) => toggleMutation.mutate({ id: source.promotion.id, is_active: checked })}
            inputProps={{ 'aria-label': `Live: ${title}` }}
          />
        </Tooltip>
      )}

      {source.kind === 'event' && perk && (
        <>
          <Tooltip title={perk.inviteBlockedReason ?? ''}>
            <span>
              <Button
                size="small"
                variant="contained"
                disabled={!perk.canInvite || inviteMutation.isPending}
                onClick={() => setConfirmInvite(true)}
                sx={{ textTransform: 'none' }}
              >
                Invite eligible members
              </Button>
            </span>
          </Tooltip>
          <Button size="small" onClick={() => setInvitesOpen(true)} sx={{ textTransform: 'none' }}>
            Invites ({source.perk.invite_count})
          </Button>
        </>
      )}

      {source.kind === 'vote' && vote && (
        <>
          <Tooltip title={vote.openBlockedReason ?? ''}>
            <span>
              <Button
                size="small"
                variant="contained"
                disabled={!vote.canOpen || openMutation.isPending}
                onClick={() => openMutation.mutate(source.round.id)}
                sx={{ textTransform: 'none' }}
              >
                Open voting
              </Button>
            </span>
          </Tooltip>
          <Button
            size="small"
            disabled={!vote.canInvite || inviteMutation.isPending}
            onClick={() => setConfirmInvite(true)}
            sx={{ textTransform: 'none' }}
          >
            Invite eligible members
          </Button>
          <Button
            size="small"
            disabled={!vote.canClose}
            onClick={() => {
              setWinnerChoice('');
              setConfirmClose(true);
            }}
            sx={{ textTransform: 'none' }}
          >
            Close
          </Button>
          <Button size="small" onClick={() => setResultsOpen(true)} sx={{ textTransform: 'none' }}>
            Results
          </Button>
        </>
      )}

      {editAndDelete}

      {source.kind === 'event' && <PerkInvitesDrawer perk={invitesOpen ? source.perk : null} onClose={() => setInvitesOpen(false)} />}
      {source.kind === 'vote' && <StyleVoteResultsDrawer round={resultsOpen ? source.round : null} onClose={() => setResultsOpen(false)} />}

      {/* Invite confirmation */}
      <Dialog open={confirmInvite} onClose={() => setConfirmInvite(false)}>
        <DialogTitle>Invite eligible members?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {audience} will be added to the {source.kind === 'vote' ? 'voter' : 'invite'} list for “{title}”. Members with the app see it in
            their Inner Circle tile straight away and get a notification.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmInvite(false)}>Back</Button>
          <Button variant="contained" disabled={inviteMutation.isPending} onClick={() => inviteMutation.mutate()}>
            Invite
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close-round confirmation */}
      <Dialog open={confirmClose} onClose={() => setConfirmClose(false)} fullWidth maxWidth="xs">
        <DialogTitle>Close this round?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Voting on “{title}” will end. The option with the most votes wins automatically — pick one below only to settle a tie or
            override the result.
          </DialogContentText>
          {source.kind === 'vote' && source.round.vote_count === 0 && (
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
              {(source.kind === 'vote' ? source.round.options : []).map((option, index) => (
                <MenuItem key={index} value={String(index)}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClose(false)}>Back</Button>
          <Button
            variant="contained"
            disabled={closeMutation.isPending}
            onClick={() => source.kind === 'vote' && closeMutation.mutate(source.round.id)}
          >
            Close round
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>{deleteCopy.heading}</DialogTitle>
        <DialogContent>
          <DialogContentText>{deleteCopy.body}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Back</Button>
          <Button color="error" variant="contained" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

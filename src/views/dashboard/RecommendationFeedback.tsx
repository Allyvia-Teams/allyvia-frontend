// Thumbs, reason chips and snooze for a recommendation card (ALL-17).
//
// One implementation, used by both the primary and compact variants, because
// the two differ only in density — and a second copy is how the compact card
// ends up quietly posting a different payload than the big one.
//
// The behaviour worth knowing before changing anything here:
//
//  - A thumbs-down DISMISSES the card server-side, and a later thumbs-up
//    UN-dismisses it. So a declined card is dimmed and kept on screen rather
//    than removed: removing it would take the undo path away with it, and the
//    contract explicitly supports down-then-up.
//  - Chips send on tap. That is the whole point of them — a reason row that
//    needs a second Submit press is a reason row people skip, which is how
//    every dismissal ended up recorded as `other` in the first place.
//  - Skipping the chips still submits. The backend records `other`; we do not
//    send it ourselves, so "skipped" and "deliberately chose Something else"
//    stay distinguishable (see buildFeedbackPayload).

import { useState, type MouseEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// material-ui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// icons
import { IconThumbUp, IconThumbDown, IconX, IconClock, IconCheck, IconRotateClockwise } from '@tabler/icons-react';

// project imports
import { AgentAPI, type PendingRecommendation } from 'api/agent.api';
import {
  DEFAULT_SNOOZE_DAYS,
  FEEDBACK_REASON_CODES,
  FEEDBACK_REASON_LABELS,
  SNOOZE_DAY_OPTIONS,
  isBackFromSnooze,
  type FeedbackInput,
  type FeedbackReasonCode
} from 'api/agentFeedback';

export const PENDING_QUERY_KEY = ['agent-pending-recommendations'];

export type CardVerdict = 'idle' | 'accepted' | 'declined' | 'snoozed';

export interface RecommendationFeedback {
  verdict: CardVerdict;
  /** Snoozed cards leave the surface entirely; declined ones stay, dimmed. */
  hidden: boolean;
  dimmed: boolean;
  choosing: boolean;
  isPending: boolean;
  isError: boolean;
  backFromSnooze: boolean;
  reasonText: string;
  setReasonText: (value: string) => void;
  openReasons: () => void;
  cancelReasons: () => void;
  sendUp: () => void;
  sendDown: (reasonCode?: FeedbackReasonCode | null) => void;
  snooze: (days: number) => void;
}

export const useRecommendationFeedback = (rec: PendingRecommendation): RecommendationFeedback => {
  const queryClient = useQueryClient();
  const [verdict, setVerdict] = useState<CardVerdict>('idle');
  const [choosing, setChoosing] = useState(false);
  const [reasonText, setReasonText] = useState('');

  const feedbackMutation = useMutation({
    mutationFn: (input: FeedbackInput) => AgentAPI.Recommendations.submitFeedback(rec.id, input),
    onSuccess: (_data, input) => {
      setChoosing(false);
      if (input.sentiment === 'up') {
        setVerdict('accepted');
        // An "up" can un-dismiss a card the server had dropped, so let the list
        // catch up. The accepted state is local, so a refetch won't clear it.
        queryClient.invalidateQueries({ queryKey: PENDING_QUERY_KEY });
        return;
      }
      setVerdict('declined');
      // Deliberately NOT invalidating here. A "down" dismisses server-side, so
      // refetching would drop this card from the list — and with it the thumbs-up
      // that undoes the decision. The list corrects itself on the next natural
      // refetch, by which point the undo window has passed.
    }
  });

  const snoozeMutation = useMutation({
    mutationFn: (days: number) => AgentAPI.Recommendations.snooze(rec.id, days),
    onSuccess: () => {
      setVerdict('snoozed');
      queryClient.invalidateQueries({ queryKey: PENDING_QUERY_KEY });
    }
  });

  return {
    verdict,
    hidden: verdict === 'snoozed',
    dimmed: verdict === 'declined',
    choosing,
    isPending: feedbackMutation.isPending || snoozeMutation.isPending,
    isError: feedbackMutation.isError || snoozeMutation.isError,
    backFromSnooze: isBackFromSnooze(rec.snoozed_until),
    reasonText,
    setReasonText,
    openReasons: () => setChoosing(true),
    cancelReasons: () => setChoosing(false),
    // Repeat taps are safe: the endpoint is idempotent per (pending, sentiment)
    // and answers "unchanged", so there is nothing to guard beyond the disabled
    // state while a request is in flight.
    sendUp: () => feedbackMutation.mutate({ sentiment: 'up' }),
    sendDown: (reasonCode?: FeedbackReasonCode | null) => feedbackMutation.mutate({ sentiment: 'down', reasonCode, reasonText }),
    snooze: (days: number) => snoozeMutation.mutate(days)
  };
};

// --- reason chips -------------------------------------------------------

export const ReasonChips = ({ feedback, compact }: { feedback: RecommendationFeedback; compact?: boolean }) => (
  <Box onClick={(event: MouseEvent) => event.stopPropagation()} sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
      What made this a no? One tap sends it.
    </Typography>
    <Box display="flex" flexWrap="wrap" gap={0.5}>
      {FEEDBACK_REASON_CODES.map((code) => (
        <Chip
          key={code}
          size="small"
          variant="outlined"
          clickable
          disabled={feedback.isPending}
          label={FEEDBACK_REASON_LABELS[code]}
          onClick={() => feedback.sendDown(code)}
        />
      ))}
    </Box>
    <Box display="flex" alignItems="center" gap={1} mt={1} flexWrap="wrap">
      <TextField
        size="small"
        variant="standard"
        placeholder="Tell us more (optional)"
        value={feedback.reasonText}
        disabled={feedback.isPending}
        onChange={(event) => feedback.setReasonText(event.target.value)}
        sx={{ flex: 1, minWidth: compact ? 140 : 200 }}
        inputProps={{ maxLength: 280, 'aria-label': 'Tell us more' }}
      />
      {/* Skipping the chips is a legitimate answer, not an escape hatch — it
          still posts a "down", which the backend records as `other`. */}
      <Button size="small" variant="text" color="inherit" disabled={feedback.isPending} onClick={() => feedback.sendDown(null)}>
        Skip &amp; send
      </Button>
      <Button size="small" variant="text" color="inherit" disabled={feedback.isPending} onClick={feedback.cancelReasons}>
        Cancel
      </Button>
      {feedback.isPending && <CircularProgress size={14} />}
    </Box>
    {feedback.isError && (
      <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
        Couldn&apos;t save that — try again.
      </Typography>
    )}
  </Box>
);

// --- snooze -------------------------------------------------------------

const SnoozeButton = ({ feedback, compact }: { feedback: RecommendationFeedback; compact?: boolean }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <>
      <Tooltip title={`Not now — hide for ${DEFAULT_SNOOZE_DAYS} days`}>
        <span>
          <Button
            size="small"
            variant="text"
            color="inherit"
            disabled={feedback.isPending}
            startIcon={compact ? undefined : <IconClock size={14} />}
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              setAnchorEl(event.currentTarget);
            }}
            sx={compact ? { minWidth: 0, px: 0.5, flexShrink: 0 } : undefined}
            aria-label="Snooze recommendation"
          >
            {compact ? <IconClock size={14} /> : 'Not now'}
          </Button>
        </span>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} onClick={(e) => e.stopPropagation()}>
        {SNOOZE_DAY_OPTIONS.map((days) => (
          <MenuItem
            key={days}
            selected={days === DEFAULT_SNOOZE_DAYS}
            onClick={() => {
              setAnchorEl(null);
              feedback.snooze(days);
            }}
          >
            {days} days
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

// --- the control row ----------------------------------------------------

export const FeedbackControls = ({ feedback, compact }: { feedback: RecommendationFeedback; compact?: boolean }) => {
  const stop = (event: MouseEvent) => event.stopPropagation();
  const iconSize = compact ? 14 : 16;

  if (feedback.verdict === 'declined') {
    return (
      <Box display="flex" alignItems="center" gap={1} onClick={stop} sx={{ flexShrink: 0 }}>
        <Typography variant="caption" color="text.secondary">
          Thanks — we&apos;ll show fewer like this.
        </Typography>
        <Button
          size="small"
          variant="text"
          color="inherit"
          disabled={feedback.isPending}
          startIcon={<IconRotateClockwise size={iconSize} />}
          onClick={feedback.sendUp}
        >
          Undo
        </Button>
      </Box>
    );
  }

  return (
    <Box display="flex" alignItems="center" gap={0.25} onClick={stop} sx={{ flexShrink: 0 }}>
      {feedback.verdict === 'accepted' && (
        <Chip size="small" variant="outlined" color="success" icon={<IconCheck size={iconSize} />} label="Marked useful" sx={{ mr: 0.5 }} />
      )}
      <Tooltip title="This is useful">
        <span>
          <Button
            size="small"
            variant="text"
            color={feedback.verdict === 'accepted' ? 'success' : 'inherit'}
            disabled={feedback.isPending}
            onClick={feedback.sendUp}
            sx={{ minWidth: 28, p: 0.5 }}
            aria-label="Mark recommendation useful"
          >
            <IconThumbUp size={iconSize} />
          </Button>
        </span>
      </Tooltip>
      <Tooltip title="Not useful">
        <span>
          <Button
            size="small"
            variant="text"
            color="inherit"
            disabled={feedback.isPending}
            onClick={feedback.openReasons}
            sx={{ minWidth: 28, p: 0.5 }}
            aria-label="Mark recommendation not useful"
          >
            <IconThumbDown size={iconSize} />
          </Button>
        </span>
      </Tooltip>
      <SnoozeButton feedback={feedback} compact={compact} />
      {/* The X is the same decision as a thumbs-down, so it opens the same chip
          row. Before this it posted a bare dismissal, which is why every reason
          in the data was `other`. */}
      <Tooltip title="Dismiss">
        <span>
          <Button
            size="small"
            variant="text"
            color="inherit"
            disabled={feedback.isPending}
            onClick={feedback.openReasons}
            sx={{ minWidth: 28, p: 0.5 }}
            aria-label="Dismiss recommendation"
          >
            <IconX size={iconSize} />
          </Button>
        </span>
      </Tooltip>
    </Box>
  );
};

export const BackFromSnoozeHint = () => (
  <Chip size="small" variant="outlined" color="info" icon={<IconClock size={12} />} label="Back from snooze" sx={{ height: 20 }} />
);

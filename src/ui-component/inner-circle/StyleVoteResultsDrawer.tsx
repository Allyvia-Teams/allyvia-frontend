import { useQuery } from '@tanstack/react-query';

import { Box, Chip, Divider, Drawer, IconButton, LinearProgress, Paper, Skeleton, Stack, Typography } from '@mui/material';
import HowToVoteOutlinedIcon from '@mui/icons-material/HowToVoteOutlined';
import { IconX } from '@tabler/icons-react';

import { fetchBuyingRoundInvites, fetchBuyingRoundResults, type BuyingRound, type VoteInvite } from 'api/innerCircle.api';
import TierChip from './TierChip';
import { formatCurrency } from './formatters';

export interface StyleVoteResultsDrawerProps {
  round: BuyingRound | null;
  onClose: () => void;
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <Box sx={{ textAlign: 'center', flex: 1 }}>
      <Typography variant="h4" fontWeight={800}>
        {value}
      </Typography>
      <Typography variant="caption" color="textSecondary">
        {label}
      </Typography>
    </Box>
  );
}

export default function StyleVoteResultsDrawer({ round, onClose }: StyleVoteResultsDrawerProps) {
  const roundId = round?.id ?? null;

  const {
    data: tally,
    isLoading: tallyLoading,
    isError: tallyError
  } = useQuery({
    queryKey: ['ic-buying-round-results', roundId],
    queryFn: () => fetchBuyingRoundResults(roundId!),
    enabled: roundId !== null
  });

  const {
    data: inviteData,
    isLoading: invitesLoading,
    isError: invitesError
  } = useQuery({
    queryKey: ['ic-buying-round-invites', roundId],
    queryFn: () => fetchBuyingRoundInvites(roundId!),
    enabled: roundId !== null
  });

  const invites: VoteInvite[] = inviteData ?? [];
  const isTie = (tally?.winning_option_indexes.length ?? 0) > 1;

  return (
    <Drawer
      anchor="right"
      open={round !== null}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 480 }, borderLeft: '1px solid', borderColor: 'divider' }
      }}
    >
      <Box sx={{ p: 2.5, height: '100%', overflowY: 'auto' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="h4" noWrap>
            {round?.title ?? 'Style vote'}
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Close results drawer">
            <IconX size={18} />
          </IconButton>
        </Stack>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Results and turnout
        </Typography>

        {tallyLoading && <Skeleton variant="rounded" height={200} />}
        {tallyError && !tallyLoading && <Typography color="error">Failed to load results.</Typography>}

        {tally && !tallyLoading && (
          <>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" divider={<Divider orientation="vertical" flexItem />}>
                <StatBlock label="Votes" value={tally.total_votes} />
                <StatBlock label="Invited" value={tally.invited} />
                <StatBlock label="Turnout" value={`${tally.participation_rate}%`} />
              </Stack>
            </Paper>

            {isTie && <Chip label="Tied — pick a winner when you close" color="warning" size="small" variant="outlined" sx={{ mt: 2 }} />}

            <Stack spacing={1.5} sx={{ mt: 2.5 }}>
              {tally.results.map((result) => {
                const isWinning = tally.winning_option_indexes.includes(result.option_index);
                return (
                  <Box key={result.option_index}>
                    <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
                      <Typography variant="body2" fontWeight={isWinning ? 700 : 400} noWrap sx={{ minWidth: 0 }}>
                        {result.label}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" sx={{ flexShrink: 0 }}>
                        {result.votes} · {result.share}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={result.share}
                      color={isWinning && tally.total_votes > 0 ? 'primary' : 'inherit'}
                      sx={{ height: 8, borderRadius: 1, mt: 0.5, opacity: isWinning ? 1 : 0.5 }}
                    />
                  </Box>
                );
              })}
            </Stack>

            {tally.total_votes === 0 && (
              <Stack alignItems="center" sx={{ mt: 3, color: 'text.secondary' }}>
                <HowToVoteOutlinedIcon sx={{ fontSize: 36, mb: 0.5 }} />
                <Typography variant="body2">No votes cast yet.</Typography>
              </Stack>
            )}
          </>
        )}

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
          Invited members ({invites.length})
        </Typography>

        {invitesLoading && (
          <Stack spacing={1}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={56} />
            ))}
          </Stack>
        )}

        {invitesError && !invitesLoading && <Typography color="error">Failed to load invites.</Typography>}

        {!invitesLoading && !invitesError && invites.length === 0 && (
          <Typography color="textSecondary" variant="body2">
            No invites yet. Use “Invite eligible members” on the round card to generate invitation emails.
          </Typography>
        )}

        <Stack spacing={1}>
          {invites.map((invite) => {
            const votedLabel =
              invite.voted_option_index != null
                ? (tally?.results.find((r) => r.option_index === invite.voted_option_index)?.label ??
                  `Option ${invite.voted_option_index + 1}`)
                : null;
            return (
              <Paper key={invite.id} elevation={0} sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {invite.contact.name}
                      </Typography>
                      {invite.contact.tier && <TierChip tier={invite.contact.tier} />}
                    </Stack>
                    <Typography variant="caption" color="textSecondary" noWrap>
                      {invite.contact.email} · {formatCurrency(invite.contact.ltv)}
                    </Typography>
                  </Box>
                  {votedLabel ? (
                    <Chip label={votedLabel} size="small" color="primary" variant="outlined" sx={{ flexShrink: 0, maxWidth: 160 }} />
                  ) : (
                    <Chip label="No vote" size="small" variant="outlined" sx={{ flexShrink: 0 }} />
                  )}
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </Box>
    </Drawer>
  );
}

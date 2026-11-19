import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import SocialAPI, { type SocialProposal } from 'api/social.api';

import {
  KINDS,
  REVIEW_TITLE,
  SUGGESTED_LINE,
  captionParts,
  confirmBody,
  confirmedLine,
  datesLine,
  draftOf,
  draftProblem,
  postedLine,
  reviewLists,
  type Draft
} from './socialEvents';
import { SOCIAL_CONNECTION_KEY, SOCIAL_PROPOSALS_KEY } from './useSocialConnection';

export interface StoreOption {
  id: string;
  name: string;
}

function Caption({ caption, quote }: { caption: string; quote: string }) {
  return (
    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
      {captionParts(caption, quote).map((part, i) =>
        part.quoted ? (
          <Box key={i} component="mark" sx={{ bgcolor: 'warning.light', color: 'text.primary', px: 0.25, borderRadius: 0.5 }}>
            {part.text}
          </Box>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </Typography>
  );
}

export function SuggestionRow({
  row,
  stores,
  busy,
  onConfirm,
  onDismiss
}: {
  row: SocialProposal;
  stores: ReadonlyArray<StoreOption>;
  busy?: boolean;
  onConfirm: (draft: Draft) => void;
  onDismiss: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(row));
  const problem = draftProblem(draft);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  return (
    <Stack spacing={1.5} sx={{ py: 2 }} data-testid={`suggestion-${row.id}`}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
        <Typography variant="subtitle2">{postedLine(row.post.posted_at)}</Typography>
        {row.post.permalink ? (
          <Link href={row.post.permalink} target="_blank" rel="noopener noreferrer" variant="body2">
            Open the post
          </Link>
        ) : null}
      </Stack>
      <Caption caption={row.post.caption} quote={row.quote} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          select
          size="small"
          label="What it is"
          value={draft.kind}
          onChange={(e) => set({ kind: e.target.value as Draft['kind'] })}
          sx={{ minWidth: 160 }}
        >
          {KINDS.map((k) => (
            <MenuItem key={k.value} value={k.value}>
              {k.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          type="date"
          label="First day"
          value={draft.start}
          onChange={(e) => set({ start: e.target.value })}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          type="date"
          label="Last day"
          value={draft.end}
          onChange={(e) => set({ end: e.target.value })}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          select
          size="small"
          label="Store"
          value={draft.locationId}
          onChange={(e) => set({ locationId: e.target.value })}
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">Every store</MenuItem>
          {stores.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {problem ? (
        <Typography variant="caption" color="error">
          {problem}
        </Typography>
      ) : null}
      <Stack direction="row" spacing={1}>
        <Button variant="contained" size="small" disabled={busy || problem !== null} onClick={() => onConfirm(draft)}>
          Confirm
        </Button>
        <Button size="small" color="inherit" disabled={busy} onClick={onDismiss}>
          Dismiss
        </Button>
      </Stack>
    </Stack>
  );
}

export function PostEventsReviewView({
  rows,
  stores,
  status,
  busyId,
  error,
  onConfirm,
  onDismiss,
  onWithdraw
}: {
  rows?: SocialProposal[];
  stores: ReadonlyArray<StoreOption>;
  status: 'loading' | 'error' | 'ready';
  busyId?: string | null;
  error?: string | null;
  onConfirm: (row: SocialProposal, draft: Draft) => void;
  onDismiss: (row: SocialProposal) => void;
  onWithdraw: (row: SocialProposal) => void;
}) {
  if (status === 'loading') return <Skeleton variant="rounded" height={160} />;
  if (status === 'error') return <Alert severity="error">Couldn&apos;t load the events from your posts.</Alert>;
  const { toReview, confirmed } = reviewLists(rows);
  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {SUGGESTED_LINE} Nothing goes on your calendar until you confirm it. Confirmed events show on the chart and Allyvia learns what
        those days did to your sales.
      </Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Box>
        <Typography variant="subtitle1">To review</Typography>
        {toReview.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            Nothing to review right now.
          </Typography>
        ) : (
          toReview.map((row, i) => (
            <Box key={row.id}>
              {i > 0 ? <Divider /> : null}
              <SuggestionRow
                row={row}
                stores={stores}
                busy={busyId === row.id}
                onConfirm={(draft) => onConfirm(row, draft)}
                onDismiss={() => onDismiss(row)}
              />
            </Box>
          ))
        )}
      </Box>
      <Box>
        <Typography variant="subtitle1">Confirmed</Typography>
        {confirmed.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            None yet.
          </Typography>
        ) : (
          confirmed.map((row) => (
            <Stack key={row.id} direction="row" spacing={1} sx={{ py: 1, alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" title={datesLine(row.start_date, row.end_date)}>
                {confirmedLine(row)}
              </Typography>
              <Button size="small" color="inherit" disabled={busyId === row.id} onClick={() => onWithdraw(row)}>
                Withdraw
              </Button>
            </Stack>
          ))
        )}
      </Box>
    </Stack>
  );
}

const detail = (error: unknown): string => {
  const data = (error as { response?: { data?: Record<string, unknown> } })?.response?.data;
  const first = data && (data.detail ?? Object.values(data)[0]);
  if (typeof first === 'string') return first;
  if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
  return "That didn't save. Try again.";
};

/** The review list: suggestions from her posts, and the ones she confirmed. */
export default function PostEventsReview({
  open,
  onClose,
  stores
}: {
  open: boolean;
  onClose: () => void;
  stores: ReadonlyArray<StoreOption>;
}) {
  const client = useQueryClient();
  const list = useQuery({ queryKey: SOCIAL_PROPOSALS_KEY, queryFn: () => SocialAPI.proposals(), enabled: open, retry: false });
  const [busyId, setBusyId] = useState<string | null>(null);
  const done = () => {
    setBusyId(null);
    void client.invalidateQueries({ queryKey: SOCIAL_PROPOSALS_KEY });
    void client.invalidateQueries({ queryKey: SOCIAL_CONNECTION_KEY });
    void client.invalidateQueries({ queryKey: ['trends-timeline'] });
  };
  const act = useMutation({
    mutationFn: (run: () => Promise<unknown>) => run(),
    onSettled: done
  });
  const run = (row: SocialProposal, call: () => Promise<unknown>) => {
    setBusyId(row.id);
    act.mutate(call);
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" aria-labelledby="post-events-title">
      <DialogTitle id="post-events-title">{REVIEW_TITLE}</DialogTitle>
      <DialogContent>
        <PostEventsReviewView
          rows={list.data?.results}
          stores={stores}
          status={list.isError ? 'error' : list.data ? 'ready' : 'loading'}
          busyId={busyId}
          error={act.error ? detail(act.error) : null}
          onConfirm={(row, draft) => run(row, () => SocialAPI.confirm(row.id, confirmBody(draft)))}
          onDismiss={(row) => run(row, () => SocialAPI.dismiss(row.id))}
          onWithdraw={(row) => run(row, () => SocialAPI.withdraw(row.id))}
        />
      </DialogContent>
    </Dialog>
  );
}

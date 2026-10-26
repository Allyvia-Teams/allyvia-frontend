// Share (design §10, B8's links): a read-only link to the shared projection of the memo. The link is shown once,
// when it is made (the server keeps only its hash); the list shows each link's prefix, maker, expiry, and Revoke.

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { createShare, listShares, revokeShare } from 'api/buying.api';

import { shareUrl } from '../apiPath';

interface Props {
  open: boolean;
  onClose: () => void;
  planId: string;
  locationId: string | null;
  canShare: boolean;
}

const detail = (error: unknown, fallback: string): string => {
  const d = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof d === 'string' ? d : fallback;
};

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

export default function ShareDialog({ open, onClose, planId, locationId, canShare }: Props) {
  const client = useQueryClient();
  const [made, setMade] = useState<{ url: string; expires: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const key = ['buy-plan-shares', planId, locationId];
  const shares = useQuery({ queryKey: key, queryFn: () => listShares(planId, locationId), enabled: open, retry: false });
  const create = useMutation({
    mutationFn: () => createShare(planId, locationId),
    onSuccess: ({ share }) => {
      setMade({ url: shareUrl(share.path, window.location.origin, import.meta.env.VITE_APP_BASE_NAME), expires: share.expires_at });
      setCopied(false);
      client.invalidateQueries({ queryKey: key });
      client.invalidateQueries({ queryKey: ['buy-plan-versions', planId] });
    }
  });
  const revoke = useMutation({
    mutationFn: (shareId: string) => revokeShare(planId, shareId, locationId),
    onSuccess: () => client.invalidateQueries({ queryKey: key })
  });
  const close = () => {
    setMade(null);
    onClose();
  };
  const live = (shares.data?.shares ?? []).filter((s) => !s.revoked_at);

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>Share this memo</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          Anyone with the link can read the memo until it expires. They cannot change it or ask the assistant, and they do not see costs,
          cash, notes or customer counts.
        </Typography>
        {made ? (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Copy it now: it is shown only once. It works until {day(made.expires)}.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                value={made.url}
                slotProps={{ htmlInput: { readOnly: true, 'aria-label': 'Share link' } }}
              />
              <Button
                variant="contained"
                onClick={() => {
                  navigator.clipboard?.writeText(made.url).then(
                    () => setCopied(true),
                    () => setCopied(false)
                  );
                }}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </Box>
          </Box>
        ) : null}
        {create.isError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {detail(create.error, 'The link could not be made. Try again.')}
          </Alert>
        ) : null}
        {revoke.isError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {detail(revoke.error, 'The link could not be revoked. Try again.')}
          </Alert>
        ) : null}
        <Typography component="h3" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
          Links that work now
        </Typography>
        {shares.isError ? <Typography color="error">The links could not be read.</Typography> : null}
        {shares.data && live.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            None.
          </Typography>
        ) : null}
        <Stack spacing={1}>
          {live.map((s) => (
            <Box
              key={s.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '8px',
                px: 1.5,
                py: 1
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{s.prefix}…</Typography>
                <Typography variant="caption" color="text.secondary">
                  {s.created_by_email} · until {day(s.expires_at)}
                </Typography>
              </Box>
              <Button size="small" color="error" onClick={() => revoke.mutate(s.id)} disabled={revoke.isPending}>
                Revoke
              </Button>
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Close</Button>
        {canShare ? (
          <Button variant="contained" onClick={() => create.mutate()} disabled={create.isPending}>
            Make a link
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}

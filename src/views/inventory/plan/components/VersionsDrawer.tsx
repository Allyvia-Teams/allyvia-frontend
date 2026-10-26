// "Show changes" (design §10): the plan's history, newest first, in the server's sentences. Her decisions read
// apart from the planner's re-sizes; a line's later revision opens its diff.

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconX } from '@tabler/icons-react';

import { getVersions } from 'api/buying.api';

import { diffLines, versionRows, type VersionRow } from '../versions';

interface Props {
  open: boolean;
  onClose: () => void;
  planId: string;
  locationId: string | null;
}

const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const Diff = ({ planId, locationId, diff }: { planId: string; locationId: string | null; diff: NonNullable<VersionRow['diff']> }) => {
  const query = useQuery({
    queryKey: ['buy-plan-diff', planId, locationId, diff],
    queryFn: () => getVersions(planId, 1, locationId, diff),
    staleTime: Infinity,
    retry: false
  });
  if (query.isLoading) return <Skeleton height={40} />;
  if (query.isError) {
    return (
      <Typography variant="caption" color="error">
        What changed could not be read. Try again.
      </Typography>
    );
  }
  const lines = diffLines(query.data?.diff);
  if (lines.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        No difference to show.
      </Typography>
    );
  }
  return (
    <Box component="ul" sx={{ m: 0, pl: '18px', fontFamily: 'monospace', fontSize: '0.75rem' }}>
      {lines.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </Box>
  );
};

export default function VersionsDrawer({ open, onClose, planId, locationId }: Props) {
  const [page, setPage] = useState(1);
  const [openDiff, setOpenDiff] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['buy-plan-versions', planId, locationId, page],
    queryFn: () => getVersions(planId, page, locationId),
    enabled: open,
    retry: false
  });
  const rows = query.data ? versionRows(query.data.entries, new Date(), browserZone()) : [];

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 420 } } } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography component="h2" sx={{ fontWeight: 600, flex: 1 }}>
          Changes
        </Typography>
        <IconButton onClick={onClose} aria-label="Close changes" size="small">
          <IconX size={16} />
        </IconButton>
      </Box>
      <Box sx={{ p: 2, overflowY: 'auto' }}>
        {query.isLoading ? <Skeleton variant="rounded" height={160} /> : null}
        {query.isError ? (
          <Typography color="error" role="alert">
            The changes could not be read. Try again.
          </Typography>
        ) : null}
        {query.data && rows.length === 0 ? <Typography color="text.secondary">No changes yet.</Typography> : null}
        <Stack spacing={1.5} component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {rows.map((row) => (
            <Box
              component="li"
              key={row.key}
              sx={{ borderLeft: '3px solid', borderColor: row.tone === 'owner' ? 'primary.main' : 'divider', pl: 1.5 }}
            >
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip size="small" label={row.kindLabel} color={row.tone === 'owner' ? 'primary' : 'default'} variant="outlined" />
                <Typography variant="caption" color="text.secondary">
                  {row.when}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {row.sentence}
              </Typography>
              {row.diff ? (
                <Box sx={{ mt: 0.5 }}>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setOpenDiff(openDiff === row.key ? null : row.key)}
                    aria-expanded={openDiff === row.key}
                  >
                    {openDiff === row.key ? 'Hide what changed' : 'What changed'}
                  </Button>
                  {openDiff === row.key ? <Diff planId={planId} locationId={locationId} diff={row.diff} /> : null}
                </Box>
              ) : null}
            </Box>
          ))}
        </Stack>
        {query.data && query.data.pages > 1 ? (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button size="small" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Newer
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
              Page {query.data.page} of {query.data.pages}
            </Typography>
            <Button size="small" disabled={page >= query.data.pages} onClick={() => setPage(page + 1)}>
              Older
            </Button>
          </Box>
        ) : null}
      </Box>
    </Drawer>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { getPostingSettings, listPostings } from 'api/qbPosting.api';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';
import { postingLogQuery, type PostingSettings, type PostingsPage } from 'views/inventory/qbPosting';

type LoadStatus = 'idle' | 'loading' | 'ok' | 'error';

type HealthView = { mode: 'off' } | { mode: 'on'; lastPostedDay: string | null; failedCount: number };

/**
 * QuickBooks posting health for the analytics picker (ALL-250).
 *
 * Gate: `qb_posting_enabled` from `GET /quickbooks/posting-settings/`
 * (`getPostingSettings`) — not Redux company settings.
 *
 * Metrics (when on): derived from the real ledger
 * `GET /quickbooks/postings/` (`listPostings`). That endpoint returns a
 * paginated `items` + `pagination` block, not a dedicated
 * "last_posted_day / failed_count" summary — so those two figures come from
 * filtered list calls (`posted`/`amended` and `failed`, page_size 1).
 */
const QuickBooksPostingHealthWidget: React.FC<AnalyticsWidgetProps> = ({ isLoading: parentLoading }) => {
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [view, setView] = useState<HealthView | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const settingsBody = (await getPostingSettings()) as PostingSettings;
      if (!settingsBody?.qb_posting_enabled) {
        setView({ mode: 'off' });
        setStatus('ok');
        return;
      }

      const [postedPage, failedPage] = await Promise.all([
        listPostings(postingLogQuery({ statuses: ['posted', 'amended'], pageSize: 1 })) as Promise<PostingsPage>,
        listPostings(postingLogQuery({ statuses: ['failed'], pageSize: 1 })) as Promise<PostingsPage>
      ]);

      const lastPostedDay = postedPage?.items?.[0]?.posting_date ?? null;
      const failedCount = Number(failedPage?.pagination?.total_items ?? 0);

      setView({ mode: 'on', lastPostedDay, failedCount });
      setStatus('ok');
    } catch {
      setView(null);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isLoading = Boolean(parentLoading || status === 'loading' || status === 'idle');

  if (isLoading) {
    return (
      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="55%" height={36} />
        <Skeleton variant="text" width="35%" />
        <Skeleton variant="text" width="30%" height={36} />
      </Box>
    );
  }

  // ALL-103: failed fetch must not look like "0 failures / no last day".
  if (status === 'error') {
    return (
      <Box sx={{ p: 1.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: 'text.secondary' }}>
          —
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Couldn&apos;t load QuickBooks posting health.
        </Typography>
        <Button size="small" variant="text" color="inherit" onClick={() => void load()} sx={{ mt: 0.5, px: 0.5, minHeight: 0 }}>
          Retry
        </Button>
      </Box>
    );
  }

  // Honest off — not hidden, not an error (house copy matches qbPosting.ts).
  if (view?.mode === 'off') {
    return (
      <Box sx={{ p: 1.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, textWrap: 'pretty' }}>
          QuickBooks posting is switched off for this company. Nothing is being sent to QuickBooks.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          Last posted day
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
          {view?.lastPostedDay ?? '—'}
        </Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          Failed postings
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
          {view?.failedCount.toLocaleString() ?? '—'}
        </Typography>
      </Box>
    </Box>
  );
};

export default QuickBooksPostingHealthWidget;

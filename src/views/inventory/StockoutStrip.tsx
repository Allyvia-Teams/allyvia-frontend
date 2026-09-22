// views/inventory/StockoutStrip.tsx
//
// "What is about to run out", compact enough to sit above the catalogue.
//
// Every rule this strip applies is reorder.ts's, composed rather than restated:
// `urgentStockouts` picks the rows (red inside the lead time, amber inside twice
// it) using the same `reorderUrgency` thresholds the reorder inbox uses, so the
// two surfaces cannot disagree about a row; `describeStockout` words the date;
// `reorderInboxHref` builds every link with its uuid gate intact.
//
// THE THREE STATES THIS COMPONENT REFUSES TO BLUR, all of which would otherwise
// render as the same grey box:
//
//   1. The request did not come back. That is NOT "nothing is urgent" — it is a
//      failed check, and saying "you're fine" on its behalf is the one thing a
//      stockout warning must never do. It gets an alert and a retry.
//   2. There are no suggestions at all. The nightly run has not written any yet.
//   3. There are suggestions and none of them is close. That is genuinely good
//      news and gets a calm sentence, not a hidden component — the finance
//      precedent: an absent payload and an all-zero one are different claims.

import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { Alert, Box, Button, CircularProgress, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconArrowRight, IconRefresh } from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';
import AllyviaChip from 'ui-component/common/AllyviaChip';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';

import { listReorderSuggestions } from 'api/inventoryReorder.api';

import { presenceOf } from './insights';
import {
  REORDER_INBOX_PATH,
  ReorderInbox,
  UrgentStockout,
  describeStockout,
  normalizeReorderResponse,
  reorderInboxHref,
  reorderListQuery,
  urgentStockouts
} from './reorder';
import { formatQuantity } from './stockFormat';

/**
 * How many rows the strip shows before handing off to the inbox.
 *
 * A display decision, not a threshold on the data: the count line always states
 * the true total, so nothing is hidden without being counted. `urgentStockouts`
 * decides what is urgent; this only decides what fits.
 */
const MAX_ROWS = 5;

const StockoutRow = ({ entry }: { entry: UrgentStockout }) => {
  const theme = useTheme();
  const { suggestion, urgency, leadTime } = entry;
  const stockout = describeStockout(suggestion);
  const accent = urgency.color === 'error' ? theme.palette.error.main : theme.palette.warning.main;
  const variant = [suggestion.size, suggestion.color].filter(Boolean).join(' · ');

  // `urgency.detail` reads "restocking takes about N days". For a `no_supplier`
  // row that N is the REVIEW PERIOD standing in for a lead time, and there is
  // nobody to order from at all — so the provenance sentence replaces it rather
  // than sitting beside a number it contradicts.
  const why = leadTime.isLeadTime ? urgency.detail : leadTime.detail;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
        px: 1.5,
        py: 1,
        borderRadius: 1,
        borderLeft: `4px solid ${accent}`,
        bgcolor: 'action.hover'
      }}
    >
      <AllyviaChip size="small" color={urgency.color} label={urgency.label} tooltipTitle={why} />

      <Box sx={{ flex: '1 1 220px', minWidth: 0 }}>
        <Typography variant="body2" color="text.primary" noWrap>
          {suggestion.name}
          {variant && (
            <Typography component="span" variant="caption" color="text.secondary">
              {` ${variant}`}
            </Typography>
          )}
        </Typography>
        <Tooltip title={stockout.detail}>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {suggestion.location_name} — {stockout.headline}
          </Typography>
        </Tooltip>
      </Box>

      <Tooltip title="What the engine suggests ordering. Open the row to see the arithmetic behind it.">
        <Typography variant="body2" fontWeight={600} color="text.primary">
          Order {formatQuantity(suggestion.suggested_qty)}
        </Typography>
      </Tooltip>

      <Button
        size="small"
        variant="text"
        component={RouterLink}
        to={reorderInboxHref(suggestion.id, suggestion.location_id)}
        endIcon={<IconArrowRight size={14} />}
      >
        Review
      </Button>
    </Box>
  );
};

export interface StockoutStripProps {
  /** Scope to one location. Anything that is not a uuid is ignored, not sent. */
  locationId?: string | null;
}

export default function StockoutStrip({ locationId = null }: StockoutStripProps) {
  const [inbox, setInbox] = useState<ReorderInbox | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // No `statuses`, deliberately: an empty `?status=` is a 400, and omitting
      // it is what makes the backend apply its own default of live suggestions
      // only. A dismissed suggestion is a decision somebody made, and re-raising
      // it here would be overruling them.
      const body = await listReorderSuggestions(reorderListQuery({ locationId }));
      setInbox(normalizeReorderResponse(body));
      setError(null);
    } catch {
      // The payload stays null so `presenceOf` reads 'absent'. A failed check
      // must not be able to render as "nothing is urgent".
      setInbox(null);
      setError('Could not check what is running out.');
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = inbox?.items ?? [];
  const presence = presenceOf(inbox, rows);
  const urgent = urgentStockouts(rows);
  const shown = urgent.slice(0, MAX_ROWS);

  const emptyTitle = presence === 'empty' ? 'No reorder suggestions yet' : 'Nothing is running out soon';
  // Says what was actually checked, not more: "none is close" rather than "all of
  // them have time left", because a row with no lead time recorded is excluded
  // too and has no restock time to have left.
  const emptyDescription =
    presence === 'empty'
      ? 'The nightly run writes these. You can also regenerate them on demand from the reorder inbox.'
      : `None of the ${rows.length} live ${rows.length === 1 ? 'suggestion is' : 'suggestions are'} inside twice its restock time. ` +
        'Items that are not selling are not counted here — they never run out.';

  return (
    <MainCard
      title="Running out soon"
      secondary={
        <Stack direction="row" spacing={1} alignItems="center">
          {loading && <CircularProgress size={18} />}
          <Tooltip title="Re-check">
            <IconButton size="small" onClick={load}>
              <IconRefresh size={18} />
            </IconButton>
          </Tooltip>
          <Button size="small" component={RouterLink} to={REORDER_INBOX_PATH} endIcon={<IconArrowRight size={14} />}>
            Reorder inbox
          </Button>
        </Stack>
      }
    >
      <Stack spacing={1.5}>
        <Typography variant="caption" color="text.secondary">
          Red means a new order cannot arrive before the shelf empties; amber means the window is closing. Anything with more time, or with
          no lead time to measure against, waits in the inbox.
        </Typography>

        {error ? (
          <Alert
            severity="warning"
            action={
              <Button size="small" color="inherit" onClick={load}>
                Retry
              </Button>
            }
          >
            {error} That is not the same as nothing being urgent — the check did not come back.
          </Alert>
        ) : (
          <AllyviaEmpty
            isLoading={loading && inbox === null}
            isEmpty={shown.length === 0}
            type="list"
            skeletonType="text"
            title={emptyTitle}
            description={emptyDescription}
            showIcon={false}
            height="auto"
            sx={{ p: 2 }}
          >
            <Stack spacing={1}>
              {shown.map((entry) => (
                <StockoutRow key={entry.suggestion.id} entry={entry} />
              ))}
            </Stack>
          </AllyviaEmpty>
        )}

        {shown.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            {/* The order is the backend's — forecast stockout date first — so reds are not grouped above ambers. */}
            Showing {shown.length} of {urgent.length} urgent, soonest first, out of {rows.length} live{' '}
            {rows.length === 1 ? 'suggestion' : 'suggestions'}.
          </Typography>
        )}
      </Stack>
    </MainCard>
  );
}

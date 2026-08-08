// views/inventory/ReorderSuggestionCard.tsx
//
// One suggestion, with its working shown rather than summarised.
//
// WHY THE WHOLE SUM IS ON THE CARD
// The engine's design constraint is that "a buyer asked to spend money on a
// number they cannot check will ignore the number", which is why every row
// carries a 20-key rationale. Hiding that behind a disclosure would put the
// screen back where it started: a quantity with no argument attached. So the
// velocity, the three spans that make the horizon, the target, and both
// subtractions are all on the face of the card, in the order a person reads a
// sum, together with the engine's own formula string.
//
// Every value below comes from reorder.ts. Nothing here recomputes a quantity, a
// ratio or an urgency — a second implementation of the arithmetic is exactly the
// thing this card exists to prevent.
//
// THREE THINGS THIS CARD REFUSES TO BLUR
//
//   1. A lead time that was MEASURED, one the supplier merely CLAIMS, and an item
//      with NO lead time at all are three different assertions. `describeLeadTime`
//      keeps them apart and the provenance is printed on the card, not in a
//      tooltip — for `no_supplier` the number shown is the review period standing
//      in for a horizon, and calling that a delivery estimate would be a lie
//      about the figure the buyer is being asked to trust.
//   2. A null stockout date is "not selling, so it never runs out" — the calmest
//      row in the inbox. It is rendered in muted text with that sentence, never
//      as 0 and never as a bare em dash that would read as missing data.
//   3. When the client's recomputation disagrees with the server's
//      `suggested_qty`, the card says so instead of printing a sum that does not
//      add up. A sum that looks checked and is not is worse than no sum at all.

import { Box, Button, Checkbox, Divider, Paper, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react';

import AllyviaChip from 'ui-component/common/AllyviaChip';

import {
  ReorderSuggestion,
  checkRationaleArithmetic,
  describeLeadTime,
  describeStockout,
  formatCoverage,
  readRationale,
  readRationaleMeta,
  reorderStatusColor,
  reorderStatusLabel,
  reorderUrgency
} from './reorder';
import { formatQuantity } from './stockFormat';

export interface ReorderSuggestionCardProps {
  suggestion: ReorderSuggestion;
  selected: boolean;
  /** False for a non-admin: the selection only feeds admin-only actions. */
  selectable: boolean;
  /** Why the controls are off, said in words rather than left to a 403. */
  disabledReason: string;
  onToggle: (id: string) => void;
  onApplyReorderPoint: (suggestion: ReorderSuggestion) => void;
  onDismiss: (suggestion: ReorderSuggestion) => void;
  /** Opens the purchase order an already-ordered suggestion became. */
  onOpenPurchaseOrder: (suggestion: ReorderSuggestion) => void;
  /**
   * This is the row a deep link pointed at — from the stockout strip or from a
   * dashboard recommendation. Marked rather than filtered to, so the buyer still
   * sees it in its true position in the queue: a suggestion is only urgent
   * relative to the ones above it.
   */
  focused?: boolean;
}

/** SKU, size and colour — whichever the variant actually has. */
const variantLine = (suggestion: ReorderSuggestion): string =>
  [suggestion.sku, suggestion.size, suggestion.color]
    .map((part) => (part ?? '').trim())
    .filter((part) => part !== '')
    .join(' · ');

export default function ReorderSuggestionCard({
  suggestion,
  selected,
  selectable,
  disabledReason,
  onToggle,
  onApplyReorderPoint,
  onDismiss,
  onOpenPurchaseOrder,
  focused = false
}: ReorderSuggestionCardProps) {
  const theme = useTheme();
  const rationale = suggestion.rationale;
  const steps = readRationale(rationale);
  const meta = readRationaleMeta(rationale);
  const leadTime = describeLeadTime(rationale);
  const stockout = describeStockout(suggestion);
  const check = checkRationaleArithmetic(rationale);
  // Urgency is measured against the restock time, so it takes the row's own lead
  // time. reorder.ts invents no threshold when there is none.
  const urgency = reorderUrgency(suggestion.days_until_stockout, suggestion.lead_time_days);
  const velocityStep = steps.find((step) => step.key === 'velocity_daily');
  const isLive = suggestion.status === 'suggested';
  const hasReorderPoint = suggestion.current_reorder_point !== null && suggestion.current_reorder_point !== undefined;
  const variant = variantLine(suggestion);

  return (
    <Paper
      variant="outlined"
      // `id` is the scroll target for a deep link; the ring is how the buyer
      // finds the row they clicked through for without it being lifted out of
      // the queue, whose order is the whole point of this screen.
      id={`reorder-suggestion-${suggestion.id}`}
      sx={{
        p: 2,
        ...(focused ? { borderColor: 'primary.main', borderWidth: 2, boxShadow: (t) => `0 0 0 3px ${t.palette.primary.light}55` } : {})
      }}
    >
      <Stack spacing={1.5}>
        {/* ---- who, where, and how loud ---- */}
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Tooltip title={selectable ? 'Select for a bulk action' : disabledReason}>
            <span>
              <Checkbox
                size="small"
                sx={{ mt: -0.5 }}
                checked={selected}
                disabled={!selectable}
                onChange={() => onToggle(suggestion.id)}
                inputProps={{ 'aria-label': `Select ${suggestion.name}` }}
              />
            </span>
          </Tooltip>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {suggestion.name}
            </Typography>
            {variant && (
              <Typography variant="caption" color="text.secondary" display="block">
                {variant}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" display="block">
              {suggestion.location_name}
              {' · '}
              {/* Attribution is the item's MOST FREQUENT purchase-order supplier,
                  not its most recent — saying so stops "but we switched supplier
                  last month" from reading as a bug. */}
              {suggestion.supplier_name ? `Usually bought from ${suggestion.supplier_name}` : 'No supplier on record'}
            </Typography>
          </Box>

          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap justifyContent="flex-end">
            <AllyviaChip
              size="small"
              color={urgency.color}
              variant={urgency.level === 'none' ? 'outlined' : 'filled'}
              label={urgency.label}
              tooltipTitle={urgency.detail}
            />
            <AllyviaChip
              size="small"
              variant="outlined"
              color={reorderStatusColor(suggestion.status)}
              label={suggestion.status_label || reorderStatusLabel(suggestion.status)}
            />
          </Stack>
        </Stack>

        {/* ---- the quantity, and when the shelf empties without it ---- */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <Box sx={{ minWidth: 128 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Suggested order
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
              {formatQuantity(suggestion.suggested_qty)}
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                units
              </Typography>
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {/* The stockout date is DISPLAYED, not merely the sort key: it is the
                answer to "and what happens if I do nothing". */}
            <Typography variant="body2" sx={{ fontWeight: 600 }} color={stockout.hasForecast ? 'text.primary' : 'text.secondary'}>
              {stockout.headline}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {stockout.detail}
            </Typography>
          </Box>
        </Stack>

        {/* ---- the working ---- */}
        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default' }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}
          >
            How this number was reached
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 1, mt: 1 }}>
            {steps.map((step) => (
              <Box key={step.key} sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                {step.operator && (
                  <Typography variant="body2" color="text.secondary" sx={{ pb: 0.25 }}>
                    {step.operator}
                  </Typography>
                )}
                <Tooltip title={step.detail ?? ''}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.2 }}>
                      {step.label}
                    </Typography>
                    {/* An em dash here means the engine did not record the figure.
                        It is never a 0 — a fabricated zero would read as a
                        measurement and change what somebody buys. */}
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: step.key === 'suggested_qty' ? 700 : 600 }}
                      color={step.known ? 'text.primary' : 'text.secondary'}
                    >
                      {step.value}
                    </Typography>
                  </Box>
                </Tooltip>
              </Box>
            ))}
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Stack spacing={0.75}>
            {/* The engine's own string, verbatim. If the backend's formula ever
                changes, printing theirs stops this screen claiming the old one. */}
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', wordBreak: 'break-word' }}>
              {meta.formula}
            </Typography>

            {/* Velocity provenance is visible text, not a tooltip: the 28-day
                window and the 2x weighting of its recent half are what make the
                velocity arguable rather than magic. */}
            {velocityStep?.detail && (
              <Typography variant="caption" color="text.secondary">
                <strong>Velocity:</strong> {velocityStep.detail}
              </Typography>
            )}

            {/* Lead-time provenance, on the card. Measured, claimed, or absent —
                three different assertions about the same number. */}
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <AllyviaChip
                size="small"
                variant="outlined"
                color={leadTime.isLeadTime ? 'default' : 'warning'}
                label={leadTime.label}
                sx={{ mt: 0.25, flexShrink: 0 }}
              />
              <Typography variant="caption" color="text.secondary">
                {leadTime.detail}
                {leadTime.observations.length > 0 && (
                  <>
                    {' '}
                    Recorded deliveries: {leadTime.observations.join(', ')} days.
                    {leadTime.observationsUnused && ' Those are not where the figure above came from.'}
                  </>
                )}
              </Typography>
            </Stack>
          </Stack>
        </Paper>

        {/* ---- does the sum add up? ---- */}
        {check.verdict === 'disagrees' && (
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <IconAlertTriangle size={18} color={theme.palette.warning.dark} style={{ flexShrink: 0, marginTop: 2 }} />
            <Typography variant="caption" color="warning.dark">
              {check.message}
            </Typography>
          </Stack>
        )}
        {check.verdict === 'incomplete' && (
          <Typography variant="caption" color="text.secondary">
            {check.message}
          </Typography>
        )}
        {check.verdict === 'agrees' && (
          <Stack direction="row" spacing={1} alignItems="center">
            <IconCircleCheck size={16} color={theme.palette.success.main} style={{ flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary">
              {check.message}
            </Typography>
          </Stack>
        )}

        {/* ---- provenance ---- */}
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
          <AllyviaChip
            size="small"
            variant="outlined"
            label={`Cover: ${meta.daysOfCover}`}
            tooltipTitle="How long the stock on hand lasts at this velocity. Nothing selling is not the same as no cover, so the two read differently."
          />
          <AllyviaChip
            size="small"
            variant="outlined"
            label={`Target covered: ${formatCoverage(rationale)}`}
            tooltipTitle="How much of the target stock is already on the shelf or on a purchase order."
          />
          <AllyviaChip size="small" variant="outlined" label={`Forecast: ${meta.provider}`} />
          <AllyviaChip
            size="small"
            variant="outlined"
            label={`Generated for ${meta.generatedForDate}`}
            tooltipTitle="The day this suggestion was computed for. Every figure on this card describes stock as it was then."
          />
        </Stack>

        <Divider />

        {/* ---- the reorder point, and the row's own actions ---- */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Reorder point
            </Typography>
            <Typography variant="body2">
              {/* Null is "nobody ever set one", which is why stockSeverity calls
                  such an item `ok` rather than `low`. Rendering it as 0 would
                  claim a threshold that does not exist. */}
              {formatQuantity(suggestion.current_reorder_point ?? null)} now → {formatQuantity(suggestion.suggested_reorder_point ?? null)}{' '}
              suggested
            </Typography>
            {!hasReorderPoint && (
              <Typography variant="caption" color="text.secondary">
                No reorder point is set today, so nothing flags this item as low anywhere in the app.
              </Typography>
            )}
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {suggestion.purchase_order_id && (
              <Button size="small" onClick={() => onOpenPurchaseOrder(suggestion)}>
                {suggestion.purchase_order_number || 'View purchase order'}
              </Button>
            )}
            <Tooltip title={selectable ? 'Write the suggested reorder point onto this item' : disabledReason}>
              <span>
                <Button size="small" variant="outlined" disabled={!selectable} onClick={() => onApplyReorderPoint(suggestion)}>
                  Apply reorder point
                </Button>
              </span>
            </Tooltip>
            {isLive && (
              <Tooltip title={selectable ? 'Take this suggestion out of the inbox' : disabledReason}>
                <span>
                  <Button size="small" color="inherit" disabled={!selectable} onClick={() => onDismiss(suggestion)}>
                    Dismiss
                  </Button>
                </span>
              </Tooltip>
            )}
          </Stack>
        </Stack>

        {/* A dismissal is a decision somebody made; the reason is the record of it. */}
        {suggestion.status === 'dismissed' && (
          <Typography variant="caption" color="text.secondary">
            {suggestion.dismissal_reason ? `Dismissed: ${suggestion.dismissal_reason}` : 'Dismissed, with no reason recorded.'}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

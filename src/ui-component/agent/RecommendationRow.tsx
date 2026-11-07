// The one recommendation row, shared by the dashboard's single slot and the
// sector tabs (Inventory Insights > Recommendations). Moved out of
// views/dashboard/RecommendationCard.tsx unchanged so both surfaces render the
// same thumbs, snooze, reason chips, rationale and deep links.
//
// `onDismiss` adds the swap X ("not this one, show me the next"): a plain
// POST …/dismiss/, distinct from the thumbs-down, which records a reason and
// stays dimmed for its undo (surfacing decision 5). Without it the row keeps
// FeedbackControls' own reason-chip X, exactly as before.

import type { MouseEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';

// material-ui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// icons
import { IconArrowRight, IconClipboardList, IconClockHour4, IconPackages, IconTrendingUp, IconUsers, IconX } from '@tabler/icons-react';

// project imports
import type { PendingRecommendation } from 'api/agent.api';
import { AGENT_FEED_CAP_NOTE, readReorderRecommendation } from 'views/inventory/reorder';
import { readBuyPlanRecommendation } from 'views/inventory/plan/dashboard';
import { ListRow, splitLead } from 'ui-component/frame';
import { BackFromSnoozeHint, FeedbackControls, ReasonChips, useRecommendationFeedback } from 'views/dashboard/RecommendationFeedback';
import RecommendationRationalePanel from 'views/dashboard/RecommendationRationale';
import { drivenByLine, impactKind } from 'views/dashboard/recommendationSignals';

// The deep link an inventory reorder recommendation gets, and nothing else does.
//
// `signal_sources.origin` is the only identity, and the reading is done by
// readReorderRecommendation — uuid-gated and total, so a malformed payload
// renders no link rather than a broken one, and every other recommendation is
// left exactly as it was.
//
// The tooltip carries AGENT_FEED_CAP_NOTE because this is the one place both
// counts become visible: the dashboard shows one ranked recommendation, the
// Inventory Insights tab lists the agent's restock picks, the inbox has
// neither cap nor horizon, and somebody who clicks through to find nineteen
// deserves to have been told why before they clicked rather than to read it
// as a bug.
export const ReorderInboxLink = ({ rec }: { rec: PendingRecommendation }) => {
  const reorder = readReorderRecommendation(rec.signal_sources);
  if (!reorder.isReorder || !reorder.href) return null;

  return (
    <Tooltip title={AGENT_FEED_CAP_NOTE}>
      <Button
        size="small"
        variant="text"
        component={RouterLink}
        to={reorder.href}
        onClick={(event: MouseEvent) => event.stopPropagation()}
        endIcon={<IconArrowRight size={14} />}
        sx={{ flexShrink: 0, py: 0, minHeight: 0 }}
      >
        Reorder inbox
      </Button>
    </Tooltip>
  );
};

// The deep link a frozen buy plan's card gets (buy planner B9): the plan at its own store. Read through
// readBuyPlanRecommendation (uuid-gated), so a malformed payload renders no link; the card's words stay the server's.
const BuyPlanLink = ({ rec }: { rec: PendingRecommendation }) => {
  const plan = readBuyPlanRecommendation(rec.signal_sources);
  if (!plan.isBuyPlan || !plan.href) return null;

  return (
    <Button
      size="small"
      variant="text"
      component={RouterLink}
      to={plan.href}
      onClick={(event: MouseEvent) => event.stopPropagation()}
      endIcon={<IconArrowRight size={14} />}
      sx={{ flexShrink: 0, py: 0, minHeight: 0 }}
    >
      Open plan
    </Button>
  );
};

// One glyph per coarse type, in the 26px primary-tinted well.
const rowIcon = (rec: PendingRecommendation) => {
  const type = (rec.rec_type ?? '').toLowerCase();
  if (readBuyPlanRecommendation(rec.signal_sources).isBuyPlan) return <IconClipboardList size={15} stroke={1.75} />;
  if (readReorderRecommendation(rec.signal_sources).isReorder || type.includes('reorder') || type.includes('overstock')) {
    return <IconPackages size={15} stroke={1.75} />;
  }
  if (type.includes('staff')) return <IconUsers size={15} stroke={1.75} />;
  if (type.includes('schedul') || type.includes('hour')) return <IconClockHour4 size={15} stroke={1.75} />;
  return <IconTrendingUp size={15} stroke={1.75} />;
};

// ALL-123: the figure is the grounded expected value when one exists; a model
// estimate says so instead of posing as a computed number. The right column
// carries the dollars; the basis under it says which kind they are.
const impactColumn = (rec: PendingRecommendation): { aside: string; basis: string; grounded: boolean } | null => {
  const kind = impactKind(rec.impact_source, rec.predicted_impact_dollars);
  if (kind === 'none' || !rec.predicted_impact_dollars) return null;
  const amount = `+$${parseFloat(rec.predicted_impact_dollars).toLocaleString()}`;
  return kind === 'grounded'
    ? { aside: amount, basis: 'Estimated impact', grounded: true }
    : { aside: amount, basis: 'Model estimate', grounded: false };
};

// The swap X: "not this one, show me the next". A plain dismissal through
// POST …/dismiss/, distinct from the thumbs-down (which records a reason and
// stays dimmed for its undo) — surfacing decision 5.
const DismissNextButton = ({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) => (
  <Tooltip title="Not this one, show me the next">
    <span>
      <Button
        size="small"
        variant="text"
        color="inherit"
        disabled={disabled}
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          onClick();
        }}
        sx={{ minWidth: 28, p: 0.5, flexShrink: 0 }}
        aria-label="Dismiss and show the next recommendation"
      >
        <IconX size={14} />
      </Button>
    </span>
  </Tooltip>
);

export const RecommendationRow = ({
  rec,
  onDismiss,
  dismissing
}: {
  rec: PendingRecommendation;
  onDismiss?: (id: string) => void;
  dismissing?: boolean;
}) => {
  const feedback = useRecommendationFeedback(rec);

  // Snoozed rows leave the surface; declined ones stay dimmed so the undo is
  // still reachable (see RecommendationFeedback).
  if (feedback.hidden) return null;

  const { title, body } = splitLead(rec.recommendation_text);
  const impact = impactColumn(rec);
  const drivenBy = drivenByLine(rec.driving_signals);
  const urgency = rec.urgency_score >= 0.8 ? 'High urgency' : rec.urgency_score >= 0.5 ? 'Medium urgency' : null;
  const meta = [urgency, drivenBy, `Confidence ${Math.round(rec.confidence_score * 100)}%`].filter(Boolean).join(' · ');

  return (
    <ListRow
      icon={rowIcon(rec)}
      title={title}
      body={body}
      aside={impact?.aside}
      asideBasis={impact?.basis}
      asideTone={impact?.grounded ? 'success' : 'muted'}
      trailing={
        <>
          <ReorderInboxLink rec={rec} />
          <BuyPlanLink rec={rec} />
          <FeedbackControls feedback={feedback} compact showDismiss={!onDismiss} />
          {onDismiss && <DismissNextButton onClick={() => onDismiss(rec.id)} disabled={dismissing || feedback.isPending} />}
        </>
      }
      dimmed={feedback.dimmed}
      footer={
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {feedback.backFromSnooze && <BackFromSnoozeHint />}
            <Typography variant="caption" color="text.disabled" data-testid="driven-by">
              {meta}
            </Typography>
          </Box>
          {feedback.choosing && <ReasonChips feedback={feedback} compact />}
          {/* ALL-21: the evidence this rests on, fetched only when opened. */}
          <RecommendationRationalePanel pendingId={rec.id} />
        </>
      }
    />
  );
};

export default RecommendationRow;

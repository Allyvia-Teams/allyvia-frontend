import type { MouseEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';

// material-ui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// icons
import { IconArrowRight, IconClockHour4, IconPackages, IconRefresh, IconSparkles, IconTrendingUp, IconUsers } from '@tabler/icons-react';

// project imports
import { AgentAlert, PendingRecommendation } from 'api/agent.api';
import { AGENT_FEED_CAP_NOTE, readReorderRecommendation } from 'views/inventory/reorder';
import { AlertStrip, ListRow, Panel, PanelMessage, splitLead } from 'ui-component/frame';
import { BackFromSnoozeHint, FeedbackControls, ReasonChips, useRecommendationFeedback } from './RecommendationFeedback';
import { drivenByLine, impactKind } from './recommendationSignals';
import type { RecommendationsState } from './useRecommendations';

// ==============================|| DASHBOARD - ALERTS ||============================== //
// Alerts are deterministic facts (duplicate bills, large overdue payables) —
// design handoff 1.1 step 3 renders each as a one-line strip under the title
// row, never a card with a header. They aren't predictions and carry no
// urgency/confidence scores or dismiss/feedback mechanics.

const alertAction = (alert: AgentAlert) => {
  if (alert.type === 'overdue_payable' || alert.type === 'duplicate_bill') return { label: 'Review bill', to: '/expense/bills' };
  return undefined;
};

export const DashboardAlerts = ({ alerts }: { alerts: AgentAlert[] }) => (
  <>
    {alerts.map((alert) => (
      <AlertStrip key={alert.key} title={alert.title} body={alert.detail} action={alertAction(alert)} />
    ))}
  </>
);

// The deep link an inventory reorder recommendation gets, and nothing else does.
//
// `signal_sources.origin` is the only identity, and the reading is done by
// readReorderRecommendation — uuid-gated and total, so a malformed payload
// renders no link rather than a broken one, and every other recommendation is
// left exactly as it was.
//
// The tooltip carries AGENT_FEED_CAP_NOTE because this is the one place both
// counts become visible: the agent feed takes at most 5 restock suggestions
// inside a 14-day stockout horizon, the inbox has neither cap nor horizon, and
// somebody who clicks through to find nineteen deserves to have been told why
// before they clicked rather than to read it as a bug.
const ReorderInboxLink = ({ rec }: { rec: PendingRecommendation }) => {
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

// One glyph per coarse type, in the 26px primary-tinted well.
const rowIcon = (rec: PendingRecommendation) => {
  const type = (rec.rec_type ?? '').toLowerCase();
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

const RecommendationRow = ({ rec }: { rec: PendingRecommendation }) => {
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
          <FeedbackControls feedback={feedback} compact />
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
        </>
      }
    />
  );
};

// ==============================|| DASHBOARD - TODAY'S INSIGHTS ||============================== //
// Design handoff Part 2: a panel of list rows. The generate button lives in the
// page header; this panel only renders the list and the run's state.

const LoadingRows = () => (
  <Box sx={{ px: '14px', py: '12px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    <Skeleton variant="rounded" height={40} />
    <Skeleton variant="rounded" height={40} />
  </Box>
);

export const RecommendationCard = ({ state }: { state: RecommendationsState }) => {
  const { recommendations, isLoading, isError, listError, refetch, working, statusText, generateFailed, notSurfacedReason, generate } =
    state;

  let body: React.ReactNode;

  if (isLoading) {
    body = <LoadingRows />;
  } else if (isError) {
    // Distinct error state for the LIST query (e.g. a 4xx/5xx from
    // /agent/recommendations/pending/). A list failure must not read as "no
    // insights yet".
    body = (
      <PanelMessage tone="error">
        Couldn&apos;t load your insights right now.
        {listError instanceof Error && listError.message ? (
          <Typography component="div" variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            {listError.message}
          </Typography>
        ) : null}
        <Box sx={{ mt: 1 }}>
          <Button size="small" variant="outlined" color="primary" startIcon={<IconRefresh size={16} />} onClick={() => refetch()}>
            Retry
          </Button>
        </Box>
      </PanelMessage>
    );
  } else if (recommendations.length === 0) {
    if (working) {
      body = <PanelMessage>{statusText}</PanelMessage>;
    } else if (generateFailed) {
      body = (
        <PanelMessage tone="error">
          Something went wrong generating your recommendation.
          <Box sx={{ mt: 1 }}>
            <Button size="small" variant="outlined" color="primary" startIcon={<IconRefresh size={16} />} onClick={() => generate(false)}>
              Retry
            </Button>
          </Box>
        </PanelMessage>
      );
    } else if (notSurfacedReason) {
      body = (
        <PanelMessage>
          No recommendation met the bar today — your signals look stable.
          <Box sx={{ mt: 0.5 }}>
            <Button size="small" variant="text" color="inherit" onClick={() => generate(true)} sx={{ px: 0.5, minHeight: 0 }}>
              Run again
            </Button>
          </Box>
        </PanelMessage>
      );
    } else {
      body = <PanelMessage>Nothing surfaced yet. Generate a recommendation to see today&apos;s insights.</PanelMessage>;
    }
  } else {
    const sorted = [...recommendations].sort((a, b) => b.urgency_score - a.urgency_score);
    body = (
      <Box>
        {sorted.map((rec) => (
          <RecommendationRow key={rec.id} rec={rec} />
        ))}
      </Box>
    );
  }

  return (
    <Panel title="Today's insights" icon={<IconSparkles size={17} stroke={1.75} />} note={working ? statusText : 'Updated overnight'}>
      {body}
    </Panel>
  );
};

export default RecommendationCard;

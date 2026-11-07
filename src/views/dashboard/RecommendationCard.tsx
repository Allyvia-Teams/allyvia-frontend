import { Link as RouterLink } from 'react-router-dom';

// material-ui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

// icons
import { IconArrowRight, IconRefresh, IconSparkles, IconUsers } from '@tabler/icons-react';

// project imports
import { AgentAlert, PendingRecommendation } from 'api/agent.api';
import { AlertStrip, ListRow, Panel, PanelMessage } from 'ui-component/frame';
import RecommendationRow from 'ui-component/agent/RecommendationRow';
// A pure seam, imported by direct path rather than through any barrel — same
// shape as `./recommendationSectors` below. The label lives there because a
// pluralisation rule inside JSX is untestable in this repo.
import { DASHBOARD_HANDOFF_EMPTY_COPY, handoffPlacement, innerCircleHandoffLabel } from 'views/inner-circle/recommendationCards';
import { remainingSectorParts } from './recommendationSectors';
import type { RecommendationsState } from './useRecommendations';

// The row itself (thumbs, snooze, reason chips, rationale, reorder/buy-plan
// deep links, the swap X) lives in ui-component/agent/RecommendationRow, shared
// with the Inventory Insights Recommendations tab.

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

// ==============================|| DASHBOARD - TODAY'S INSIGHTS ||============================== //
// Design handoff Part 2: a panel of list rows. The generate button lives in the
// page header; this panel only renders the list and the run's state.

const LoadingRows = () => (
  <Box sx={{ px: '14px', py: '12px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    <Skeleton variant="rounded" height={40} />
    <Skeleton variant="rounded" height={40} />
  </Box>
);

// Design §3.4: outreach recommendations are agent rows too, so they qualify for
// this panel — but they carry dollar cases, a posture rationale and a composer
// that only This week renders. The backend holds them out of `recommendations`
// and reports the count; this is the one line that says so, above the list
// because it is a pointer to other work, not one of the items in it.
const InnerCircleOpenButton = () => (
  <Button size="small" variant="text" component={RouterLink} to="/inner-circle?tab=this-week" endIcon={<IconArrowRight size={14} />}>
    Open
  </Button>
);

// "3 more in Inventory · 1 in Scheduling", each a link to its sector. Nothing
// when the backend does not report sectors or nothing else is live.
const RemainingBySectorCaption = ({ state, shown }: { state: RecommendationsState; shown: PendingRecommendation }) => {
  const parts = remainingSectorParts(state.remainingBySector, shown.sector);
  if (parts.length === 0) return null;

  return (
    <Typography component="div" variant="caption" color="text.secondary" sx={{ px: '14px', py: '8px' }} data-testid="remaining-by-sector">
      {parts.map((part, index) => (
        <span key={part.sector}>
          {index > 0 && ' · '}
          <Link component={RouterLink} to={part.href} color="inherit" underline="hover">
            {part.text}
          </Link>
        </span>
      ))}
    </Typography>
  );
};

const InnerCircleHandoffRow = ({ count }: { count: number }) => (
  // Wrapped, and it has to be. `ListRow` draws its own hairline with
  // `borderTop` + `&:first-of-type { borderTop: 0 }` — and directly under the
  // Panel the header div is the first-of-type, so this row would draw a second
  // hairline a pixel below the header's own. Inside this Box it is first again.
  <Box>
    <ListRow
      icon={<IconUsers size={15} stroke={1.75} />}
      title={innerCircleHandoffLabel(count)}
      body="Discounts, events and style votes for your members — with the dollar cases behind each one."
      trailing={<InnerCircleOpenButton />}
    />
  </Box>
);

export const RecommendationCard = ({ state }: { state: RecommendationsState }) => {
  const {
    recommendations,
    innerCirclePending,
    isLoading,
    isError,
    listError,
    refetch,
    working,
    statusText,
    generateFailed,
    notSurfacedReason,
    generate,
    alreadyGenerated,
    dismiss,
    dismissing,
    dismissFailed,
    dismissedSome
  } = state;

  // Where the hand-off goes: as a row above a real list, INSTEAD of an empty
  // copy that would otherwise contradict it, or nowhere. The panel used to
  // render the row unconditionally, so a shop with outreach cards and no
  // staffing or inventory recommendation — the ordinary case for this
  // initiative's merchant — read "3 Inner Circle suggestions" directly above
  // "No recommendation met the bar today".
  //
  // "That was the last one" is a message of its own too, so the hand-off rides
  // above it as the row rather than replacing it.
  const placement = handoffPlacement(innerCirclePending, recommendations.length === 0, working || generateFailed || dismissedSome);

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
    } else if (dismissedSome) {
      // The merchant dismissed the top row and nothing else is live.
      body = (
        <PanelMessage>
          That was the last one for today.
          <Box sx={{ mt: 0.5 }}>
            <Button size="small" variant="text" color="inherit" onClick={() => generate(true)} sx={{ px: 0.5, minHeight: 0 }}>
              Run again
            </Button>
          </Box>
        </PanelMessage>
      );
    } else if (placement === 'empty') {
      body = (
        <PanelMessage>
          {DASHBOARD_HANDOFF_EMPTY_COPY}
          <Box sx={{ mt: 0.5 }}>
            <InnerCircleOpenButton />
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
    // ONE row: the backend ranked across every sector and limited to 1
    // (surface=dashboard). Never re-sorted here — an older backend that
    // ignores `surface` still returns its rows best-first (or newest-first),
    // and the first is what we show. The rest live in their sector tabs.
    const top = recommendations[0];
    body = (
      <Box>
        {alreadyGenerated && <PanelMessage>Today&apos;s recommendation is already here.</PanelMessage>}
        <RecommendationRow key={top.id} rec={top} onDismiss={dismiss} dismissing={dismissing} />
        {dismissFailed && (
          <Typography component="div" variant="caption" color="error" sx={{ px: '14px', pb: '4px' }}>
            Couldn&apos;t dismiss that — try again.
          </Typography>
        )}
        <RemainingBySectorCaption state={state} shown={top} />
      </Box>
    );
  }

  return (
    <Panel
      title="Today's insights"
      icon={<IconSparkles size={17} stroke={1.75} />}
      note={working ? statusText : dismissing ? 'Finding the next one…' : 'Updated overnight'}
    >
      {placement === 'row' && <InnerCircleHandoffRow count={innerCirclePending} />}
      {body}
    </Panel>
  );
};

export default RecommendationCard;

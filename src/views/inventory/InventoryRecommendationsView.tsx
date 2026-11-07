// views/inventory/InventoryRecommendationsView.tsx
//
// Inventory Insights > Recommendations: every live inventory-sector
// recommendation (`?surface=inventory`: the nightly reorder feeder, frozen buy
// plans, and agent rows typed reorder / overstock / transfer / supplier), in
// the order the backend ranked them, on the same row the dashboard uses.
//
// The dashboard shows ONE recommendation across every sector; the row it is
// showing appears here too, so nothing "goes missing" from one surface into
// the other. The X removes a row in place and the dashboard refreshes with it.
//
// U7: these are the in-season nudges; Plan is for ordering a whole season.
// One line under the header points there, for the roles the menu shows Plan
// to (flowLinks.canOpenPlan), so a member never meets Plan's 403.
//
// The `ongoing` digest (items shown on 3+ of the last 5 days without action,
// which the reorder feeder deliberately keeps out of the ranked rows) renders
// at the foot of this tab and nowhere else.

import { Link as RouterLink } from 'react-router-dom';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { IconArrowRight, IconBulb, IconRefresh } from '@tabler/icons-react';

import type { AgentOngoingItem } from 'api/agent.api';
import RecommendationRow from 'ui-component/agent/RecommendationRow';
import { useSectorRecommendations } from 'ui-component/agent/useSectorRecommendations';
import { useSelector } from 'store';
import { Panel, PanelMessage } from 'ui-component/frame';

import { INSIGHTS_TO_PLAN, canOpenPlan } from './flowLinks';
import { daysOutstandingLabel } from './insights';
import { REORDER_INBOX_PATH } from './reorder';

const LoadingRows = () => (
  <Box sx={{ px: '14px', py: '12px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    <Skeleton variant="rounded" height={40} />
    <Skeleton variant="rounded" height={40} />
    <Skeleton variant="rounded" height={40} />
  </Box>
);

const ReorderInboxButton = () => (
  <Button size="small" variant="text" component={RouterLink} to={REORDER_INBOX_PATH} endIcon={<IconArrowRight size={14} />}>
    Open the reorder inbox
  </Button>
);

// Subdued on purpose: these are standing items the merchant has already seen
// several times, not new asks competing with the ranked rows above.
const OngoingDigest = ({ items }: { items: AgentOngoingItem[] }) => (
  <Box sx={{ px: '14px', py: '12px', borderTop: 1, borderColor: 'divider' }} data-testid="ongoing-digest">
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.75 }}>
      Ongoing
    </Typography>
    <Box component="ul" sx={{ m: 0, pl: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {items.map((item, index) => {
        const age = daysOutstandingLabel(item.days_outstanding);
        return (
          <Typography
            component="li"
            variant="body2"
            color="text.secondary"
            key={`${item.type}-${item.first_surfaced_at}-${index}`}
            sx={{ fontSize: '0.8125rem' }}
          >
            {item.text}
            {age && (
              <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 1 }}>
                {age}
              </Typography>
            )}
          </Typography>
        );
      })}
    </Box>
  </Box>
);

// A plain sentence with one link in it, under the Panel header (not a
// widget: U8 keeps tiles, strips and rails on the Dashboard).
const PlanLine = () => (
  <Typography
    component="div"
    variant="body2"
    color="text.secondary"
    sx={{ px: '14px', py: '8px', borderBottom: 1, borderColor: 'divider' }}
  >
    {INSIGHTS_TO_PLAN.lead}{' '}
    <Link component={RouterLink} to={INSIGHTS_TO_PLAN.href} underline="hover" sx={{ fontWeight: 500 }}>
      {INSIGHTS_TO_PLAN.label}
    </Link>
  </Typography>
);

export default function InventoryRecommendationsView() {
  const roleType = useSelector((s) => s.auth.currentRole?.role_type as string | undefined);
  const { recommendations, ongoing, isLoading, isError, error, refetch, dismiss, dismissing, dismissFailed } =
    useSectorRecommendations('inventory');

  let body: React.ReactNode;

  if (isLoading) {
    body = <LoadingRows />;
  } else if (isError) {
    // The dashboard's pattern: a failed list must not read as "nothing to do".
    body = (
      <PanelMessage tone="error">
        Couldn&apos;t load your recommendations right now.
        {error instanceof Error && error.message ? (
          <Typography component="div" variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            {error.message}
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
    body = (
      <PanelMessage>
        No inventory recommendations right now. The reorder inbox lists every suggestion the engine made.
        <Box sx={{ mt: 0.5 }}>
          <ReorderInboxButton />
        </Box>
      </PanelMessage>
    );
  } else {
    // As returned: the backend ranks (agent/ranking.py). Wrapped in a Box so
    // ListRow's first-of-type hairline rule sees the first row, not the
    // Panel header (see InnerCircleHandoffRow in the dashboard card).
    body = (
      <Box>
        {recommendations.map((rec) => (
          <RecommendationRow key={rec.id} rec={rec} onDismiss={dismiss} dismissing={dismissing} />
        ))}
        {dismissFailed && (
          <Typography component="div" variant="caption" color="error" sx={{ px: '14px', py: '4px' }}>
            Couldn&apos;t dismiss that — try again.
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Panel title="Recommendations" icon={<IconBulb size={17} stroke={1.75} />} note="Updated overnight">
      {canOpenPlan(roleType) && <PlanLine />}
      {body}
      {!isLoading && !isError && ongoing.length > 0 && <OngoingDigest items={ongoing} />}
    </Panel>
  );
}

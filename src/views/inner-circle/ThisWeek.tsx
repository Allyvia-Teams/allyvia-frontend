import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import { IconChevronDown, IconRefresh } from '@tabler/icons-react';

import {
  fetchInnerCircleSummary,
  fetchOutreachRecommendations,
  fetchPerkRecommendations,
  generateOutreachRecommendations,
  OUTREACH_RECOMMENDATIONS_QUERY_KEY,
  PERK_RECOMMENDATIONS_QUERY_KEY
} from 'api/innerCircle.api';
import { useSelector } from 'store';
import { KpiRow, KpiTile, Panel, PanelMessage } from 'ui-component/frame';
import DemandLocalityPanel from 'ui-component/inner-circle/DemandLocalityPanel';
import { PENDING_QUERY_KEY } from 'views/dashboard/RecommendationFeedback';
import OutreachRecommendationCard from './OutreachRecommendationCard';
import PostureLine from './PostureLine';
import {
  adaptOutreachCards,
  adaptPerkRecommendation,
  CARD_PAGE_SIZE,
  EMPTY_COPY,
  refreshErrorMessage,
  showMoreLabel,
  sortCards,
  tileFigure,
  tileMoney,
  type ThisWeekCard
} from './recommendationCards';

// ==============================|| INNER CIRCLE - THIS WEEK ||============================== //
// Design §3. One screen answering one question: what should I run this week,
// why, and what might it earn. The posture line states the reading everything
// below is derived from; the tiles are the standing facts; the cards are the
// work. The locality strip sits underneath, collapsed, because it explains the
// members rather than proposing anything.
//
// The stack is FULL WIDTH (design §5, Session 3's ruling): there is no
// companion rail here, and BodyGrid's main column would crush a card whose
// case table needs three columns of its own.

export default function ThisWeek() {
  const companyId = useSelector((state) => state.auth.currentRole?.company_id);
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const [expanded, setExpanded] = useState(false);
  // In state only, per the session ruling: leaving this destination forgets it.
  // A remembered-across-sessions preference would need somewhere to live, and
  // a collapsed panel is not worth a settings key.
  const [localityOpen, setLocalityOpen] = useState(false);

  const summaryQuery = useQuery({
    queryKey: ['inner-circle-summary', companyId],
    queryFn: () => fetchInnerCircleSummary(companyId!),
    enabled: !!companyId
  });

  const cardsQuery = useQuery({
    queryKey: OUTREACH_RECOMMENDATIONS_QUERY_KEY,
    queryFn: fetchOutreachRecommendations
  });

  // DECORATION, like the Outreach table's suggested marks. This recommendation
  // lives at its own endpoint, which 404s for a company that has never had
  // one — so a failure here means no perk-settings card and nothing else. It
  // is deliberately NOT part of the cards panel's loading or error state: one
  // missing card must not make five real ones read as unavailable.
  const perkQuery = useQuery({
    queryKey: PERK_RECOMMENDATIONS_QUERY_KEY,
    queryFn: fetchPerkRecommendations,
    retry: false
  });

  const refresh = useMutation({
    mutationFn: generateOutreachRecommendations,
    onSuccess: () => {
      // The shared prefix: one invalidation moves this list, the Outreach
      // table's marks and the Dashboard's count.
      queryClient.invalidateQueries({ queryKey: PENDING_QUERY_KEY });
      setExpanded(false);
    },
    // A 429 is the throttle doing its job, not a fault — `refreshErrorMessage`
    // is what keeps those two apart.
    onError: (error) => enqueueSnackbar(refreshErrorMessage(error), { variant: 'warning' })
  });

  const summary = summaryQuery.data;
  const figuresFailed = summaryQuery.isError;
  const health = cardsQuery.data?.health;

  const cards = useMemo<ThisWeekCard[]>(() => {
    const outreach = adaptOutreachCards(cardsQuery.data?.results);
    const perk = adaptPerkRecommendation(perkQuery.data);
    return sortCards<ThisWeekCard>([...outreach, ...(perk ? [perk] : [])]);
  }, [cardsQuery.data, perkQuery.data]);

  const shown = expanded ? cards.length : Math.min(CARD_PAGE_SIZE, cards.length);
  const moreLabel = showMoreLabel(cards.length, shown);

  const refreshButton = (
    <Button
      size="small"
      variant="outlined"
      startIcon={<IconRefresh size={15} />}
      disabled={refresh.isPending}
      onClick={() => refresh.mutate()}
    >
      {refresh.isPending ? 'Refreshing…' : 'Refresh suggestions'}
    </Button>
  );

  let cardsBody: React.ReactNode;
  if (cardsQuery.isPending) {
    cardsBody = <PanelMessage>Loading…</PanelMessage>;
  } else if (cardsQuery.isError) {
    // ALL-103. A failed fetch must never read as "nothing to suggest": the
    // owner would take a network blip as a verdict on their week and act on
    // it. The empty copy is only ever shown for a list that actually arrived
    // empty.
    cardsBody = (
      <PanelMessage tone="error">
        Couldn&apos;t load this week&apos;s suggestions.{' '}
        <Button size="small" onClick={() => cardsQuery.refetch()} sx={{ textTransform: 'none' }}>
          Retry
        </Button>
      </PanelMessage>
    );
  } else if (cards.length === 0) {
    cardsBody = <PanelMessage>{EMPTY_COPY}</PanelMessage>;
  } else {
    cardsBody = (
      <Box sx={{ px: '14px', py: '12px' }}>
        <Stack spacing={2}>
          {cards.slice(0, shown).map((card) => (
            <OutreachRecommendationCard key={card.id} card={card} mode={health?.mode ?? null} />
          ))}
        </Stack>
        {moreLabel && (
          <Box sx={{ mt: 2 }}>
            <Button size="small" variant="text" onClick={() => setExpanded(true)}>
              {moreLabel}
            </Button>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <>
      {/* The posture line renders only once the health has arrived. A chip
          reading "Not enough data yet" while the request is still in flight
          would state a conclusion the page has not reached. */}
      {health && <PostureLine health={health} />}

      {/* Every tile goes through `tileFigure`/`tileMoney`, and that is the
          ALL-103 rule rather than tidiness: a failed summary fetch rendering
          "0 Vault members" beside a healthy posture line is a lie the owner
          has no way to detect. The basis line under the last tile is where
          "absent" and "failed" are told apart. */}
      <KpiRow>
        <KpiTile label="Vault members" value={tileFigure(summary?.vault_count, figuresFailed)} loading={summaryQuery.isPending} />
        <KpiTile
          label="Lifetime value"
          value={tileMoney(summary?.total_crm_ltv, figuresFailed)}
          basis="across every Inner Circle customer"
          loading={summaryQuery.isPending}
        />
        <KpiTile label="Active this month" value={tileFigure(summary?.active_this_month, figuresFailed)} loading={summaryQuery.isPending} />
        <KpiTile
          label="Codes issued this month"
          value={tileFigure(summary?.codes_issued_month, figuresFailed)}
          basis={figuresFailed || typeof summary?.codes_issued_month === 'number' ? undefined : 'not reported by this backend'}
          loading={summaryQuery.isPending}
        />
      </KpiRow>

      {figuresFailed && (
        <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Button size="small" onClick={() => summaryQuery.refetch()}>
            Retry the figures above
          </Button>
        </Stack>
      )}

      <Stack spacing={2}>
        <Panel title="This week" action={refreshButton}>
          {cardsBody}
        </Panel>

        <Panel
          title="Where your customers come from"
          action={
            <Button
              size="small"
              variant="text"
              color="inherit"
              aria-expanded={localityOpen}
              onClick={() => setLocalityOpen((open) => !open)}
              endIcon={
                <Box
                  component="span"
                  sx={{ display: 'flex', transform: localityOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
                >
                  <IconChevronDown size={15} />
                </Box>
              }
            >
              {localityOpen ? 'Hide' : 'Show'}
            </Button>
          }
        >
          <Collapse in={localityOpen} unmountOnExit>
            <Box sx={{ px: '14px' }}>
              {companyId ? (
                <DemandLocalityPanel companyId={companyId} headlines={summary?.demand_locality} />
              ) : (
                <PanelMessage>Pick a company to see where its customers come from.</PanelMessage>
              )}
            </Box>
          </Collapse>
        </Panel>
      </Stack>
    </>
  );
}

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconChevronDown, IconRefresh } from '@tabler/icons-react';

import {
  fetchInnerCircleSummary,
  fetchOutreachRecommendations,
  fetchPerkRecommendations,
  fetchPromotion,
  generateOutreachRecommendations,
  OUTREACH_RECOMMENDATIONS_QUERY_KEY,
  perkRecommendationsQueryKey,
  type OutreachRecommendation
} from 'api/innerCircle.api';
import { useSelector } from 'store';
import { KpiRow, KpiTile, Panel, PanelMessage } from 'ui-component/frame';
import DemandLocalityPanel from 'ui-component/inner-circle/DemandLocalityPanel';
import { OutreachComposer } from 'ui-component/inner-circle';
import { PENDING_QUERY_KEY } from 'views/dashboard/RecommendationFeedback';
import OutreachRecommendationCard from './OutreachRecommendationCard';
import PostureLine from './PostureLine';
import {
  adaptOutreachCards,
  adaptPerkRecommendation,
  CARD_PAGE_SIZE,
  composerSnapshot,
  droppedCardsMessage,
  EMPTY_COPY,
  isPerkSettingsCard,
  needsRemovedRuleNotice,
  refreshErrorMessage,
  refreshOutcomeMessage,
  RULE_REMOVED_NOTICE,
  showMoreLabel,
  sortCards,
  suggestedRuleId,
  tileBasis,
  tileFigure,
  tileMoney,
  type SetupState,
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
  // HOISTED OUT OF THE CARD. The composer used to be a sibling of the card
  // that opened it, inside `cards.slice(0, shown)` — so a window-focus
  // refetch that re-ordered the list, or a snooze on that same card, could
  // unmount an open dialog mid-edit. Here it is independent of which cards
  // render.
  const [setup, setSetup] = useState<SetupState>({ step: 'closed' });
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
    queryKey: perkRecommendationsQueryKey(companyId),
    queryFn: fetchPerkRecommendations,
    retry: false
  });

  const refresh = useMutation({
    mutationFn: generateOutreachRecommendations,
    onSuccess: (result) => {
      // The shared prefix: one invalidation moves this list, the Outreach
      // table's marks and the Dashboard's count.
      queryClient.invalidateQueries({ queryKey: PENDING_QUERY_KEY });
      setExpanded(false);
      // SAY WHICH OF THE TWO HAPPENED. The ordinary answer is `written: 0` —
      // everything worth suggesting is already on screen — and this button
      // used to respond to it with nothing at all: a label flicker and an
      // unchanged list, under an empty state whose only call to action it is.
      enqueueSnackbar(refreshOutcomeMessage(result), { variant: (result?.written ?? 0) > 0 ? 'success' : 'info' });
    },
    // A 429 is the throttle doing its job, not a fault — `refreshErrorMessage`
    // is what keeps those two apart.
    onError: (error) => enqueueSnackbar(refreshErrorMessage(error), { variant: 'warning' })
  });

  const summary = summaryQuery.data;
  // A DISABLED query reports `isPending: true` for ever in TanStack v5, so
  // without the `companyId` guard the four tiles spin permanently while the
  // locality panel sixty lines below correctly explains itself. And with no
  // company the figures are not merely late, they are unavailable — so they
  // read as an em dash rather than as a spinner or a zero.
  const figuresLoading = summaryQuery.isPending && !!companyId;
  const figuresFailed = summaryQuery.isError;
  const figuresUnavailable = figuresFailed || !companyId;
  const health = cardsQuery.data?.health;

  const { cards, dropped } = useMemo(() => {
    const received = cardsQuery.data?.results;
    const outreach = adaptOutreachCards(received);
    const perk = adaptPerkRecommendation(perkQuery.data);
    return {
      cards: sortCards<ThisWeekCard>([...outreach, ...(perk ? [perk] : [])]),
      // ALL-103 from the inside: if the client dropped cards the fetch DID
      // return, the owner must not read "Nothing worth suggesting this week"
      // about a week that produced suggestions.
      dropped: droppedCardsMessage(Array.isArray(received) ? received.length : 0, outreach.length)
    };
  }, [cardsQuery.data, perkQuery.data]);

  /**
   * Resolve the rule a discount card already has, then open the composer.
   *
   * The snapshot is taken HERE, at the click, before anything async: `card` is
   * a row in a React Query cache that a refetch replaces wholesale, and a live
   * `card.prefill` would re-memoise the composer's `initialValues` and let the
   * dialog's effect setForm over whatever the owner was typing.
   */
  const beginSetup = (card: OutreachRecommendation) => {
    const snapshot = composerSnapshot(card);
    const ruleId = suggestedRuleId(card);

    if (!ruleId) {
      // A discount card with no rule id is a CURATED card whose rule was
      // deleted — `outreach_cards.py` sends `prefill: {}` for exactly that —
      // so it takes the same sentence as the 404 below rather than opening a
      // blank create form on a live-looking card, silently.
      const notice = needsRemovedRuleNotice(card) ? RULE_REMOVED_NOTICE : null;
      setSetup({ step: 'open', existing: null, notice, snapshot });
      return;
    }

    setSetup({ step: 'resolving', cardId: card.id });
    fetchPromotion(ruleId)
      .then((rule) => setSetup({ step: 'open', existing: rule, notice: null, snapshot }))
      .catch((error: unknown) => {
        // 404 ONLY. The rule was deleted between the card being generated and
        // this press, so creating a new one is the right recovery — but said
        // out loud, or the owner believes they edited the suggestion and the
        // measurement is orphaned exactly as if this branch did not exist.
        if ((error as { response?: { status?: number } } | null)?.response?.status === 404) {
          setSetup({ step: 'open', existing: null, notice: RULE_REMOVED_NOTICE, snapshot });
          return;
        }
        // Anything else — offline, a 500, a 403 — is NOT a reason to open a
        // create dialog: that turns a transient failure into a permanent
        // duplicate rule.
        setSetup({ step: 'closed' });
        enqueueSnackbar("Couldn't open that suggestion — try again.", { variant: 'error' });
      });
  };

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
    // `dropped` is non-null only when something arrived and was filtered out,
    // so the verbatim empty copy still means exactly "the backend sent none".
    cardsBody = <PanelMessage tone={dropped ? 'warning' : 'default'}>{dropped ?? EMPTY_COPY}</PanelMessage>;
  } else {
    cardsBody = (
      <Box sx={{ px: '14px', py: '12px' }}>
        <Stack spacing={2}>
          {cards.slice(0, shown).map((card) => (
            <OutreachRecommendationCard
              key={card.id}
              card={card}
              resolving={setup.step === 'resolving' && setup.cardId === card.id}
              onSetup={() => !isPerkSettingsCard(card) && beginSetup(card)}
            />
          ))}
        </Stack>
        {moreLabel && (
          <Box sx={{ mt: 2 }}>
            <Button size="small" variant="text" onClick={() => setExpanded(true)}>
              {moreLabel}
            </Button>
          </Box>
        )}
        {/* Also said when SOME cards rendered: a partial drop is still a
            suggestion the owner cannot see, and the list above gives no hint
            that anything is missing from it. */}
        {dropped && <Typography sx={{ mt: 1, fontSize: '0.8125rem', color: 'text.disabled' }}>{dropped}</Typography>}
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
        <KpiTile label="Vault members" value={tileFigure(summary?.vault_count, figuresUnavailable)} loading={figuresLoading} />
        <KpiTile
          label="Lifetime value"
          value={tileMoney(summary?.total_crm_ltv, figuresUnavailable)}
          basis="across every Inner Circle customer"
          loading={figuresLoading}
        />
        <KpiTile label="Active this month" value={tileFigure(summary?.active_this_month, figuresUnavailable)} loading={figuresLoading} />
        {/* The ONLY optional figure of the four, so the only one whose em dash
            can mean "this backend does not send it" — `tileBasis` says so, and
            says nothing when the cause is a failure the Retry below names. */}
        <KpiTile
          label="Codes issued this month"
          value={tileFigure(summary?.codes_issued_month, figuresUnavailable)}
          basis={tileBasis(summary?.codes_issued_month, figuresUnavailable)}
          loading={figuresLoading}
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

      {setup.step === 'open' && (
        // ONE composer for the whole destination. It owns the accept: it calls
        // `acceptOutreachRecommendation` only after the save has succeeded,
        // then invalidates the shared prefix — so the card leaves the list on
        // the next fetch rather than being removed optimistically.
        //
        // `existing` is the load-bearing prop. With it the dialog EDITS and
        // ACTIVATES the rule the recommender already made (see
        // `shouldActivateOnSave`), and the accept then records the id the
        // ALL-152 ledger is already watching.
        <OutreachComposer
          open
          kind={setup.snapshot.kind}
          existing={setup.existing}
          prefill={setup.snapshot.prefill}
          recommendationId={setup.snapshot.recommendationId}
          notice={setup.notice}
          onClose={() => setSetup({ step: 'closed' })}
        />
      )}
    </>
  );
}

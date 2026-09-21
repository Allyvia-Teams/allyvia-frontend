import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { DEFAULT_SNOOZE_DAYS, SNOOZE_DAY_OPTIONS } from 'api/agentFeedback';
import {
  dismissPerkRecommendation,
  fetchPromotion,
  PERK_RECOMMENDATIONS_QUERY_KEY,
  type OutreachRecommendation,
  type PromotionRule
} from 'api/innerCircle.api';
import { Panel } from 'ui-component/frame';
import { OutreachComposer } from 'ui-component/inner-circle';
import { OUTREACH_CHANNEL_SENTENCE } from 'ui-component/inner-circle/outreachChannel';
import { FeedbackControls, ReasonChips, useRecommendationFeedback } from 'views/dashboard/RecommendationFeedback';
import {
  becauseLine,
  cardKindLabel,
  caseRows,
  confidenceLabel,
  costRow,
  healthRow,
  intentChipLabel,
  isPerkSettingsCard,
  RULE_REMOVED_NOTICE,
  suggestedRuleId,
  whyNowLines,
  windowLabel,
  type PostureHealth,
  type PerkSettingsCard,
  type ThisWeekCard
} from './recommendationCards';

// ==============================|| INNER CIRCLE - RECOMMENDATION CARD ||============================== //
// Design §3.2, one card: what to run, why it is being suggested now, what it
// might earn in three cases with the assumption behind each, what it costs,
// where it goes, and three things the owner can do about it.
//
// Composition only. Every string, every hidden row and every pluralisation
// comes from `recommendationCards.ts`, which is tested — this file decides
// layout and nothing else.

// --------------------------- shared presentation --------------------------

const CardShell = ({
  card,
  dimmed,
  children,
  actions,
  footer
}: {
  card: ThisWeekCard;
  dimmed?: boolean;
  children: React.ReactNode;
  actions: React.ReactNode;
  footer?: React.ReactNode;
}) => {
  // A settings nudge PLACES NOTHING in a tile and sends no notification, so
  // the channel sentence is true of an outreach card and false of the
  // perk-settings one — the same class of false delivery promise the
  // `audience_size` rule exists to forbid. Likewise the intent chip: the
  // adapter hardcodes `growth`, so under Save mode it would sit on the screen
  // contradicting the posture line six inches above it. That card gets no
  // chip at all rather than a wrong one.
  const isPerk = isPerkSettingsCard(card);

  return (
    <Box sx={{ opacity: dimmed ? 0.55 : 1, transition: 'opacity .2s' }}>
      <Panel
        // Every node here is a SPAN. `Panel` renders `title` inside a
        // `Typography component="h2"`, and a `div` (a Stack, a default Chip)
        // inside a heading is an invalid content model that React's nesting
        // validator does not warn about — so no gate here can see it.
        title={
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Box component="span">{cardKindLabel(card.kind)}</Box>
            {!isPerk && <Chip component="span" size="small" variant="outlined" label={intentChipLabel(card.intent)} />}
          </Box>
        }
        note={confidenceLabel(card.confidence)}
      >
        <Box sx={{ px: '14px', py: '12px' }}>
          {children}

          {/* Fixed copy, one export. There is no channel to choose, so this is
              a statement of where the thing goes — not an option. Outreach
              cards only: see the note above. */}
          {!isPerk && (
            <Typography sx={{ mt: 2, fontSize: '0.8125rem', color: 'text.disabled', lineHeight: 1.45 }}>
              {OUTREACH_CHANNEL_SENTENCE}
            </Typography>
          )}

          <Stack direction="row" spacing={1} alignItems="center" useFlexGap sx={{ flexWrap: 'wrap', mt: 2 }}>
            {actions}
          </Stack>

          {footer}
        </Box>
      </Panel>
    </Box>
  );
};

const CardTitle = ({ title, body }: { title: string; body?: string | null }) => (
  <>
    <Typography component="h3" sx={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.35, color: 'text.dark', textWrap: 'pretty' }}>
      {title}
    </Typography>
    {body ? (
      <Typography sx={{ mt: '4px', fontSize: '0.875rem', lineHeight: 1.5, color: 'text.primary', textWrap: 'pretty' }}>{body}</Typography>
    ) : null}
  </>
);

/** "Why now": the backend's own reasons, plus the group the card is about. */
const WhyNow = ({ reasons, audience }: { reasons: string[]; audience: number | null }) => {
  // One tested rule in the seam, including the "heading only when there is
  // something under it" part: an empty `ul` under a label is invisible here.
  const lines = whyNowLines(reasons, audience);
  if (lines.length === 0) return null;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'grey.600' }}>
        Why now
      </Typography>
      <Box component="ul" sx={{ m: 0, mt: '4px', pl: 2.5 }}>
        {lines.map((line, index) => (
          <Typography
            component="li"
            // Index AND text: the list is static per render, and a bare text
            // key collides the day the backend repeats a reason string.
            key={`${index}-${line}`}
            sx={{ fontSize: '0.875rem', lineHeight: 1.5, color: 'text.primary', textWrap: 'pretty', mt: '2px' }}
          >
            {line}
          </Typography>
        ))}
      </Box>
    </Box>
  );
};

/**
 * "What to expect": the three cases, then cost, then health.
 *
 * A three-column grid rather than `ListRow`s — these are five short lines of
 * one table, and `ListRow`'s 12px padding plus per-row hairline would make a
 * compact figure table into half a screen. Row labels are a fixed column so
 * the amounts line up down the page.
 */
const CaseTable = ({ card }: { card: OutreachRecommendation }) => {
  // Hoisted, so neither helper is called twice per render and neither needs a
  // non-null assertion that would rot the day its own guard changes.
  const cost = costRow(card);
  const health = healthRow(card);
  const rows = [...caseRows(card), ...(cost ? [cost] : []), ...(health ? [health] : [])];
  if (rows.length === 0) return null;
  const window = windowLabel(card.window_days);

  return (
    <Box sx={{ mt: 2 }}>
      <Stack direction="row" spacing={1} alignItems="baseline" useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'grey.600' }}>
          What to expect
        </Typography>
        {window ? <Typography sx={{ fontSize: '0.8125rem', color: 'text.disabled' }}>{window}</Typography> : null}
      </Stack>
      <Box
        sx={{ mt: '6px', display: 'grid', gridTemplateColumns: 'minmax(64px, auto) minmax(72px, auto) 1fr', columnGap: 1.5, rowGap: '4px' }}
      >
        {rows.map((row) => (
          <Box key={row.label} sx={{ display: 'contents' }}>
            <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{row.label}</Typography>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: 'text.dark', whiteSpace: 'nowrap' }}>{row.amount}</Typography>
            {/* The backend's sentence, verbatim: it is what makes the figure
                beside it a claim the owner can check rather than a number. */}
            <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', textWrap: 'pretty' }}>{row.assumption}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ------------------------------ outreach card ------------------------------

const SnoozeMenu = ({ id, onPick, disabled }: { id: string; onPick: (days: number) => void; disabled?: boolean }) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = anchor !== null;
  return (
    <>
      {/* The three attributes `Outreach.tsx`'s own "New outreach" button sets:
          without them the control is a button that silently opens a menu, and
          a screen reader announces neither that fact nor its state. */}
      <Button
        size="small"
        variant="text"
        color="inherit"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        Not now
      </Button>
      <Menu id={id} anchorEl={anchor} open={open} onClose={() => setAnchor(null)}>
        {SNOOZE_DAY_OPTIONS.map((days) => (
          <MenuItem
            key={days}
            selected={days === DEFAULT_SNOOZE_DAYS}
            onClick={() => {
              setAnchor(null);
              onPick(days);
            }}
          >
            {days} days
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

/**
 * What "Set it up" is doing right now.
 *
 * `closed` → `resolving` (fetching the pre-created rule) → `open`. The third
 * state carries the rule, which is what the composer needs: a discount card's
 * recommender has ALREADY persisted an inactive `PromotionRule` and bound the
 * recommendation's measurement to its codes, so opening the composer without
 * it takes the create branch and mints a second rule — see `suggestedRuleId`.
 */
type SetupState = { step: 'closed' } | { step: 'resolving' } | { step: 'open'; existing: PromotionRule | null; notice: string | null };

const OutreachCard = ({ card, mode }: { card: OutreachRecommendation; mode: PostureHealth['mode'] }) => {
  const feedback = useRecommendationFeedback(card);
  const { enqueueSnackbar } = useSnackbar();
  const [setup, setSetup] = useState<SetupState>({ step: 'closed' });

  const ruleId = suggestedRuleId(card);

  const openComposer = () => {
    // Nothing to resolve: an event, a vote, or a discount card whose
    // recommender pre-created nothing. Straight to the create branch, which is
    // correct for all three.
    if (!ruleId) {
      setSetup({ step: 'open', existing: null, notice: null });
      return;
    }
    setSetup({ step: 'resolving' });
    fetchPromotion(ruleId)
      .then((rule) => setSetup({ step: 'open', existing: rule, notice: null }))
      .catch((error: unknown) => {
        // 404 ONLY. The rule was deleted between the card being generated and
        // this press, so creating a new one is the right recovery — but said
        // out loud, or the owner believes they edited the suggestion and the
        // measurement is orphaned exactly as if this branch did not exist.
        if ((error as { response?: { status?: number } } | null)?.response?.status === 404) {
          setSetup({ step: 'open', existing: null, notice: RULE_REMOVED_NOTICE });
          return;
        }
        // Anything else — offline, a 500, a 403 — is NOT a reason to open a
        // create dialog. Doing so would turn a transient failure into a
        // permanent duplicate rule.
        setSetup({ step: 'closed' });
        enqueueSnackbar("Couldn't open that suggestion — try again.", { variant: 'error' });
      });
  };

  // A snoozed card leaves the surface; a declined one stays, dimmed, so the
  // undo inside FeedbackControls is still reachable (RecommendationFeedback).
  if (feedback.hidden) return null;

  const because = becauseLine(mode, card.posture_reason);
  const resolving = setup.step === 'resolving';

  return (
    <>
      <CardShell
        card={card}
        dimmed={feedback.dimmed}
        actions={
          feedback.verdict === 'declined' ? (
            // The one branch FeedbackControls renders exactly right on its
            // own: "Thanks — we'll show fewer like this" plus Undo. Reused
            // rather than restated, so the undo cannot drift from the
            // Dashboard's.
            <FeedbackControls feedback={feedback} />
          ) : (
            <>
              <Button
                variant="contained"
                size="small"
                onClick={openComposer}
                disabled={feedback.isPending || resolving}
                startIcon={resolving ? <CircularProgress size={13} color="inherit" /> : undefined}
              >
                {resolving ? 'Opening…' : 'Set it up'}
              </Button>
              <SnoozeMenu id={`snooze-${card.id}`} onPick={feedback.snooze} disabled={feedback.isPending} />
              <Button size="small" variant="text" color="inherit" disabled={feedback.isPending} onClick={feedback.openReasons}>
                Don&apos;t suggest this
              </Button>
            </>
          )
        }
        footer={feedback.choosing ? <ReasonChips feedback={feedback} /> : null}
      >
        <CardTitle title={card.title} />
        {because ? (
          <Typography sx={{ mt: 1.5, fontSize: '0.875rem', lineHeight: 1.5, color: 'text.secondary', textWrap: 'pretty' }}>
            {because}
          </Typography>
        ) : null}
        <WhyNow reasons={card.reasons} audience={card.audience_size} />
        <CaseTable card={card} />
      </CardShell>

      {setup.step === 'open' && (
        // The composer owns the accept: it calls `acceptOutreachRecommendation`
        // only after the save has succeeded, then invalidates the shared
        // prefix — so this card leaves the list on the next fetch rather than
        // being removed optimistically. A removed card that failed to save
        // would be a suggestion the owner can no longer act on.
        //
        // `existing` is the load-bearing prop. With it the dialog EDITS and
        // activates the rule the recommender already made, and the accept then
        // records the id the ALL-152 ledger is already watching. `existing`
        // also wins over `prefill` in the dialog's own form state, which is
        // right and costs nothing: the stored values ARE the prefill.
        <OutreachComposer
          open
          kind={card.kind}
          existing={setup.existing}
          prefill={card.prefill}
          recommendationId={card.id}
          notice={setup.notice}
          onClose={() => setSetup({ step: 'closed' })}
        />
      )}
    </>
  );
};

// --------------------------- perk-settings card ----------------------------

const PerkCard = ({ card }: { card: PerkSettingsCard }) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const dismiss = useMutation({
    mutationFn: () => dismissPerkRecommendation(card.actions.perkRecommendationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PERK_RECOMMENDATIONS_QUERY_KEY }),
    onError: () => enqueueSnackbar("Couldn't dismiss that suggestion — try again.", { variant: 'error' })
  });

  return (
    <CardShell
      card={card}
      actions={
        <>
          <Button variant="contained" size="small" component={RouterLink} to={card.actions.href}>
            Set it up
          </Button>
          {/* ONE dismissal, not two. This endpoint has no snooze — its dismiss
              sets `dismissed_at`, which is terminal — so a "Not now" beside it
              would promise a return the backend cannot make. */}
          <Button size="small" variant="text" color="inherit" disabled={dismiss.isPending} onClick={() => dismiss.mutate()}>
            Don&apos;t suggest this
          </Button>
        </>
      }
    >
      <CardTitle title={card.title} body={card.body} />
    </CardShell>
  );
};

// -------------------------------- the switch -------------------------------

export default function OutreachRecommendationCard({ card, mode }: { card: ThisWeekCard; mode: PostureHealth['mode'] }) {
  // `kind` is the discriminant, so the two action sets can never be applied to
  // the wrong card: a perk recommendation has no agent row to snooze and no
  // composer to open, and an outreach card has no settings page to send
  // anyone to.
  return isPerkSettingsCard(card) ? <PerkCard card={card} /> : <OutreachCard card={card} mode={mode} />;
}

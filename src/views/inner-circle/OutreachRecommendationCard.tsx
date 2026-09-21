import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { DEFAULT_SNOOZE_DAYS, SNOOZE_DAY_OPTIONS } from 'api/agentFeedback';
import { dismissPerkRecommendation, PERK_RECOMMENDATIONS_QUERY_KEY, type OutreachRecommendation } from 'api/innerCircle.api';
import { Panel } from 'ui-component/frame';
import { OutreachComposer } from 'ui-component/inner-circle';
import { OUTREACH_CHANNEL_SENTENCE } from 'ui-component/inner-circle/outreachChannel';
import { FeedbackControls, ReasonChips, useRecommendationFeedback } from 'views/dashboard/RecommendationFeedback';
import {
  audienceContextLine,
  becauseLine,
  cardKindLabel,
  caseRows,
  confidenceLabel,
  costRow,
  healthRow,
  intentChipLabel,
  isPerkSettingsCard,
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
  return (
    <Box sx={{ opacity: dimmed ? 0.55 : 1, transition: 'opacity .2s' }}>
      <Panel
        title={
          <Stack direction="row" spacing={1} alignItems="center" useFlexGap sx={{ flexWrap: 'wrap' }}>
            <Box component="span">{cardKindLabel(card.kind)}</Box>
            <Chip size="small" variant="outlined" label={intentChipLabel(card.intent)} />
          </Stack>
        }
        note={confidenceLabel(card.confidence)}
      >
        <Box sx={{ px: '14px', py: '12px' }}>
          {children}

          {/* Fixed copy, one export. There is no channel to choose, so this is
              a statement of where the thing goes — not an option. */}
          <Typography sx={{ mt: 2, fontSize: '0.8125rem', color: 'text.disabled', lineHeight: 1.45 }}>
            {OUTREACH_CHANNEL_SENTENCE}
          </Typography>

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
  // `audienceContextLine` returns null at zero and at a missing count, so this
  // list is either real bullets or nothing — never a heading over an empty ul.
  const audienceLine = audienceContextLine(audience);
  const lines = [...reasons.filter((r) => r.trim().length > 0), ...(audienceLine ? [audienceLine] : [])];
  if (lines.length === 0) return null;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'grey.600' }}>
        Why now
      </Typography>
      <Box component="ul" sx={{ m: 0, mt: '4px', pl: 2.5 }}>
        {lines.map((line) => (
          <Typography
            component="li"
            key={line}
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
  const rows = [...caseRows(card), ...(costRow(card) ? [costRow(card)!] : []), ...(healthRow(card) ? [healthRow(card)!] : [])];
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

const SnoozeMenu = ({ onPick, disabled }: { onPick: (days: number) => void; disabled?: boolean }) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Button size="small" variant="text" color="inherit" disabled={disabled} onClick={(e) => setAnchor(e.currentTarget)}>
        Not now
      </Button>
      <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)}>
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

const OutreachCard = ({ card, mode }: { card: OutreachRecommendation; mode: PostureHealth['mode'] }) => {
  const feedback = useRecommendationFeedback(card);
  const [composerOpen, setComposerOpen] = useState(false);

  // A snoozed card leaves the surface; a declined one stays, dimmed, so the
  // undo inside FeedbackControls is still reachable (RecommendationFeedback).
  if (feedback.hidden) return null;

  const because = becauseLine(mode, card.posture_reason);

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
              <Button variant="contained" size="small" onClick={() => setComposerOpen(true)} disabled={feedback.isPending}>
                Set it up
              </Button>
              <SnoozeMenu onPick={feedback.snooze} disabled={feedback.isPending} />
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

      {composerOpen && (
        // The composer owns the accept: it calls `acceptOutreachRecommendation`
        // only after the save has succeeded, then invalidates the shared
        // prefix — so this card leaves the list on the next fetch rather than
        // being removed optimistically. A removed card that failed to save
        // would be a suggestion the owner can no longer act on.
        <OutreachComposer open kind={card.kind} prefill={card.prefill} recommendationId={card.id} onClose={() => setComposerOpen(false)} />
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

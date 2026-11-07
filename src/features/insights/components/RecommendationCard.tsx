import type { MouseEvent } from 'react';

import { Box, Button, Collapse, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { IconCheck, IconChevronDown, IconChevronUp } from '@tabler/icons-react';

import { categoryColor, categoryTheme, impactColor } from '../categoryTheme';
import { CATEGORY_LABELS, metaDetails, rationaleLabel } from '../insightsView';
import { panelScrollDelta, rationaleCounts, type DetailLoad } from '../rationale';
import type { Recommendation } from '../types';
import ImpactBadge from './ImpactBadge';
import RationalePanel from './RationalePanel';

export interface RecommendationCardProps {
  rec: Recommendation;
  onPrimary: (rec: Recommendation) => void;
  /** The primary action has run (S5): the meta line says "Acted on" and the button reads "Open again". */
  acted?: boolean;
  /** `viaKeyboard`: the button was activated from the keyboard (Enter/Space), so the undo toast should take focus. */
  onDismiss: (rec: Recommendation, viaKeyboard: boolean) => void;
  /** Toggle this card's rationale panel. */
  onRationale: (id: string) => void;
  /** The rationale panel is expanded. */
  open: boolean;
  /** This card's detail fetch; undefined until it is first expanded. */
  detail: DetailLoad | undefined;
  askAvailable: boolean;
  onRetryDetail: (id: string) => void;
  onAsk: (rec: Recommendation) => void;
}

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Expanding scrolls the panel into view only when its top edge would be off screen. */
const revealPanel = (node: HTMLElement) => {
  const delta = panelScrollDelta(node.getBoundingClientRect().top, window.innerHeight);
  if (delta !== 0) window.scrollBy({ top: delta, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
};

/** One recommendation: icon tile, meta line, title, summary, impact, actions, and the rationale panel when open. Props only. */
export default function RecommendationCard({
  rec,
  onPrimary,
  acted = false,
  onDismiss,
  onRationale,
  open,
  detail,
  askAvailable,
  onRetryDetail,
  onAsk
}: RecommendationCardProps) {
  const theme = useTheme();
  const color = categoryColor(rec.category, theme.palette.mode);
  const { Icon } = categoryTheme[rec.category];
  const titleId = `insight-${rec.id}-title`;
  const panelId = `insight-${rec.id}-rationale`;
  const { factCount, signalCount } = rationaleCounts(rec, detail);

  return (
    <Box
      component="section"
      aria-labelledby={titleId}
      data-rec-id={rec.id}
      data-acted={acted || undefined}
      sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: '12px', overflow: 'hidden' }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', p: { xs: 2, md: 3 } }}>
        <Box
          aria-hidden
          data-category-tile={rec.category}
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
            bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.2 : 0.1)
          }}
        >
          <Icon size={22} stroke={1.75} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Impact sits right of the text from md (768px) up; below that it drops under the summary. */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 1.5, md: 2 }}
            sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography component="p" sx={{ fontSize: '0.75rem', lineHeight: 1.6, color: 'text.secondary' }} data-meta>
                <Box component="span" sx={{ color, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {CATEGORY_LABELS[rec.category]}
                </Box>
                {metaDetails(rec).map((part) => ` · ${part}`)}
                {acted && (
                  <>
                    {' · '}
                    <Box
                      component="span"
                      data-acted-label
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        verticalAlign: 'bottom',
                        color: impactColor(theme.palette.mode),
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        // A global rule below 768px sets every svg to `width: 100% !important`
                        // (the ApexCharts responsive fix), which stretched this icon across the line.
                        '& svg': { width: '12px !important', maxWidth: 'none !important', height: 12, flex: 'none' }
                      }}
                    >
                      <IconCheck size={12} stroke={2.5} aria-hidden />
                      Acted on
                    </Box>
                  </>
                )}
              </Typography>
              <Typography
                id={titleId}
                variant="h2"
                sx={{ fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.35, color: 'text.dark', mt: 0.5 }}
              >
                {rec.title}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  color: 'text.secondary',
                  mt: 0.75,
                  // Two lines at desktop width; phones get the whole summary.
                  [theme.breakpoints.up('md')]: {
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }
                }}
              >
                {rec.summary}
              </Typography>
            </Box>
            <ImpactBadge impact={rec.impact} />
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
            {acted ? (
              <Button
                variant="outlined"
                color="primary"
                onClick={() => onPrimary(rec)}
                aria-label={`Open again: ${rec.primaryAction.label}`}
              >
                Open again
              </Button>
            ) : (
              <Button variant="contained" color="primary" disableElevation onClick={() => onPrimary(rec)}>
                {rec.primaryAction.label}
              </Button>
            )}
            <Button
              variant="outlined"
              color="inherit"
              sx={{ borderColor: 'divider' }}
              onClick={(event: MouseEvent<HTMLButtonElement>) => onDismiss(rec, event.detail === 0)}
            >
              Dismiss
            </Button>
            <Button
              variant="text"
              color="inherit"
              aria-expanded={open}
              aria-controls={panelId}
              endIcon={
                open ? (
                  <IconChevronUp size={16} aria-hidden data-chevron="up" />
                ) : (
                  <IconChevronDown size={16} aria-hidden data-chevron="down" />
                )
              }
              onClick={() => onRationale(rec.id)}
              sx={{ ml: { md: 'auto' }, color: 'text.secondary' }}
            >
              {open ? 'Hide rationale' : rationaleLabel(factCount, signalCount)}
            </Button>
          </Stack>
        </Box>
      </Stack>

      <Collapse in={open} id={panelId} role="region" aria-label={`Rationale: ${rec.title}`} onEntering={revealPanel}>
        {detail && <RationalePanel rec={rec} load={detail} askAvailable={askAvailable} onRetry={onRetryDetail} onAsk={onAsk} />}
      </Collapse>
    </Box>
  );
}

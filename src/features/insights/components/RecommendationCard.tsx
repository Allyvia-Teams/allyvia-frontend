import type { MouseEvent } from 'react';

import { Box, Button, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { IconChevronDown } from '@tabler/icons-react';

import { categoryColor, categoryTheme } from '../categoryTheme';
import { CATEGORY_LABELS, metaDetails, rationaleLabel } from '../insightsView';
import type { Recommendation } from '../types';
import ImpactBadge from './ImpactBadge';

export interface RecommendationCardProps {
  rec: Recommendation;
  onPrimary: (id: string) => void;
  /** `viaKeyboard`: the button was activated from the keyboard (Enter/Space), so the undo toast should take focus. */
  onDismiss: (rec: Recommendation, viaKeyboard: boolean) => void;
  /** S4 opens the rationale; until then the toggle only reports the click. */
  onRationale: (id: string) => void;
}

/** One recommendation, collapsed: icon tile, meta line, title, summary, impact, actions. Props only. */
export default function RecommendationCard({ rec, onPrimary, onDismiss, onRationale }: RecommendationCardProps) {
  const theme = useTheme();
  const color = categoryColor(rec.category, theme.palette.mode);
  const { Icon } = categoryTheme[rec.category];
  const titleId = `insight-${rec.id}-title`;

  return (
    <Box
      component="section"
      aria-labelledby={titleId}
      data-rec-id={rec.id}
      sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: '12px', p: { xs: 2, md: 3 } }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
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
            <Button variant="contained" color="primary" disableElevation onClick={() => onPrimary(rec.id)}>
              {rec.primaryAction.label}
            </Button>
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
              aria-expanded={false}
              endIcon={<IconChevronDown size={16} aria-hidden />}
              onClick={() => onRationale(rec.id)}
              sx={{ ml: { md: 'auto' }, color: 'text.secondary' }}
            >
              {rationaleLabel(rec.facts.length || rec.signalCount)}
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

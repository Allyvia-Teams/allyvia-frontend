import type { ReactNode } from 'react';

import { Box, Button, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { IconMessageCircle } from '@tabler/icons-react';

import { factSourceColor, factSourceTheme } from '../categoryTheme';
import { builtFromLine, type DetailLoad } from '../rationale';
import type { Fact, Recommendation } from '../types';

export interface RationalePanelProps {
  rec: Recommendation;
  load: DetailLoad;
  /** False while no agent chat is reachable from /insights (askAbout.ts): the button says "Coming soon". */
  askAvailable: boolean;
  onRetry: (id: string) => void;
  onAsk: (rec: Recommendation) => void;
}

// Two columns from md (768px) up, Why first; one column below that. The
// theme's sm is 375px, so sm would split phones too.
const COLUMNS = { xs: 'minmax(0, 1fr)', md: 'minmax(0, 55fr) minmax(0, 45fr)' };

const SR_ONLY = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap'
} as const;

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <Typography
    component="h3"
    sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', mb: 1.5 }}
  >
    {children}
  </Typography>
);

function FactRow({ fact }: { fact: Fact }) {
  const theme = useTheme();
  const color = factSourceColor(fact.source, theme.palette.mode);
  return (
    <Box
      component="li"
      data-fact-row
      data-fact-source={fact.source}
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: { xs: 1.5, md: 2 },
        px: { xs: 1.5, md: 2 },
        py: 1.5,
        '& + &': { borderTop: 1, borderColor: 'divider' }
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Box aria-hidden sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
          <Typography
            component="span"
            sx={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              color
            }}
          >
            {factSourceTheme[fact.source].label}
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.45, color: 'text.primary', mt: 0.25 }}>{fact.label}</Typography>
      </Box>
      <Box sx={{ textAlign: 'right', flexShrink: 0, maxWidth: '50%' }}>
        <Typography sx={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.35, color: 'text.dark' }}>{fact.value}</Typography>
        {fact.sub && <Typography sx={{ fontSize: '0.75rem', lineHeight: 1.4, color: 'text.secondary', mt: 0.25 }}>{fact.sub}</Typography>}
      </Box>
    </Box>
  );
}

/**
 * The rationale below a card's footer (S4): why on the left, the facts on the
 * right, then "Built from N signals" and "Ask about this". Props only; the
 * page fetches the detail and passes its load state.
 */
export default function RationalePanel({ rec, load, askAvailable, onRetry, onAsk }: RationalePanelProps) {
  const theme = useTheme();
  // A shade lighter than the gray panel the cards sit on, so it reads as part of the card.
  const surface = theme.palette.mode === 'dark' ? alpha(theme.palette.background.default, 0.5) : alpha(theme.palette.grey[50], 0.5);

  let body: ReactNode;
  if (load.status === 'loading') {
    body = (
      <Box aria-busy="true" aria-label="Loading rationale" sx={{ display: 'grid', gridTemplateColumns: COLUMNS, columnGap: 4, rowGap: 3 }}>
        <Box>
          <Skeleton variant="text" width="45%" />
          <Skeleton variant="text" />
          <Skeleton variant="text" />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="rounded" height={96} sx={{ mt: 2 }} />
        </Box>
        <Box>
          <Skeleton variant="text" width="45%" />
          <Skeleton variant="rounded" height={180} sx={{ borderRadius: '12px' }} />
        </Box>
      </Box>
    );
  } else if (load.status === 'error') {
    body = (
      <Stack direction="row" spacing={2} role="alert" sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography color="error" sx={{ fontSize: '0.875rem' }}>
          Could not load the rationale.
        </Typography>
        <Button size="small" variant="outlined" onClick={() => onRetry(rec.id)}>
          Retry
        </Button>
      </Stack>
    );
  } else {
    const { rationale, facts, signalCount } = load.detail;
    const footer = builtFromLine(signalCount, rec.lastChecked);
    body = (
      <>
        <Box sx={{ display: 'grid', gridTemplateColumns: COLUMNS, columnGap: 4, rowGap: 3 }}>
          <Box data-rationale-why>
            <SectionLabel>Why Allyvia recommends this</SectionLabel>
            {rationale.narrative && (
              <Typography sx={{ fontSize: '0.9375rem', lineHeight: 1.65, color: 'text.primary' }}>{rationale.narrative}</Typography>
            )}
            {rationale.steps.length > 0 && (
              <Box component="ol" sx={{ listStyle: 'none', m: 0, mt: 2.5, p: 0, display: 'grid', gap: 1.5 }}>
                {rationale.steps.map((step, index) => (
                  <Box component="li" key={step} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Box
                      aria-hidden
                      sx={{
                        width: 22,
                        height: 22,
                        flexShrink: 0,
                        borderRadius: '50%',
                        border: 1,
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'text.secondary'
                      }}
                    >
                      {index + 1}
                    </Box>
                    <Typography component="span" sx={{ fontSize: '0.875rem', lineHeight: 1.5, color: 'text.primary', pt: '1px' }}>
                      {step}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          <Box data-rationale-facts>
            <SectionLabel>The facts behind it</SectionLabel>
            <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: '12px', overflow: 'hidden' }}>
              {facts.length > 0 ? (
                <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                  {facts.map((fact, index) => (
                    <FactRow key={`${fact.source}-${fact.label}-${index}`} fact={fact} />
                  ))}
                </Box>
              ) : (
                <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', p: 2 }}>
                  No supporting facts were recorded for this recommendation.
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        <Stack
          direction="row"
          spacing={1.5}
          useFlexGap
          sx={{ mt: 3, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
          data-rationale-footer
        >
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{footer}</Typography>
          {askAvailable ? (
            <Button variant="outlined" color="inherit" startIcon={<IconMessageCircle size={16} aria-hidden />} onClick={() => onAsk(rec)}>
              Ask about this
            </Button>
          ) : (
            <Tooltip title="Coming soon" describeChild>
              <Button
                variant="outlined"
                color="inherit"
                aria-disabled="true"
                startIcon={<IconMessageCircle size={16} aria-hidden />}
                // Still focusable so the tooltip is reachable by keyboard; a click only logs the intent.
                onClick={() => onAsk(rec)}
                sx={{
                  color: 'text.disabled',
                  borderColor: 'divider',
                  cursor: 'default',
                  '&:hover': { bgcolor: 'transparent', borderColor: 'divider' }
                }}
              >
                Ask about this
                <Box component="span" sx={SR_ONLY}>
                  {' '}
                  (coming soon)
                </Box>
              </Button>
            </Tooltip>
          )}
        </Stack>
      </>
    );
  }

  return (
    // 24px from md up; 16px on phones, where the card is already inside the page gutter and the gray panel.
    <Box data-rationale-panel sx={{ borderTop: 1, borderColor: 'divider', bgcolor: surface, p: { xs: 2, md: 3 } }}>
      {body}
    </Box>
  );
}

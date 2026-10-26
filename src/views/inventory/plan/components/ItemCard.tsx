// One item of the memo (design §10, the mockup's item card): picture, name, the chips, price, one number with
// its range and meter, the sizes, the server's sentence of why, and her notes. Presentational: the owner page
// passes `actions`, `facts`, `trace` and `priceSlot`; the share link passes none of them.

import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { MISSING, amountText, type CardView } from '../memo';
import Chunk from './Chunk';
import Meter from './Meter';

interface Props {
  card: CardView;
  chosen?: ReadonlySet<string>;
  tabbableAnchor?: string | null;
  actions?: ReactNode;
  facts?: ReactNode;
  trace?: ReactNode;
  priceSlot?: ReactNode;
}

const STATUS_TONE: Record<string, 'default' | 'success' | 'warning' | 'info' | 'error'> = {
  recommended: 'success',
  hold: 'warning',
  insufficient: 'default',
  cut: 'warning',
  flagged: 'warning',
  cleared: 'default',
  needs_price: 'info',
  unsized: 'default'
};

export default function ItemCard({ card, chosen, tabbableAnchor, actions, facts, trace, priceSlot }: Props) {
  const is = (anchor: string | undefined) => Boolean(anchor && chosen?.has(anchor));
  const tab = (anchor: string | undefined) => Boolean(anchor && anchor === tabbableAnchor);
  const unit = card.figure?.unit || 'units';
  const range =
    card.figure && card.figure.low !== null && card.figure.high !== null
      ? `range ${amountText(card.figure.low, unit)}–${amountText(card.figure.high, unit)}`
      : null;

  return (
    <Box
      component="article"
      id={card.domId}
      data-card={card.key}
      aria-label={card.name}
      tabIndex={-1}
      sx={(theme) => ({
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '10px',
        bgcolor: 'background.paper',
        p: '16px',
        scrollMarginTop: '24px',
        outline: 'none',
        transition: 'box-shadow 160ms ease',
        '&:focus-visible': { boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.55)}` },
        '&.plan-flash': { boxShadow: `0 0 0 3px ${alpha(theme.palette.warning.main, 0.5)}` },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
      })}
    >
      <Box sx={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <Box
          sx={(theme) => ({
            width: 88,
            height: 116,
            flexShrink: 0,
            borderRadius: '8px',
            overflow: 'hidden',
            bgcolor: alpha(theme.palette.text.primary, 0.04),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          })}
        >
          {card.picture ? (
            <Box
              component="img"
              src={card.picture}
              alt={card.name}
              loading="lazy"
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Typography variant="caption" color="text.disabled" sx={{ px: 1, textAlign: 'center' }}>
              No picture
            </Typography>
          )}
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography component="h3" sx={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.3 }}>
                {card.name}
              </Typography>
              {card.brand ? (
                <Typography variant="body2" color="text.secondary">
                  {card.brand}
                </Typography>
              ) : null}
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mt: '6px' }}>
                {card.statusWord ? (
                  <Chip size="small" label={card.statusWord} color={STATUS_TONE[card.status] ?? 'default'} variant="outlined" />
                ) : null}
                {card.fitWord ? <Chip size="small" label={card.fitWord} variant="outlined" /> : null}
                {card.flagWords.map((word) => (
                  <Chip key={word} size="small" label={word} color="warning" variant="outlined" />
                ))}
              </Stack>
            </Box>

            {/* The number is the why chunk's figure; with no sentence to carry the anchor, the number carries it. */}
            <Chunk
              chunk={card.why?.sentence ? null : card.why}
              as="div"
              chosen={is(card.why?.anchor)}
              tabbable={tab(card.why?.anchor)}
              sx={{ display: 'block' }}
            >
              <Box sx={{ textAlign: 'right', flexShrink: 0 }} data-testid="plan-card-number">
                <Typography component="div" sx={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {card.figure ? amountText(card.figure.amount, unit) : card.missing ? MISSING : ''}
                </Typography>
                {card.figure || card.missing ? (
                  <Typography variant="caption" color="text.secondary" component="div">
                    {unit}
                    {range ? ` · ${range}` : ''}
                  </Typography>
                ) : null}
                {card.figure ? (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Meter value={card.figure} cut={card.isCut} label={`${card.figure.amount} ${unit}${range ? `, ${range}` : ''}`} />
                  </Box>
                ) : null}
              </Box>
            </Chunk>
          </Box>

          {card.chips.length ? (
            <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', mt: '10px' }}>
              {card.chips.map((label, index) => (
                <Chip key={`${label}-${index}`} size="small" label={label} sx={{ height: 22, fontSize: '0.75rem' }} />
              ))}
            </Stack>
          ) : null}

          {card.price ? (
            <Chunk
              chunk={card.price}
              as="p"
              chosen={is(card.price.anchor)}
              tabbable={tab(card.price.anchor)}
              sx={{ m: 0, mt: '10px', fontSize: '0.875rem' }}
            />
          ) : null}
          {priceSlot}
        </Box>
      </Box>

      {card.split.length ? (
        <Chunk
          chunk={card.splitChunk}
          as="div"
          chosen={is(card.splitChunk?.anchor)}
          tabbable={tab(card.splitChunk?.anchor)}
          sx={{ display: 'block', mt: '12px' }}
        >
          <Box component="dl" aria-label="Sizes" sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', m: 0 }}>
            {card.split.map(({ size, qty }) => (
              <Box
                key={size}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '6px',
                  px: '8px',
                  py: '4px',
                  minWidth: 44,
                  textAlign: 'center'
                }}
              >
                <Typography component="dt" variant="caption" color="text.secondary">
                  {size}
                </Typography>
                <Typography component="dd" sx={{ m: 0, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {qty}
                </Typography>
              </Box>
            ))}
          </Box>
          {card.splitChunk?.sentence ? (
            <Typography variant="caption" color="text.secondary">
              {card.splitChunk.sentence}
            </Typography>
          ) : null}
        </Chunk>
      ) : null}

      <Stack spacing={1} sx={{ mt: '12px' }}>
        {card.why?.sentence ? (
          <Chunk chunk={card.why} as="p" chosen={is(card.why.anchor)} tabbable={tab(card.why.anchor)} sx={{ m: 0, lineHeight: 1.55 }} />
        ) : null}
        {card.fit ? (
          <Chunk
            chunk={card.fit}
            as="p"
            chosen={is(card.fit.anchor)}
            tabbable={tab(card.fit.anchor)}
            sx={{ m: 0, color: 'text.secondary' }}
          />
        ) : null}
        {[card.cut, card.decision, card.moved].map((chunk) =>
          chunk ? (
            <Chunk
              key={chunk.anchor}
              chunk={chunk}
              as="p"
              chosen={is(chunk.anchor)}
              tabbable={tab(chunk.anchor)}
              sx={(theme) => ({ m: 0, px: '10px', py: '6px', bgcolor: alpha(theme.palette.warning.main, 0.08), borderRadius: '6px' })}
            />
          ) : null
        )}
        {[...card.notes, ...card.owner].map((chunk) => (
          <Chunk
            key={chunk.anchor}
            chunk={chunk}
            as="p"
            chosen={is(chunk.anchor)}
            tabbable={tab(chunk.anchor)}
            sx={{ m: 0, color: 'text.secondary', fontSize: '0.875rem' }}
          />
        ))}
        {card.note ? (
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
            Your note: {card.note}
          </Typography>
        ) : null}
      </Stack>

      {facts}
      {actions ? <Box sx={{ mt: '12px', pt: '12px', borderTop: '1px solid', borderColor: 'divider' }}>{actions}</Box> : null}
      {trace}
    </Box>
  );
}

// The proposal memo (design §10; the mockup's memo column): cover, totals, the months, the items, what is
// carried forward, what she left out, what we are not sure about, and the notes. Presentational over a
// `MemoView` (memo.ts for her memo, sharedMemo.ts for the share link); every sentence is the server's.

import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { StatsStrip } from 'ui-component/frame';

import { figureText, type CardView, type MemoView } from '../memo';
import Chunk from './Chunk';
import ItemCard from './ItemCard';

export const COLLAPSED_ITEMS = 8;

export interface CardSlots {
  actions?: ReactNode;
  facts?: ReactNode;
  trace?: ReactNode;
  priceSlot?: ReactNode;
}

interface Props {
  view: MemoView;
  chosen?: ReadonlySet<string>;
  showAll?: boolean;
  onShowAll?: () => void;
  slotsFor?: (card: CardView) => CardSlots;
  /** Her Include on an excluded line (owner only). */
  excludedAction?: (lineId: string) => ReactNode;
  /** Facts about a frozen plan (owner only), under the cover. */
  liveFacts?: ReactNode;
  endcap?: ReactNode;
}

const dayText = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
};

const SectionTitle = ({ children }: { children: ReactNode }) => (
  <Typography component="h2" sx={{ fontSize: '1.0625rem', fontWeight: 600, mt: '28px', mb: '10px' }}>
    {children}
  </Typography>
);

export default function Memo({ view, chosen, showAll = false, onShowAll, slotsFor, excludedAction, liveFacts, endcap }: Props) {
  const is = (anchor: string | undefined) => Boolean(anchor && chosen?.has(anchor));
  const first = Object.keys(view.anchors)[0] ?? null;
  const tab = (anchor: string | undefined) => Boolean(anchor && anchor === first);
  const items = showAll ? view.items : view.items.slice(0, COLLAPSED_ITEMS);
  const hidden = view.items.length - items.length;
  const facts: [string, string][] = [
    ['Store', view.store],
    ['Order by', view.targetDate ? dayText(view.targetDate) : ''],
    ['Selling', view.windowStart && view.windowEnd ? `${dayText(view.windowStart)} – ${dayText(view.windowEnd)}` : '']
  ];

  return (
    <Box component="article" aria-label="Inventory proposal">
      <Typography variant="overline" color="text.secondary">
        Inventory proposal
      </Typography>
      <Typography component="h1" sx={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 }}>
        {view.title}
      </Typography>
      <Box component="dl" sx={{ display: 'flex', gap: '28px', flexWrap: 'wrap', m: 0, mt: '12px' }}>
        {facts
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <Box key={label}>
              <Typography component="dt" variant="caption" color="text.secondary">
                {label}
              </Typography>
              <Typography component="dd" sx={{ m: 0, fontWeight: 600 }}>
                {value}
              </Typography>
            </Box>
          ))}
      </Box>
      {view.cover ? (
        <Chunk chunk={view.cover} as="p" tabbable={tab(view.cover.anchor)} sx={{ display: 'block', mt: '14px', mb: 0, lineHeight: 1.55 }} />
      ) : null}
      {view.basis ? (
        <Chunk
          chunk={view.basis}
          as="p"
          chosen={is(view.basis.anchor)}
          tabbable={tab(view.basis.anchor)}
          sx={{ display: 'block', mt: '8px', mb: 0, color: 'text.secondary', fontSize: '0.875rem' }}
        />
      ) : null}
      {liveFacts}

      {view.totals.length ? (
        <Box
          sx={{
            mt: '20px',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '10px',
            overflow: 'hidden',
            bgcolor: 'background.paper'
          }}
        >
          <StatsStrip
            minWidth={140}
            stats={view.totals.map((t) => ({
              label: t.label,
              value: (
                <Chunk chunk={t.chunk} tabbable={tab(t.chunk.anchor)}>
                  {figureText(t.chunk.value)}
                </Chunk>
              ),
              basis: t.chunk.sentence ?? undefined
            }))}
          />
        </Box>
      ) : null}

      {view.months.root || view.months.rows.length ? (
        <Box component="section" aria-label="How the window looks">
          <SectionTitle>How the window looks</SectionTitle>
          {view.months.root ? (
            <Chunk
              chunk={view.months.root}
              as="p"
              chosen={is(view.months.root.anchor)}
              tabbable={tab(view.months.root.anchor)}
              sx={{ display: 'block', mt: 0, mb: '10px' }}
            />
          ) : null}
          <Stack spacing={1.25}>
            {view.months.rows.map((m) => (
              <Box
                key={m.key}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px', p: '14px', bgcolor: 'background.paper' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, flexWrap: 'wrap' }}>
                  {m.name ? <Typography sx={{ fontWeight: 600, minWidth: 96 }}>{m.name}</Typography> : null}
                  <Chunk chunk={m.row} chosen={is(m.row.anchor)} tabbable={tab(m.row.anchor)} sx={{ flex: 1, minWidth: 200 }}>
                    {m.row.value ? (
                      <Typography component="span" sx={{ fontWeight: 600, mr: 1, fontVariantNumeric: 'tabular-nums' }}>
                        {figureText(m.row.value)}
                      </Typography>
                    ) : null}
                    {m.row.sentence}
                  </Chunk>
                </Box>
                {m.details.map((d) => (
                  <Chunk
                    key={d.anchor}
                    chunk={d}
                    as="p"
                    chosen={is(d.anchor)}
                    tabbable={tab(d.anchor)}
                    sx={{ display: 'block', m: 0, mt: '6px', color: 'text.secondary', fontSize: '0.875rem' }}
                  />
                ))}
              </Box>
            ))}
          </Stack>
        </Box>
      ) : null}

      {view.items.length ? (
        <Box component="section" aria-label="The items">
          <SectionTitle>The items</SectionTitle>
          <Stack spacing={1.5}>
            {items.map((card) => (
              <ItemCard key={card.key} card={card} chosen={chosen} tabbableAnchor={first} {...(slotsFor ? slotsFor(card) : {})} />
            ))}
          </Stack>
          {hidden > 0 && onShowAll ? (
            <Box sx={{ textAlign: 'center', mt: 1.5 }}>
              <Button variant="text" onClick={onShowAll}>
                {hidden} more item{hidden === 1 ? '' : 's'} below · Show all {view.items.length}
              </Button>
            </Box>
          ) : null}
        </Box>
      ) : null}

      {view.carried.length ? (
        <Box component="section" aria-label="Already on the floor">
          <SectionTitle>Already on the floor</SectionTitle>
          <Stack spacing={1.5}>
            {view.carried.map((card) => (
              <ItemCard key={card.key} card={card} chosen={chosen} tabbableAnchor={first} {...(slotsFor ? slotsFor(card) : {})} />
            ))}
          </Stack>
        </Box>
      ) : null}

      {view.excluded.length ? (
        <Box component="section" aria-label="Left out">
          <SectionTitle>Left out</SectionTitle>
          <Stack spacing={0.75}>
            {view.excluded.map((row) => (
              <Box
                key={row.lineId}
                id={view.excludedDomIds[row.lineId]}
                tabIndex={-1}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: '12px',
                  py: '8px',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '8px'
                }}
              >
                <Typography sx={{ flex: 1 }}>{row.name}</Typography>
                {excludedAction ? excludedAction(row.lineId) : null}
              </Box>
            ))}
          </Stack>
        </Box>
      ) : null}

      {view.caveats.length || view.missingCaveat ? (
        <Box component="section" aria-label="What we are not sure about">
          <SectionTitle>What we are not sure about</SectionTitle>
          <Stack spacing={1} component="ul" sx={{ m: 0, pl: '20px' }}>
            {view.caveats.map((c) => (
              <li key={c.anchor}>
                <Chunk chunk={c} tabbable={tab(c.anchor)} />
              </li>
            ))}
            {view.missingCaveat ? <li>Where a number shows as —, the plan has not given one yet; it is not zero.</li> : null}
          </Stack>
        </Box>
      ) : null}

      {view.notes.planNote || view.notes.lines.length ? (
        <Box component="section" aria-label="Notes">
          <SectionTitle>Notes</SectionTitle>
          {view.notes.planNote ? <Typography sx={{ mb: 1 }}>{view.notes.planNote}</Typography> : null}
          {view.notes.lines.map((n) => (
            <Typography key={n.lineId} variant="body2" sx={{ mb: 0.5 }}>
              <strong>{n.name}:</strong> {n.note}
            </Typography>
          ))}
        </Box>
      ) : null}

      {endcap}
    </Box>
  );
}

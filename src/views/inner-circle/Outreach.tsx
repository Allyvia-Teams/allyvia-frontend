import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';

import { fetchBuyingRounds, fetchPerks, fetchPromotions, type BuyingRound, type PerkEvent, type PromotionRule } from 'api/innerCircle.api';
import { ListRow, Panel, PanelMessage } from 'ui-component/frame';
import { OutreachComposer, OutreachRowActions } from 'ui-component/inner-circle';
import { parseOutreachKind, parseOutreachStatus, type OutreachKind, type OutreachStatus } from './navigation';
import {
  buildOutreachRows,
  filterRows,
  kindCounts,
  kindLabel,
  outreachLoadError,
  outreachSearchParams,
  outreachSources,
  OUTREACH_KINDS,
  statusChip,
  truncation,
  type OutreachRow
} from './outreachRows';

// ==============================|| INNER CIRCLE - OUTREACH ||============================== //
// One table of everything the owner sends out — discounts, events and perks,
// style votes — replacing the three tabs that used to hold them apart. The
// "New outreach" menu is the one door in; a row opens the same composer to
// edit. Filters live in the URL so a filtered table can be linked to.
//
// The stack is FULL WIDTH (design §5, Session 3's ruling for Customers): this
// table has no companion rail, and BodyGrid's main column would crush it.

/** Sent as-is AND used as the query key, so the key describes what was asked for. */
const LIST_PARAMS = { page: 1, page_size: 100 };

interface ComposerTarget {
  kind: OutreachKind;
  existing: PromotionRule | PerkEvent | BuyingRound | null;
}

export default function Outreach() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = parseOutreachStatus(searchParams.get('status'));
  const kindFilter = parseOutreachKind(searchParams.get('kind'));

  const [query, setQuery] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [composer, setComposer] = useState<ComposerTarget | null>(null);

  const promotionsQuery = useQuery({ queryKey: ['ic-promotions', LIST_PARAMS], queryFn: () => fetchPromotions(LIST_PARAMS) });
  const perksQuery = useQuery({ queryKey: ['ic-perks', LIST_PARAMS], queryFn: () => fetchPerks(LIST_PARAMS) });
  const roundsQuery = useQuery({ queryKey: ['ic-buying-rounds', LIST_PARAMS], queryFn: () => fetchBuyingRounds(LIST_PARAMS) });

  const promotions = promotionsQuery.data?.results ?? [];
  const perks = perksQuery.data?.results ?? [];
  const rounds = roundsQuery.data?.results ?? [];

  const rows = useMemo(() => buildOutreachRows(promotions, perks, rounds), [promotions, perks, rounds]);
  const sources = useMemo(() => outreachSources(promotions, perks, rounds), [promotions, perks, rounds]);
  const visibleRows = filterRows(rows, { status, kind: kindFilter, query });
  const counts = kindCounts(rows, status);
  const { shown, total, truncated } = truncation([promotionsQuery.data, perksQuery.data, roundsQuery.data]);

  const failedKinds: OutreachKind[] = [
    ...(promotionsQuery.isError ? (['discount'] as const) : []),
    ...(perksQuery.isError ? (['event'] as const) : []),
    ...(roundsQuery.isError ? (['vote'] as const) : [])
  ];
  const loadError = outreachLoadError(failedKinds);
  const isLoading = promotionsQuery.isPending || perksQuery.isPending || roundsQuery.isPending;

  const retry = () => {
    if (promotionsQuery.isError) promotionsQuery.refetch();
    if (perksQuery.isError) perksQuery.refetch();
    if (roundsQuery.isError) roundsQuery.refetch();
  };

  const setFilters = (patch: { status?: OutreachStatus; kind?: OutreachKind | null }) => {
    // Push, never replace — a filter change is somewhere the owner can go
    // back from. Only the legacy `?tab=` redirect replaces (Session 3).
    setSearchParams(outreachSearchParams(searchParams, patch));
  };

  const openComposer = (kind: OutreachKind, existing: ComposerTarget['existing'] = null) => {
    setMenuAnchor(null);
    setComposer({ kind, existing });
  };

  const openRow = (row: OutreachRow) => {
    const source = sources[row.key];
    if (!source) return;
    if (source.kind === 'discount') openComposer('discount', source.promotion);
    else if (source.kind === 'event') openComposer('event', source.perk);
    else openComposer('vote', source.round);
  };

  const newOutreachButton = (
    <>
      <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={(e) => setMenuAnchor(e.currentTarget)}>
        New outreach
      </Button>
      <Menu anchorEl={menuAnchor} open={menuAnchor !== null} onClose={() => setMenuAnchor(null)}>
        {OUTREACH_KINDS.map((option) => (
          <MenuItem key={option.kind} onClick={() => openComposer(option.kind)} sx={{ maxWidth: 360, whiteSpace: 'normal' }}>
            <ListItemText primary={option.label} secondary={option.description} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );

  return (
    <>
      <Stack spacing={2}>
        <Panel title="Outreach" action={newOutreachButton}>
          <Box sx={{ px: '14px', py: '12px', borderBottom: '1px solid', borderColor: 'grey.100' }}>
            <Stack direction="row" spacing={1.5} alignItems="center" useFlexGap sx={{ flexWrap: 'wrap' }}>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={status}
                onChange={(_e, value: OutreachStatus | null) => value && setFilters({ status: value })}
                aria-label="Outreach status"
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="draft">Draft</ToggleButton>
                <ToggleButton value="live">Live</ToggleButton>
                <ToggleButton value="ended">Ended</ToggleButton>
              </ToggleButtonGroup>

              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
                {OUTREACH_KINDS.map((option) => {
                  const selected = kindFilter === option.kind;
                  return (
                    <Chip
                      key={option.kind}
                      size="small"
                      label={`${option.label} (${counts[option.kind]})`}
                      color={selected ? 'primary' : 'default'}
                      variant={selected ? 'filled' : 'outlined'}
                      // Clicking the selected chip clears it, so the filter is
                      // its own undo and the owner is never stuck in one kind.
                      onClick={() => setFilters({ kind: selected ? null : option.kind })}
                    />
                  );
                })}
              </Stack>

              <Box sx={{ flex: 1, minWidth: 160 }}>
                <TextField size="small" fullWidth label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
              </Box>
            </Stack>
          </Box>

          {loadError && (
            <PanelMessage tone="error">
              {loadError}{' '}
              <Button size="small" onClick={retry} sx={{ textTransform: 'none' }}>
                Retry
              </Button>
            </PanelMessage>
          )}

          {isLoading && !loadError && <PanelMessage>Loading…</PanelMessage>}

          {!isLoading && !loadError && rows.length === 0 && <PanelMessage>Nothing here yet — start with New outreach.</PanelMessage>}

          {!isLoading && rows.length > 0 && visibleRows.length === 0 && <PanelMessage>No outreach matches these filters.</PanelMessage>}

          {visibleRows.map((row) => {
            const source = sources[row.key];
            const chip = statusChip(row.status);
            return (
              // Clicking the row opens its composer — a pointer shortcut, not
              // the only way in. It is deliberately NOT `role="button"` with a
              // tabIndex: the row already contains real buttons, and a button
              // holding buttons is read out by a screen reader as one control
              // whose label is every word in the row. The Edit control inside
              // does exactly the same thing and is properly focusable, so the
              // keyboard path is the one that is already there.
              <Box key={row.key} onClick={() => openRow(row)} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' } }}>
                <ListRow
                  title={row.title}
                  body={`${kindLabel(row.kind)} · ${row.audience}`}
                  aside={<Chip size="small" label={chip.label} color={chip.color} variant={chip.variant} />}
                  asideBasis={row.statusDetail}
                  asideTone={chip.tone}
                  trailing={
                    source ? (
                      // The actions are not the row: a click on one must not
                      // also open the composer behind it.
                      <Box onClick={(e) => e.stopPropagation()}>
                        <OutreachRowActions source={source} title={row.title} audience={row.audience} onEdit={() => openRow(row)} />
                      </Box>
                    ) : null
                  }
                />
              </Box>
            );
          })}

          {truncated && (
            <Box sx={{ px: '14px', py: '10px', borderTop: '1px solid', borderColor: 'grey.100' }}>
              <Typography sx={{ fontSize: '0.8125rem', color: 'text.disabled' }}>
                Showing {shown} of {total}
              </Typography>
            </Box>
          )}
        </Panel>
      </Stack>

      {composer && <OutreachComposer open kind={composer.kind} existing={composer.existing} onClose={() => setComposer(null)} />}
    </>
  );
}

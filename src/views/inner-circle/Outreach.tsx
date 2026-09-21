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

import {
  fetchBuyingRounds,
  fetchOutreachRecommendations,
  fetchPerks,
  fetchPromotions,
  OUTREACH_RECOMMENDATIONS_QUERY_KEY,
  type BuyingRound,
  type OutreachRecommendationCard,
  type PerkEvent,
  type PromotionRule
} from 'api/innerCircle.api';
import { ListRow, Panel, PanelMessage } from 'ui-component/frame';
import { OutreachComposer, OutreachRowActions } from 'ui-component/inner-circle';
import { parseOutreachKind, parseOutreachStatus, type OutreachKind, type OutreachStatus } from './navigation';
import {
  buildOutreachRows,
  filterRows,
  isManagedElsewhere,
  kindCounts,
  outreachLoadError,
  outreachSearchParams,
  outreachSources,
  OUTREACH_KINDS,
  rowBody,
  statusChip,
  suggestedPromotionIds,
  SUGGESTED_CHIP_LABEL,
  truncation,
  truncationLabel,
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

/**
 * One frozen empty array per list, so a pending query does not mint a new one
 * every render and re-run the memos below on identity alone. React Query's
 * own `results` reference is stable once data arrives; this covers the gap
 * before it does.
 */
const NO_PROMOTIONS: PromotionRule[] = [];
const NO_PERKS: PerkEvent[] = [];
const NO_ROUNDS: BuyingRound[] = [];
const NO_CARDS: OutreachRecommendationCard[] = [];

/** Ties the "New outreach" button's `aria-controls` to the menu it opens. */
const NEW_OUTREACH_MENU_ID = 'outreach-new-menu';

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

  // DECORATION, NOT DATA. The recommender pre-creates an inactive
  // PromotionRule for every open win-back card, and the promotions list does
  // not exclude them — so without this the owner's table fills with Drafts
  // they never wrote. It is deliberately NOT part of `failedKinds`, `isLoading`
  // or `truncation`: if this fetch is slow or fails, the marks are simply
  // absent and every row still shows. A missing mark is a smaller lie than a
  // missing table.
  const recommendationsQuery = useQuery({
    queryKey: OUTREACH_RECOMMENDATIONS_QUERY_KEY,
    queryFn: fetchOutreachRecommendations
  });

  const promotions = promotionsQuery.data?.results ?? NO_PROMOTIONS;
  const perks = perksQuery.data?.results ?? NO_PERKS;
  const rounds = roundsQuery.data?.results ?? NO_ROUNDS;
  const cards = recommendationsQuery.data ?? NO_CARDS;

  const suggested = useMemo(() => suggestedPromotionIds(cards), [cards]);
  const rows = useMemo(
    () => buildOutreachRows(promotions, perks, rounds, { suggestedPromotionIds: suggested }),
    [promotions, perks, rounds, suggested]
  );
  const sources = useMemo(() => outreachSources(promotions, perks, rounds), [promotions, perks, rounds]);
  const visibleRows = filterRows(rows, { status, kind: kindFilter, query });
  const counts = kindCounts(rows, status);
  const truncationResult = truncation([promotionsQuery.data, perksQuery.data, roundsQuery.data]);

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

  /**
   * A network-welcome rule opens nothing: the composer would put a stored
   * trigger into a `Select` that has no option for it, and every save path
   * out of that dialog is refused by the API. Its row says where it IS
   * configured — see `statusForPromotion`.
   */
  const isRowEditable = (row: OutreachRow) => {
    const source = sources[row.key];
    if (!source) return false;
    return !(source.kind === 'discount' && isManagedElsewhere(source.promotion));
  };

  const openRow = (row: OutreachRow) => {
    const source = sources[row.key];
    if (!source || !isRowEditable(row)) return;
    if (source.kind === 'discount') openComposer('discount', source.promotion);
    else if (source.kind === 'event') openComposer('event', source.perk);
    else openComposer('vote', source.round);
  };

  const newOutreachButton = (
    <>
      <Button
        variant="contained"
        size="small"
        startIcon={<AddIcon />}
        aria-haspopup="menu"
        aria-expanded={menuAnchor !== null}
        aria-controls={menuAnchor !== null ? NEW_OUTREACH_MENU_ID : undefined}
        onClick={(e) => setMenuAnchor(e.currentTarget)}
      >
        New outreach
      </Button>
      <Menu id={NEW_OUTREACH_MENU_ID} anchorEl={menuAnchor} open={menuAnchor !== null} onClose={() => setMenuAnchor(null)}>
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
                      // The chip renders as role="button"; without this, which
                      // filter is on is carried by colour alone.
                      aria-pressed={selected}
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

          {visibleRows.map((row, index) => {
            const source = sources[row.key];
            const chip = statusChip(row.status);
            const editable = isRowEditable(row);
            return (
              // Clicking the row opens its composer — a pointer shortcut, not
              // the only way in. It is deliberately NOT `role="button"` with a
              // tabIndex: the row already contains real buttons, and a button
              // holding buttons is read out by a screen reader as one control
              // whose label is every word in the row. The Edit control inside
              // does exactly the same thing and is properly focusable, so the
              // keyboard path is the one that is already there.
              //
              // THE DIVIDER LIVES HERE, NOT ON `ListRow`. ListRow draws its own
              // hairline with `borderTop` + `&:first-of-type { borderTop: 0 }`,
              // which works only while the rows are siblings. Inside this
              // wrapper its root is the only `div`, so it is always
              // first-of-type and always resolves to 0 — every hairline in the
              // table would silently disappear, and no gate here can see a CSS
              // selector that stopped matching. The wrapper draws it instead,
              // skipping the first row so it does not double up with the
              // filter strip's own bottom border.
              <Box
                key={row.key}
                onClick={() => openRow(row)}
                sx={{
                  // A row that opens nothing does not offer to: a managed
                  // welcome rule keeps the row and loses the affordance.
                  cursor: editable ? 'pointer' : 'default',
                  borderTop: index === 0 ? 0 : '1px solid',
                  borderColor: 'grey.100',
                  ...(editable ? { '&:hover': { bgcolor: 'grey.50' } } : null)
                }}
              >
                <ListRow
                  title={row.title}
                  body={rowBody(row)}
                  aside={
                    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                      {row.fromRecommendation && <Chip size="small" variant="outlined" label={SUGGESTED_CHIP_LABEL} />}
                      <Chip size="small" label={chip.label} color={chip.color} variant={chip.variant} />
                    </Stack>
                  }
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

          {truncationResult.truncated && (
            <Box sx={{ px: '14px', py: '10px', borderTop: '1px solid', borderColor: 'grey.100' }}>
              {/* "150 of 214 loaded", not "Showing 150 of 214": these are the
                  rows FETCHED, and the filters above can leave three of them
                  on screen. */}
              <Typography sx={{ fontSize: '0.8125rem', color: 'text.disabled' }}>{truncationLabel(truncationResult)}</Typography>
            </Box>
          )}
        </Panel>
      </Stack>

      {composer && <OutreachComposer open kind={composer.kind} existing={composer.existing} onClose={() => setComposer(null)} />}
    </>
  );
}

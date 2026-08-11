// views/inventory/FindSize.tsx
//
// THE COUNTER TOOL. Someone is standing at the till with a customer holding a
// garment, and the whole screen exists to answer "do you have this in a 32,
// and where?" in one scan. Opened twenty times a day; every decision below
// optimises for that half-minute.
//
// WHAT THE COMPONENT DOES AND DOES NOT DO
//   All grid math, availability sentences, cascade rules and query building
//   live in ./sizing.ts (pure, tested); the one network call lives in
//   api/inventoryLookup.api.ts. This file only orchestrates: focus, debounce,
//   request sequencing, and drawing what sizing.ts computed.
//
// ENTRY MODES (sizing.ts::submissionPlan is the rule, this file just walks it)
//   - Enter (a wedge scan, or a deliberate submit) tries barcode → sku → q,
//     stopping at the first hit. Only a barcode/sku 404 keeps the walk going;
//     any other failure surfaces as an error instead of quietly degrading to a
//     text search that would mask it.
//   - Plain typing debounces straight into a q search: style candidates plus
//     the size-led "Waist 32 — 6 variants" disambiguation lines.
//
// THE ALWAYS-FOCUSED FIELD is StockCountEntry.tsx's technique (inputRef +
// autoFocus + refocus-on-blur + Enter/Tab submit), with its disarm rule
// widened: this screen's "here" picker is a MUI Select whose focus target is
// a div[role=combobox], not an INPUT, so the rule also stands down for
// combobox/listbox focus. Without that, the picker would be impossible to
// open — the scan field would steal focus back on every attempt.
//
// HONESTY RULES, inherited from the module:
//   - A failed request NEVER claims "not stocked" — the error banner says the
//     lookup failed and that this says nothing about stock. Absent data and
//     zero are different sentences everywhere (sizing.ts enforces it per
//     cell; this file only has to not undo it).
//   - Read-only: no write action exists on this screen, and none may be
//     added. `kiosk` renders the same screen without navigation links out.

import { FocusEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  AlertTitle,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { IconBarcode } from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';

import { lookupInventory } from 'api/inventoryLookup.api';

import { parseApiError, statusOf } from './apiErrors';
import LookupGrid from './LookupGrid';
import {
  LookupAttempt,
  LookupCell,
  LookupResolvedResponse,
  LookupResponse,
  LookupSearchResponse,
  advanceCascade,
  buildColorGrids,
  currentAttempt,
  describeAvailability,
  findScannedCell,
  groupSizeMatches,
  isSearchResponse,
  outcomeForStatus,
  startCascade,
  submissionPlan,
  toLookupQuery
} from './sizing';

/** Long enough to let a wedge scanner finish typing, short enough to feel live. */
const SEARCH_DEBOUNCE_MS = 350;

const FAILURE_IS_NOT_A_STOCK_ANSWER =
  'This is a failed request, not a stock answer — the item may well be on the shelf. Check the connection and try again.';

interface SelectedCell {
  cell: LookupCell;
  color: string;
}

export interface FindSizeProps {
  /** Kiosk mode: the identical read-only screen with no navigation links out. */
  kiosk?: boolean;
}

export default function FindSize({ kiosk = false }: FindSizeProps) {
  const [scanValue, setScanValue] = useState('');
  const [focusLock, setFocusLock] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resolved, setResolved] = useState<LookupResolvedResponse | null>(null);
  const [search, setSearch] = useState<LookupSearchResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  /** Set when an Enter walk fell through barcode and sku before landing on q. */
  const [scanMissed, setScanMissed] = useState(false);

  const [hereLocationId, setHereLocationId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedCell | null>(null);

  const scanRef = useRef<HTMLInputElement>(null);
  // Monotonic request sequence: a response only applies if nothing newer was
  // fired after it. Without this, a slow debounced search can land after a
  // scan and overwrite the grid the customer is being shown.
  const seqRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const focusScanner = useCallback(() => {
    setFocusLock(true);
    scanRef.current?.focus();
  }, []);

  /**
   * StockCountEntry's disarm rule, widened for this screen's controls: focus
   * that lands in another input, a textarea, contentEditable, OR a MUI
   * Select/Autocomplete surface (combobox trigger, listbox popup) is the user
   * deliberately operating a control, so the lock stands down. Focus that
   * evaporates (a stray click) comes straight back to the scanner.
   */
  const handleScanBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (!focusLock) return;
    const next = event.relatedTarget as HTMLElement | null;
    const interactive =
      Boolean(next) &&
      (next?.tagName === 'INPUT' ||
        next?.tagName === 'TEXTAREA' ||
        next?.isContentEditable === true ||
        next?.getAttribute('role') === 'combobox' ||
        Boolean(next?.closest?.('[role="listbox"]')));
    if (interactive) {
      setFocusLock(false);
      return;
    }
    scanRef.current?.focus();
  };

  const applyResponse = useCallback((data: LookupResponse, attempt: LookupAttempt, missedScan: boolean) => {
    if (isSearchResponse(data)) {
      setSearch(data);
      setSearchQuery(attempt.value);
      setScanMissed(missedScan);
      setResolved(null);
      setSelected(null);
      return;
    }
    setResolved(data);
    setSearch(null);
    setScanMissed(false);
    // The perspective survives across lookups while it still names a real
    // location; otherwise it snaps back to the company default.
    setHereLocationId((current) => {
      if (current !== null && data.locations.some((location) => location.id === current)) return current;
      return data.locations.find((location) => location.is_default)?.id ?? data.locations[0]?.id ?? null;
    });
  }, []);

  /**
   * Walk one submission plan from sizing.ts, stopping at the first hit. The
   * state machine (what counts as a miss, what settles) is sizing.ts's; this
   * loop only performs the round trips it prescribes.
   */
  const runPlan = useCallback(
    async (attempts: LookupAttempt[]) => {
      if (attempts.length === 0) return;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      const seq = ++seqRef.current;
      setLoading(true);
      setError(null);
      let missedScan = false;
      try {
        let state = startCascade(attempts);
        while (!state.settled) {
          const attempt = currentAttempt(state);
          if (attempt === null) break;
          const query = toLookupQuery(attempt);
          if (query === null) {
            state = advanceCascade(state, 'miss');
            continue;
          }
          let data: LookupResponse | null = null;
          let outcome: ReturnType<typeof outcomeForStatus> = 'error';
          try {
            data = await lookupInventory(query);
            outcome = 'hit';
          } catch (err) {
            outcome = outcomeForStatus(attempt.param, statusOf(err));
            if (outcome === 'error') throw err;
            missedScan = true;
          }
          if (seqRef.current !== seq) return; // superseded mid-walk
          if (outcome === 'hit' && data !== null) applyResponse(data, attempt, missedScan);
          state = advanceCascade(state, outcome);
        }
      } catch (err) {
        if (seqRef.current === seq) setError(parseApiError(err, 'lines').summary);
      } finally {
        if (seqRef.current === seq) setLoading(false);
      }
    },
    [applyResponse]
  );

  const handleChange = (raw: string) => {
    setScanValue(raw);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const plan = submissionPlan(raw, false);
    if (plan.length === 0) {
      // An emptied field cancels the pending search but keeps whatever answer
      // is on screen — a wedge scan clears the field the moment it resolves,
      // and blanking the grid then would snatch the answer away.
      debounceRef.current = null;
      return;
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      runPlan(plan);
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleSubmit = () => {
    const plan = submissionPlan(scanValue, true);
    setScanValue('');
    runPlan(plan);
  };

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  // Layout is entirely sizing.ts's: grids with explicit gaps, extras separated,
  // and the scanned variant located by layout coordinates.
  const grids = useMemo(() => (resolved ? buildColorGrids(resolved.scale, resolved.matrix) : []), [resolved]);
  const scanned = useMemo(() => (resolved ? findScannedCell(grids, resolved.scanned_variant_id) : null), [grids, resolved]);

  // A fresh resolution selects the scanned cell so the answer sentence is on
  // screen before anyone hovers or taps anything.
  useEffect(() => {
    setSelected(scanned ? { cell: scanned.cell, color: scanned.color } : null);
  }, [scanned]);

  const sizeMatchGroups = useMemo(() => (search ? groupSizeMatches(search.size_matches) : []), [search]);

  const answerSentence = selected && resolved ? describeAvailability(selected.cell, hereLocationId, resolved.locations) : null;

  return (
    <Stack spacing={2}>
      <MainCard
        title="Find a size"
        secondary={
          <Stack direction="row" spacing={1} alignItems="center">
            {loading && <CircularProgress size={18} />}
            {!kiosk && (
              <Button size="small" component={RouterLink} to="/inventory/styles">
                Open the catalogue
              </Button>
            )}
          </Stack>
        }
      >
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="flex-start" flexWrap="wrap" useFlexGap>
            <TextField
              inputRef={scanRef}
              autoFocus
              label="Scan a barcode, or type a SKU, name, or size"
              value={scanValue}
              onChange={(event) => handleChange(event.target.value)}
              onKeyDown={(event) => {
                // A keyboard-wedge scanner types the code then sends its
                // terminator — Enter on most, Tab on plenty — so both submit,
                // and preventDefault stops the Tab from also walking focus
                // off the field mid-queue.
                if (event.key !== 'Enter' && event.key !== 'Tab') return;
                event.preventDefault();
                handleSubmit();
              }}
              onFocus={() => setFocusLock(true)}
              onBlur={handleScanBlur}
              sx={{ minWidth: 340 }}
              helperText="A scan answers instantly. Typing searches styles by name, code, brand, or category — and sizes."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconBarcode size={20} />
                  </InputAdornment>
                )
              }}
            />
            {resolved && resolved.locations.length > 1 && (
              <TextField
                select
                label="Here is"
                value={hereLocationId ?? ''}
                onChange={(event) => setHereLocationId(event.target.value || null)}
                sx={{ minWidth: 200 }}
                helperText="The location the answer speaks from."
              >
                {resolved.locations.map((location) => (
                  <MenuItem key={location.id} value={location.id}>
                    {location.name}
                    {location.is_default ? ' (default)' : ''}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <Stack spacing={0.5}>
              <FormControlLabel
                control={<Switch size="small" checked={focusLock} onChange={(event) => setFocusLock(event.target.checked)} />}
                label="Keep the scanner focused"
              />
              <Button size="small" onClick={focusScanner}>
                Resume scanning
              </Button>
            </Stack>
          </Stack>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              <AlertTitle>The lookup failed</AlertTitle>
              {error}
              <Typography variant="caption" component="div" sx={{ mt: 1 }}>
                {FAILURE_IS_NOT_A_STOCK_ANSWER}
              </Typography>
            </Alert>
          )}

          {!resolved && !search && !error && !loading && (
            <Typography variant="body2" color="text.secondary">
              Scan any tag to see the whole style — every size and colour, on hand by location, in transit, and on order with dates.
            </Typography>
          )}
        </Stack>
      </MainCard>

      {search && (
        <MainCard title={`Results for “${searchQuery}”`}>
          <Stack spacing={2}>
            {scanMissed && (
              <Alert severity="info">
                Nothing answers to “{searchQuery}” as a barcode or SKU — these are name and size matches instead.
              </Alert>
            )}

            {sizeMatchGroups.length > 0 && (
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="caption" color="text.secondary">
                  As a size:
                </Typography>
                {sizeMatchGroups.map((group) => (
                  <Tooltip key={`${group.scaleId}-${group.axisIndex}`} title={`On the ${group.scaleName} scale`}>
                    <Chip size="small" variant="outlined" label={group.line} />
                  </Tooltip>
                ))}
              </Stack>
            )}

            {search.results.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No style matches “{searchQuery}” by name, style code, brand, or category.
                {sizeMatchGroups.length > 0 ? ' It is a size, though — scan any tag of a style to see its run.' : ''}
              </Typography>
            ) : (
              <List dense disablePadding>
                {search.results.map((row) => (
                  <ListItemButton key={row.style_id} onClick={() => runPlan([{ param: 'style_id', value: row.style_id }])}>
                    <ListItemText
                      primary={`${row.name}${row.style_code ? ` — ${row.style_code}` : ''}`}
                      secondary={`${row.category || 'Uncategorised'} · ${row.variant_count} variant${row.variant_count === 1 ? '' : 's'}`}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}

            {search.total > search.results.length && (
              <Typography variant="caption" color="text.secondary">
                Showing the first {search.results.length} of {search.total} matches — keep typing to narrow it down.
              </Typography>
            )}
          </Stack>
        </MainCard>
      )}

      {resolved && (
        <MainCard
          title={
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h4">{resolved.style ? resolved.style.name : 'Variant with no style on record'}</Typography>
              {resolved.style?.style_code && <Chip size="small" variant="outlined" label={resolved.style.style_code} />}
              {resolved.style?.category && <Chip size="small" variant="outlined" label={resolved.style.category} />}
              {resolved.scale && (
                <Tooltip title="The size scale governing this style — columns follow its order.">
                  <Chip size="small" color="primary" variant="outlined" label={resolved.scale.name} />
                </Tooltip>
              )}
            </Stack>
          }
        >
          <Stack spacing={2}>
            {answerSentence && selected && (
              <Alert severity="info" icon={false}>
                <AlertTitle>
                  {selected.color || 'No colour'} · {selected.cell.size_key || 'no size'}
                  {selected.cell.sku ? ` · ${selected.cell.sku}` : ''}
                </AlertTitle>
                <Typography variant="h5" component="div">
                  {answerSentence}
                </Typography>
              </Alert>
            )}

            <LookupGrid
              grids={grids}
              scale={resolved.scale}
              locations={resolved.locations}
              hereLocationId={hereLocationId}
              selectedVariantId={selected?.cell.variant_id ?? null}
              scrollToVariantId={resolved.scanned_variant_id}
              onSelect={(cell, color) => setSelected({ cell, color })}
            />

            <Divider />
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="caption" color="text.secondary">
                Cells:
              </Typography>
              <Chip size="small" sx={{ bgcolor: 'success.light', color: 'success.dark', fontWeight: 700 }} label="3 = in stock" />
              <Chip size="small" sx={{ bgcolor: 'error.light', color: 'error.dark', fontWeight: 700 }} label="0 = none anywhere" />
              <Chip size="small" sx={{ bgcolor: 'action.disabledBackground', fontStyle: 'italic' }} label="— = stock unknown" />
              <Chip size="small" variant="outlined" label="blank = not made" />
              <Chip size="small" variant="outlined" label="+ = more in transit or on order" />
              <Typography variant="caption" color="text.secondary">
                Hover or tap any cell for the full answer. Numbers are totals across locations.
              </Typography>
            </Stack>
          </Stack>
        </MainCard>
      )}
    </Stack>
  );
}

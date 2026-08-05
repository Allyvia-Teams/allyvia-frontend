// views/inventory/StockCountList.tsx
//
// Stocktakes: the list, and the form that opens one.
//
// NOT NAMED StockCounts.tsx, AND IT CANNOT BE. The logic module beside it is
// `stockCounts.ts`, and on a case-insensitive filesystem those two names are the same
// module path: `import X from './StockCounts'` resolves to the LOGIC module (TS tries
// .ts before .tsx) and fails with "has no default export", while TypeScript's wildcard
// include drops the lower-priority .tsx from the program altogether — so the component
// would silently never be type-checked and the route would import a module with no
// component in it. Proven with `tsc --listFiles`: under the colliding name this file
// was absent from the program; renamed, it appears. Anything in this folder that pairs
// a component with a same-named logic module must differ by more than its extension.
//
// ONE COMPONENT SERVES TWO ROUTES. /inventory/stock-counts is the list and
// /inventory/stock-counts/new is the list with the create dialog open, because the
// dialog's entire state is "am I open" and the URL already carries that. A separate
// component would duplicate the location fetch, the category derivation and the
// style picker that the form needs, and would then have to fetch them again on
// cancel; closing the dialog navigates back to the list instead of flipping a flag.
//
// THE SNAPSHOT RULE IS EXPLAINED HERE and not only on the variance report, because
// this is the screen where the expectation is set. Pressing Create freezes an
// expected quantity per line, and the narrower the scope chosen here the fewer
// shelves that freeze covers.
//
// Every guard on the form comes from stockCounts.ts. Three of them are crash
// prevention rather than taste (a non-object scope_filter, a non-UUID product id and
// a malformed location id are all 500s), and the fourth stops a silent wrong answer:
// a category scope with no category selected does not fail — the backend skips the
// filter and stocktakes the whole location while the user believes they scoped one
// rail.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material';
import { IconPlus, IconRefresh } from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';

import { useSelector } from 'store';

import { Location, Product, listLocations, listProducts } from 'api/inventoryStock.api';
import { createStockCount, listStockCounts } from 'api/inventoryTransfers.api';

import { parseApiError } from './apiErrors';
import {
  COUNT_SCOPES,
  COUNT_STATUSES,
  CountDraft,
  CountScope,
  CountStatus,
  EXPECTED_SNAPSHOT_NOTE,
  NON_ADMIN_NOTICE,
  NormalizedCount,
  countStatusColor,
  countStatusLabel,
  describeCountScope,
  emptyCountDraft,
  normalizeCountResponse,
  toCountCreatePayload,
  toCountListQueryString,
  validateCountDraft
} from './stockCounts';
import { formatQuantity, formatUnitCost } from './stockFormat';

const SCOPE_LABELS: Record<CountScope, string> = {
  all: 'Everything at this location',
  category: 'One category',
  filter: 'A narrower filter'
};

export default function StockCountList() {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  // The create form is a route, not a flag — see the header note.
  const creating = routeLocation.pathname.endsWith('/new');

  const roleType = useSelector((state) => state.auth.currentRole?.role_type);
  // The backend gate is `Role.is_admin`, which is `role_type == "admin"` exactly —
  // role.RoleType has only admin and member, so there is no manager tier to admit.
  // Compared lower-cased because lib/session.ts stores a capitalised 'Member' while
  // the API sends lower case, and a casing mismatch here would offer a floor counter
  // buttons that answer 403.
  const isAdmin = String(roleType ?? '').toLowerCase() === 'admin';

  const [counts, setCounts] = useState<NormalizedCount[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [statuses, setStatuses] = useState<CountStatus[]>([]);
  const [locationFilter, setLocationFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<CountDraft>(emptyCountDraft());
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [countBody, locationRows] = await Promise.all([
        // A query STRING, not a params object: the backend reads
        // request.GET.getlist("status") and axios would serialise an array as
        // `status[]=open`, which that call ignores — the filter would look broken
        // by returning every count. The builder also drops the '' location
        // sentinel, which would otherwise be a 500.
        listStockCounts(toCountListQueryString({ statuses, locationId: locationFilter })),
        listLocations()
      ]);
      setCounts(normalizeCountResponse(countBody).counts);
      setLocations(locationRows);
      setError(null);
    } catch (err) {
      setError(parseApiError(err).summary);
    } finally {
      setLoading(false);
    }
  }, [statuses, locationFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!creating) return;
    setDraft(emptyCountDraft());
    setCreateError(null);
    setTouched(false);
  }, [creating]);

  // The catalogue is only needed by the form, so it is fetched when the form opens
  // and kept afterwards. It supplies both the category list and the style picker —
  // there is no endpoint that returns categories on their own.
  useEffect(() => {
    if (!creating || products.length > 0) return;
    let cancelled = false;
    setProductsLoading(true);
    listProducts()
      .then((rows) => {
        if (!cancelled) setProducts(rows);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [creating, products.length]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    products.forEach((product) => {
      const category = (product.category || '').trim();
      if (category) seen.add(category);
    });
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const validation = validateCountDraft(draft);
  const payload = useMemo(() => toCountCreatePayload(draft), [draft]);
  // toCountCreatePayload reports 'all' when a narrowed scope's filter came out empty,
  // because that is what the server is going to do regardless. Surfacing the
  // downgrade before the snapshot is taken is the whole point of knowing about it.
  const scopeDowngraded = payload.scope !== draft.scope;

  const closeCreate = () => navigate('/inventory/stock-counts');

  const submitCreate = async () => {
    setTouched(true);
    if (!validation.valid) return;
    setBusy(true);
    setCreateError(null);
    try {
      const created = normalizeCountResponse(await createStockCount(payload)).count;
      if (!created) {
        // An envelope we do not recognise: the count may well exist, so reload the
        // list rather than claim a failure.
        await load();
        closeCreate();
        return;
      }
      // The create response carries NO lines, so there is nothing to hand over
      // except the id — the scanner screen fetches the detail itself.
      navigate(`/inventory/stock-counts/${created.id}`);
    } catch (err) {
      setCreateError(parseApiError(err).summary);
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = (status: CountStatus) =>
    setStatuses((current) => (current.includes(status) ? current.filter((entry) => entry !== status) : [...current, status]));

  // An open count goes to the scanner; anything else goes to the variance report,
  // which is the only screen that reads at every status.
  const openCount = (count: NormalizedCount) =>
    navigate(count.status === 'open' ? `/inventory/stock-counts/${count.id}` : `/inventory/stock-counts/${count.id}/review`);

  const setScopeFilter = (patch: Partial<CountDraft['scopeFilter']>) =>
    setDraft((current) => ({ ...current, scopeFilter: { ...current.scopeFilter, ...patch } }));

  return (
    <Stack spacing={2}>
      <MainCard
        title="Stocktakes"
        secondary={
          <Stack direction="row" spacing={1} alignItems="center">
            {loading && <CircularProgress size={18} />}
            <Tooltip title="Reload">
              <IconButton size="small" onClick={load}>
                <IconRefresh size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title={isAdmin ? 'Snapshots expected quantities and opens a count' : NON_ADMIN_NOTICE}>
              <span>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<IconPlus size={16} />}
                  disabled={!isAdmin}
                  onClick={() => navigate('/inventory/stock-counts/new')}
                >
                  New count
                </Button>
              </span>
            </Tooltip>
          </Stack>
        }
      >
        <Stack spacing={2}>
          {!isAdmin && <Alert severity="info">{NON_ADMIN_NOTICE}</Alert>}

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            {COUNT_STATUSES.map((status) => (
              <Chip
                key={status}
                size="small"
                label={countStatusLabel(status)}
                color={statuses.includes(status) ? countStatusColor(status) : 'default'}
                variant={statuses.includes(status) ? 'filled' : 'outlined'}
                onClick={() => toggleStatus(status)}
              />
            ))}
            <TextField
              select
              size="small"
              label="Location"
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">All locations</MenuItem>
              {locations.map((location) => (
                <MenuItem key={location.id} value={location.id}>
                  {location.name}
                  {location.is_default ? ' (default)' : ''}
                </MenuItem>
              ))}
            </TextField>
            <Box flexGrow={1} />
            {(statuses.length > 0 || locationFilter) && (
              <Button
                size="small"
                onClick={() => {
                  setStatuses([]);
                  setLocationFilter('');
                }}
              >
                Clear filters
              </Button>
            )}
          </Stack>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Count</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Scope</TableCell>
                  <TableCell align="right">Counted</TableCell>
                  <TableCell align="right">Variances</TableCell>
                  <TableCell align="right">Cost impact</TableCell>
                  <TableCell>Opened by</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {counts.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Typography variant="body2" color="text.secondary">
                        No stocktakes match these filters.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {counts.map((count) => (
                  <TableRow key={count.id} hover sx={{ cursor: 'pointer' }} onClick={() => openCount(count)}>
                    <TableCell>
                      <Typography variant="body2">{count.reference}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" color={countStatusColor(count.status)} label={count.status_label} />
                    </TableCell>
                    <TableCell>{count.location_name}</TableCell>
                    <TableCell>
                      <Typography variant="caption">{describeCountScope(count)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      {/* An absent summary is an em dash, not 0 of 0 — the list
                          envelope is allowed to omit it. */}
                      {count.summary ? `${count.summary.counted_lines} / ${count.summary.total_lines}` : '—'}
                    </TableCell>
                    <TableCell align="right">{count.summary ? formatQuantity(count.summary.lines_with_variance) : '—'}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Lines whose item has no cost on record are silently left out of this figure. The variance report says how many.">
                        <span>{formatUnitCost(count.summary?.net_cost_impact ?? null)}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{count.created_by_email || '—'}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </MainCard>

      <Dialog open={creating} onClose={closeCreate} maxWidth="sm" fullWidth>
        <DialogTitle>Open a stocktake</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {/* Reachable by URL even for a role that cannot create, so the reason is
                said here too rather than only on the list behind it. */}
            {!isAdmin && <Alert severity="warning">{NON_ADMIN_NOTICE}</Alert>}

            <Alert severity="info" icon={false}>
              {EXPECTED_SNAPSHOT_NOTE}
            </Alert>

            <TextField
              select
              label="Location"
              value={draft.locationId ?? ''}
              onChange={(event) => setDraft({ ...draft, locationId: event.target.value || null })}
              error={touched && Boolean(validation.errors.locationId)}
              helperText={
                (touched && validation.errors.locationId) ||
                'Stock is held per location, so a count measures one of them. Leave unset to use the default.'
              }
            >
              {/* '' is turned back into null on the way in: the payload builder omits
                  a blank location rather than sending one, because a malformed
                  location_id is a 500 on this endpoint. */}
              <MenuItem value="">Default location</MenuItem>
              {locations.map((location) => (
                <MenuItem key={location.id} value={location.id}>
                  {location.name}
                  {location.is_default ? ' (default)' : ''}
                </MenuItem>
              ))}
            </TextField>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                What to count
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={draft.scope}
                onChange={(_event, scope) => scope && setDraft({ ...draft, scope: scope as CountScope })}
              >
                {COUNT_SCOPES.map((scope) => (
                  <ToggleButton key={scope} value={scope}>
                    {SCOPE_LABELS[scope]}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            {draft.scope !== 'all' && (
              <TextField
                select
                label="Category"
                value={draft.scopeFilter.category ?? ''}
                onChange={(event) => setScopeFilter({ category: event.target.value })}
                error={touched && Boolean(validation.errors.scope)}
                helperText={
                  (touched && validation.errors.scope) || (productsLoading ? 'Loading categories…' : 'Taken from the style catalogue.')
                }
              >
                <MenuItem value="">Any category</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {draft.scope === 'filter' && (
              <>
                <TextField
                  label="Name or SKU contains"
                  value={draft.scopeFilter.search ?? ''}
                  onChange={(event) => setScopeFilter({ search: event.target.value })}
                  helperText="Matches the item name or SKU."
                />
                <Autocomplete
                  options={products}
                  loading={productsLoading}
                  getOptionLabel={(product) => `${product.name}${product.style_code ? ` · ${product.style_code}` : ''}`}
                  value={products.find((product) => product.id === draft.scopeFilter.productId) ?? null}
                  onChange={(_event, product) => setScopeFilter({ productId: product?.id ?? '' })}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="One style"
                      error={touched && Boolean(validation.errors.productId)}
                      helperText={(touched && validation.errors.productId) || 'Counts every variant of a single style.'}
                    />
                  )}
                />
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={draft.scopeFilter.withStockOnly ?? false}
                      onChange={(event) => setScopeFilter({ withStockOnly: event.target.checked })}
                    />
                  }
                  label="Only items the system thinks are in stock"
                />
                <Typography variant="caption" color="text.secondary">
                  Restricting to items with stock means a shelf holding something the system records as zero will not be in the count, so
                  that surplus stays invisible. Leave it off for a full stocktake.
                </Typography>
              </>
            )}

            <TextField
              label="Reference"
              value={draft.reference}
              onChange={(event) => setDraft({ ...draft, reference: event.target.value })}
              error={touched && Boolean(validation.errors.reference)}
              helperText={(touched && validation.errors.reference) || 'Optional — one is allocated (SC-000001) if you leave it blank.'}
            />

            <TextField
              label="Notes"
              multiline
              minRows={2}
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
            />

            {scopeDowngraded && (
              <Alert severity="warning">
                Nothing has been narrowed, so this will count every item at the location. The backend skips a filter it cannot find, and it
                would record the count as scoped when it was not.
              </Alert>
            )}

            {createError && <Alert severity="error">{createError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCreate} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={submitCreate} disabled={busy || !isAdmin}>
            {busy ? 'Opening…' : 'Open count'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

// views/inventory/QuickBooksPosting.tsx
//
// The settings screen for QuickBooks write-back: connection, the on/off switch,
// and the eleven account mappings the composers post through.
//
// THE ONE THING TO READ BEFORE CHANGING ANYTHING HERE: this screen is the last
// gate before software starts writing journal entries into a real company's
// general ledger, and NO SANDBOX ROUND-TRIP HAS EVER BEEN RUN from this
// codebase. Every QuickBooks HTTP call in the test suite is mocked, which proves
// the composition and nothing about the wire. That is stated on screen, at the
// top, as `ENABLE_CHECKLIST` — not buried in a tooltip — because the operator
// enabling this is the only person who can find out before a customer does.
//
// HOW IT STAYS HONEST:
//
//   * IT NEVER OFFERS AN ACTION THE SERVER WILL REFUSE. `toggleGate` mirrors the
//     backend's fail-closed check, so the switch is disabled with the missing
//     purposes NAMED rather than enabled into a 409. Disabling, by contrast, is
//     always allowed — switching off must not be blocked by the state that made
//     you want to switch off.
//
//   * MAPPED-BUT-DELETED IS ITS OWN STATE. `QBAccountMapping.qb_account` is
//     SET_NULL and the QuickBooks webhook HARD-DELETES QBAccount rows, so a
//     mapping can sit there looking mapped with nothing on the end of it. It
//     fails the completeness check and it renders in error tone with its own
//     banner: the operator did choose an account, and the fix is to learn their
//     chart of accounts changed underneath them.
//
//   * CREATING ACCOUNTS SHOWS THE PLAN FIRST. `create-missing` writes into a
//     customer's chart of accounts, so the button runs `dry_run` and puts
//     "which accounts would be created" on screen before the real call is
//     offered. The dry run is about consent, not safety.
//
//   * ACCEPT-ALL SAYS HOW MANY ROWS IT WILL CHANGE, and never silently
//     overwrites a mapping a human set — `planAcceptAll` skips those, and
//     repairs a deleted one because that is a broken row rather than a choice.
//
// The connection itself is NOT rebuilt here. `/integrations/quickbooks` owns
// OAuth, token refresh and disconnect; this screen reads the connection flags and
// links there.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import {
  Alert,
  AlertTitle,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
  Tooltip,
  Typography
} from '@mui/material';
import { IconExternalLink, IconRefresh } from '@tabler/icons-react';

import AllyviaChip from 'ui-component/common/AllyviaChip';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import MainCard from 'ui-component/cards/MainCard';

import { useSelector } from 'store';

import { Location, listLocations } from 'api/inventoryStock.api';
import {
  createMissingPostingAccounts,
  getMappingSuggestions,
  getPostingSettings,
  savePostingMappings,
  setPostingEnabled
} from 'api/qbPosting.api';

import QbDayDrilldown from './QbDayDrilldown';
import {
  CreateMissingResponse,
  ENABLE_CHECKLIST,
  MappingSuggestion,
  NON_ADMIN_QB_NOTICE,
  PostingSettings,
  QBAccountRef,
  SuggestionsResponse,
  createActionLabel,
  deletedAccountRows,
  describeCreateMissing,
  describeToggleTarget,
  filterAccounts,
  groupAccounts,
  isoDateOf,
  kindReadiness,
  mappingRows,
  parseMappingConflict,
  postingKindLabel,
  planAcceptAll,
  purposeLabel,
  singleMappingPayload,
  toggleGate
} from './qbPosting';

/**
 * The existing QuickBooks OAuth surface (`MainRoutes.tsx` →
 * `views/integrations/QuickBooks.tsx`). Linked, not reimplemented: connect,
 * token refresh and disconnect all live there, and a second implementation of
 * OAuth is a second thing to get wrong.
 */
const QB_CONNECTION_PATH = '/integrations/quickbooks';

/** Yesterday, in the BROWSER'S calendar. */
const defaultPreviewDay = (): string => {
  // Calendar arithmetic, not `Date.now() - 86_400_000`: subtracting 24 hours
  // across a spring-forward lands on the day before yesterday, and this default
  // is the day the operator is asked to inspect before enabling anything.
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return isoDateOf(date);
};

const suggestionFor = (suggestions: SuggestionsResponse | null, purpose: string): MappingSuggestion | null =>
  suggestions?.suggestions?.find((row) => String(row.purpose) === purpose) ?? null;

export interface QuickBooksPostingProps {
  /**
   * Route to the posting log, if the parent has one mounted. Passed in rather
   * than hard-coded: the routes are the parent's to own, and a link built from a
   * guessed path is a dead link.
   */
  logHref?: string | null;
}

export default function QuickBooksPosting({ logHref = null }: QuickBooksPostingProps) {
  const roleType = useSelector((state) => state.auth.currentRole?.role_type);
  // `Role.is_admin` is `role_type == "admin"` exactly; the value is stored
  // capitalised in one place and lower-cased in another, so it is compared folded.
  const isAdmin = String(roleType ?? '').toLowerCase() === 'admin';

  const [settings, setSettings] = useState<PostingSettings | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  /** Purposes the server named in a refusal, highlighted in the panel. */
  const [flagged, setFlagged] = useState<string[]>([]);

  const [acceptOpen, setAcceptOpen] = useState(false);
  const [createPlan, setCreatePlan] = useState<CreateMissingResponse | null>(null);
  const [createResult, setCreateResult] = useState<CreateMissingResponse | null>(null);

  const [previewLocation, setPreviewLocation] = useState('');
  const [previewDate, setPreviewDate] = useState(defaultPreviewDay);
  const [previewOpen, setPreviewOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsBody, suggestionBody, locationRows] = await Promise.all([
        getPostingSettings(),
        // Nothing is saved by asking; this call also carries the chart of
        // accounts the dropdowns need.
        getMappingSuggestions(),
        listLocations()
      ]);
      // Cast at the transport boundary. Every reader in qbPosting.ts tolerates a
      // missing field, so a payload that gains a key still renders.
      setSettings(settingsBody as PostingSettings);
      setSuggestions(suggestionBody as SuggestionsResponse);
      setLocations(locationRows);
      setError(null);
    } catch (err) {
      setError(parseMappingConflict(err).summary);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (previewLocation || locations.length === 0) return;
    setPreviewLocation((locations.find((location) => location.is_default) ?? locations[0]).id);
  }, [locations, previewLocation]);

  const gate = toggleGate(settings);
  const rows = useMemo(() => mappingRows(settings), [settings]);
  const deleted = useMemo(() => deletedAccountRows(settings), [settings]);
  const readiness = useMemo(() => kindReadiness(settings), [settings]);
  const plan = useMemo(() => planAcceptAll(suggestions, settings), [suggestions, settings]);

  /**
   * The dropdown's options for one row.
   *
   * Flattened by group so MUI's `groupBy` sees each account type contiguously,
   * preserving the server's account_type-then-name order rather than re-sorting.
   *
   * THE CURRENTLY-MAPPED ACCOUNT IS FOLDED IN even when the chart omits it. The
   * suggestions endpoint returns `active=True` accounts only, and deactivating an
   * account in QuickBooks (which is NOT deleting it — deleting nulls the mapping
   * and lands in `account_deleted`) leaves a perfectly valid mapping pointing at
   * something the list does not contain. Without this the box would show a value
   * MUI considers invalid, and the operator would see a name they cannot find in
   * the list and cannot re-select after opening it.
   */
  const optionsFor = useCallback(
    (account: QBAccountRef | null): QBAccountRef[] => {
      const chart = suggestions?.accounts ?? [];
      const present = account !== null && chart.some((row) => row.id === account.id);
      const pool = account && !present ? [...chart, account] : chart;
      return groupAccounts(pool).flatMap((group) => group.accounts);
    },
    [suggestions]
  );

  /** Read a refusal into the same per-purpose shape the panel renders. */
  const takeRefusal = (err: unknown) => {
    const conflict = parseMappingConflict(err);
    const named = conflict.purposes.map((entry) => `${entry.label} (${entry.reason.replace(/_/g, ' ')})`).join(', ');
    setRefusal(named ? `${conflict.summary} ${named}.` : conflict.summary);
    setFlagged(conflict.missingPurposes.map(String));
  };

  const toggle = async (next: boolean) => {
    // The gate is checked BEFORE the request: the server refuses an enable with
    // missing mappings, and being told which mapping to fix beats a conflict.
    const decision = describeToggleTarget(settings, next);
    setNotice(null);
    setRefusal(null);
    if (!decision.allowed) {
      setRefusal(decision.reason);
      setFlagged(decision.missingPurposes);
      return;
    }
    setBusy(true);
    try {
      setSettings((await setPostingEnabled(next)) as PostingSettings);
      setFlagged([]);
      setNotice(next ? 'QuickBooks posting is on. The nightly run will post the previous close-of-day.' : decision.reason);
    } catch (err) {
      takeRefusal(err);
    } finally {
      setBusy(false);
    }
  };

  const saveMappings = async (mappings: Record<string, string | null>, successNote: string) => {
    setBusy(true);
    setNotice(null);
    setRefusal(null);
    try {
      // ALL OR NOTHING server-side: one bad row saves none of them, and the 400
      // names the purpose rather than the position.
      setSettings((await savePostingMappings(mappings)) as PostingSettings);
      // `already_mapped` on every suggestion is now stale, and accept-all reads it.
      setSuggestions((await getMappingSuggestions()) as SuggestionsResponse);
      setFlagged([]);
      setNotice(successNote);
    } catch (err) {
      takeRefusal(err);
    } finally {
      setBusy(false);
    }
  };

  const runCreateMissing = async (dryRun: boolean) => {
    setBusy(true);
    setNotice(null);
    setRefusal(null);
    try {
      const response = (await createMissingPostingAccounts({ dryRun })) as CreateMissingResponse;
      if (dryRun) {
        setCreatePlan(response);
        setCreateResult(null);
      } else {
        setCreateResult(response);
        setCreatePlan(null);
        await load();
      }
    } catch (err) {
      setCreatePlan(null);
      takeRefusal(err);
    } finally {
      setBusy(false);
    }
  };

  const connection = settings?.quickbooks;
  const canWrite = isAdmin && !busy;

  return (
    <>
      <Stack spacing={2}>
        {/* Rule 4 of the session brief, and the first thing on the page. */}
        <Alert severity="warning">
          <AlertTitle>No QuickBooks sandbox round-trip has ever been run from this codebase</AlertTitle>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Every QuickBooks call in the automated tests is mocked. That proves the entries are composed and balanced; it proves nothing
            about how QuickBooks answers. Before switching this on for a real company, in this order:
          </Typography>
          <Stack component="ol" spacing={0.5} sx={{ pl: 3, m: 0 }}>
            {ENABLE_CHECKLIST.map((step) => (
              <Typography key={step} component="li" variant="body2">
                {step}
              </Typography>
            ))}
          </Stack>
          <Typography variant="caption" component="div" sx={{ mt: 1 }}>
            Step 3 is a server-side command:{' '}
            <Box component="code" sx={{ px: 0.5, py: 0.25, bgcolor: 'action.hover', borderRadius: 0.5 }}>
              manage.py post_qb_daily --company-id &lt;id&gt; --date &lt;day&gt; --dry-run
            </Box>
          </Typography>
        </Alert>

        <MainCard
          title="QuickBooks posting"
          secondary={
            <Stack direction="row" spacing={1} alignItems="center">
              {loading && <CircularProgress size={18} />}
              <Tooltip title="Reload settings, mappings and suggestions">
                <span>
                  <Button size="small" startIcon={<IconRefresh size={16} />} onClick={load}>
                    Reload
                  </Button>
                </span>
              </Tooltip>
              {logHref && (
                <Button size="small" component={RouterLink} to={logHref}>
                  Posting log
                </Button>
              )}
            </Stack>
          }
        >
          <Stack spacing={2}>
            <Typography variant="caption" color="text.secondary">
              Allyvia is the source of truth; QuickBooks is the ledger it populates. Each night, per location, one journal entry summarises
              the day&apos;s sales and one records cost of goods sold from the stock ledger; each Stripe payout becomes a deposit. Per-item
              quantities are never sent — QuickBooks&apos; own inventory tracking would double-count the cost we already post.
            </Typography>

            {!isAdmin && <Alert severity="info">{NON_ADMIN_QB_NOTICE}</Alert>}

            {error && (
              <Alert
                severity="warning"
                action={
                  <Button size="small" color="inherit" onClick={load}>
                    Retry
                  </Button>
                }
              >
                {error} Nothing below reflects the server until this loads.
              </Alert>
            )}

            {refusal && <Alert severity="error">{refusal}</Alert>}
            {notice && <Alert severity="success">{notice}</Alert>}

            {/* ---------------------------------------------------------------
                Connection — read here, managed on the integrations screen.
            --------------------------------------------------------------- */}
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="h5">Connection</Typography>
                  <AllyviaChip
                    size="small"
                    color={connection?.connected ? 'success' : 'error'}
                    label={connection?.connected ? 'Connected' : 'Not connected'}
                  />
                  {connection?.connected && (
                    <>
                      <AllyviaChip
                        size="small"
                        variant="outlined"
                        color={connection.access_token_valid ? 'success' : 'warning'}
                        label={connection.access_token_valid ? 'Access token valid' : 'Access token expired'}
                      />
                      <AllyviaChip
                        size="small"
                        variant="outlined"
                        color={connection.refresh_token_valid ? 'success' : 'error'}
                        label={connection.refresh_token_valid ? 'Refresh token valid' : 'Refresh token expired'}
                      />
                    </>
                  )}
                  <Box flexGrow={1} />
                  <Button
                    size="small"
                    variant="outlined"
                    component={RouterLink}
                    to={QB_CONNECTION_PATH}
                    endIcon={<IconExternalLink size={14} />}
                  >
                    Manage connection
                  </Button>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {connection?.realm_id ? `QuickBooks company (realm) ${connection.realm_id}. ` : ''}
                  Connecting, refreshing and disconnecting all happen on the QuickBooks integration screen. An expired refresh token means
                  nothing can post until somebody reconnects there.
                </Typography>
              </Stack>
            </Box>

            {/* ---------------------------------------------------------------
                The switch, and what it is gated on.
            --------------------------------------------------------------- */}
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Box sx={{ flex: '1 1 320px' }}>
                    <Typography variant="h5">Post to QuickBooks nightly</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {gate.sentence}
                    </Typography>
                  </Box>
                  <Tooltip
                    title={
                      !isAdmin
                        ? NON_ADMIN_QB_NOTICE
                        : gate.enabled
                          ? 'Switching off is always allowed. Entries already in QuickBooks are left alone.'
                          : gate.sentence
                    }
                  >
                    <span>
                      <Switch
                        checked={gate.enabled}
                        // Disabled only in the direction the server would refuse:
                        // an operator whose mappings are incomplete can still turn
                        // posting OFF.
                        disabled={!canWrite || (!gate.enabled && !gate.canEnable)}
                        onChange={(event) => toggle(event.target.checked)}
                      />
                    </span>
                  </Tooltip>
                </Stack>

                {gate.blockers.length > 0 && (
                  <Alert severity="warning">
                    <AlertTitle>{gate.blockers.length} required mapping(s) block the switch</AlertTitle>
                    <Stack spacing={0.25}>
                      {gate.blockers.map((blocker) => (
                        <Typography key={String(blocker.purpose)} variant="caption">
                          • {blocker.purpose_label || purposeLabel(String(blocker.purpose))} — {blocker.detail}
                        </Typography>
                      ))}
                    </Stack>
                  </Alert>
                )}

                {(settings?.warnings ?? []).map((warning) => (
                  <Alert key={warning.code} severity="warning">
                    {warning.detail}
                  </Alert>
                ))}

                {deleted.length > 0 && (
                  <Alert severity="error">
                    <AlertTitle>{deleted.length} mapping(s) point at an account that no longer exists in QuickBooks</AlertTitle>
                    {deleted.map((row) => row.label).join(', ')}. These look mapped and are not: QuickBooks deleted the account, the mapping
                    survived with nothing on the end of it, and posting is blocked until another account is chosen.
                  </Alert>
                )}

                <Divider />

                <Stack spacing={0.75}>
                  {readiness.map((kind) => (
                    <Stack key={kind.kind} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <AllyviaChip
                        size="small"
                        color={kind.canPost ? 'success' : kind.mappingsComplete ? 'default' : 'warning'}
                        label={kind.canPost ? 'Will post' : kind.mappingsComplete ? 'Ready, posting off' : 'Blocked'}
                      />
                      <Typography variant="body2">{kind.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {kind.sentence}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            </Box>

            {/* ---------------------------------------------------------------
                The mapping panel.
            --------------------------------------------------------------- */}
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="h5">Account mappings</Typography>
                  <Box flexGrow={1} />
                  <Tooltip title={canWrite ? plan.sentence : NON_ADMIN_QB_NOTICE}>
                    <span>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={!canWrite || plan.changeCount === 0}
                        onClick={() => setAcceptOpen(true)}
                      >
                        {/* Never just "Accept all": the count is the consent. */}
                        Accept {plan.changeCount} suggestion(s)
                      </Button>
                    </span>
                  </Tooltip>
                  <Tooltip
                    title={
                      !canWrite
                        ? NON_ADMIN_QB_NOTICE
                        : !connection?.connected
                          ? 'QuickBooks is not connected, so a plan cannot be built.'
                          : 'Shows exactly which accounts would be created in your chart of accounts before anything is written.'
                    }
                  >
                    <span>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={!canWrite || !connection?.connected}
                        onClick={() => runCreateMissing(true)}
                      >
                        Create missing accounts…
                      </Button>
                    </span>
                  </Tooltip>
                </Stack>

                <Typography variant="caption" color="text.secondary">
                  Eleven purposes, each one an account in your chart of accounts. Required means a posting kind cannot run without it; the
                  rest are used when the data calls for them.
                </Typography>

                <AllyviaEmpty
                  isLoading={loading && settings === null}
                  isEmpty={!loading && rows.length === 0}
                  type="table"
                  skeletonType="table"
                  rows={6}
                  columns={4}
                  title="No mapping rows"
                  description="The settings payload carried no purposes. Reload, or check the QuickBooks connection."
                  showIcon={false}
                  height="auto"
                >
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Purpose</TableCell>
                          <TableCell sx={{ minWidth: 280 }}>QuickBooks account</TableCell>
                          <TableCell>State</TableCell>
                          <TableCell>What it affects</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((row) => {
                          const suggestion = suggestionFor(suggestions, row.purpose);
                          const highlighted = flagged.includes(row.purpose);
                          return (
                            <TableRow
                              key={row.purpose}
                              sx={highlighted ? { outline: '2px solid', outlineColor: 'error.main', outlineOffset: -2 } : undefined}
                            >
                              <TableCell>
                                <Stack spacing={0.25}>
                                  <Typography variant="body2">{row.label}</Typography>
                                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                    {row.required ? (
                                      <Chip size="small" color="primary" variant="outlined" label="Required" />
                                    ) : (
                                      <Chip size="small" variant="outlined" label="Optional" />
                                    )}
                                    {!row.creatable && (
                                      <Chip
                                        size="small"
                                        variant="outlined"
                                        label="Choose manually"
                                        // A bank account cannot be guessed into
                                        // existence; the operator must pick theirs.
                                      />
                                    )}
                                  </Stack>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Autocomplete
                                  size="small"
                                  options={optionsFor(row.account)}
                                  value={row.account}
                                  disabled={!canWrite}
                                  groupBy={(option) => option.account_type?.trim() || 'Other'}
                                  getOptionLabel={(option) => option.fully_qualified_name || option.name}
                                  isOptionEqualToValue={(option, value) => option.id === value.id}
                                  // Our own search, not MUI's label-only default:
                                  // an operator types "stripe", "Bank" or a
                                  // QuickBooks id, and all three should find the row.
                                  filterOptions={(options, state) => filterAccounts(options as QBAccountRef[], state.inputValue)}
                                  onChange={(_event, value) =>
                                    saveMappings(
                                      singleMappingPayload(row.purpose, value?.id ?? null),
                                      value
                                        ? `${row.label} now posts to ${value.fully_qualified_name || value.name}.`
                                        : `${row.label} is no longer mapped.`
                                    )
                                  }
                                  renderInput={(params) => (
                                    <TextField {...params} placeholder={row.state === 'mapped' ? '' : 'Choose an account'} />
                                  )}
                                />
                                {row.account && !row.account.active && (
                                  <Typography variant="caption" color="warning.main">
                                    {/* Inactive is not deleted: the mapping is
                                        intact and passes the completeness check,
                                        so nothing else on this screen flags it. */}
                                    This account is marked inactive in QuickBooks. It is shown because the mapping still points at it, but
                                    it is not offered as a choice and QuickBooks may reject an entry that posts to it.
                                  </Typography>
                                )}
                                {suggestion?.found && suggestion.account && row.state !== 'mapped' && (
                                  <Typography variant="caption" color="text.secondary">
                                    Suggested: {suggestion.account.fully_qualified_name || suggestion.account.name}
                                    {suggestion.why ? ` (${suggestion.why})` : ''}
                                  </Typography>
                                )}
                                {suggestion && !suggestion.found && row.state !== 'mapped' && (
                                  <Typography variant="caption" color="text.secondary">
                                    {/* `found: false` means the chart had nothing
                                        plausible — not that a suggestion is still
                                        loading. */}
                                    Nothing in your chart of accounts matched, so this one needs choosing.
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <AllyviaChip size="small" color={row.tone} label={row.stateLabel} />
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" color={row.state === 'account_deleted' ? 'error.main' : 'text.secondary'}>
                                  {row.detail}
                                </Typography>
                                {row.blockedKinds.length > 0 && (
                                  <Typography variant="caption" color="warning.main" display="block">
                                    Blocking: {row.blockedKinds.map(postingKindLabel).join(', ')}
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AllyviaEmpty>
              </Stack>
            </Box>

            {/* ---------------------------------------------------------------
                Step 2 of the checklist, reachable from the checklist.
            --------------------------------------------------------------- */}
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
              <Stack spacing={1}>
                <Typography variant="h5">Preview a day before you switch anything on</Typography>
                <Typography variant="caption" color="text.secondary">
                  Composes the entries for one location and one day from your own data and shows every line. It works with posting switched
                  off and with mappings incomplete, and it contacts QuickBooks not at all.
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                  <TextField
                    select
                    size="small"
                    label="Location"
                    value={previewLocation}
                    onChange={(event) => setPreviewLocation(event.target.value)}
                    sx={{ minWidth: 220 }}
                  >
                    {locations.map((location) => (
                      <MenuItem key={location.id} value={location.id}>
                        {location.name}
                        {location.is_default ? ' (default)' : ''}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    size="small"
                    type="date"
                    label="Day"
                    value={previewDate}
                    onChange={(event) => setPreviewDate(event.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <Button variant="contained" size="small" disabled={!previewLocation || !previewDate} onClick={() => setPreviewOpen(true)}>
                    Show what would post
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </MainCard>
      </Stack>

      {/* -------------------------------------------------------------------
          Accept-all confirmation: the count, the repairs, and every row.
      ------------------------------------------------------------------- */}
      <Dialog open={acceptOpen} onClose={() => setAcceptOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Accept {plan.changeCount} suggested mapping(s)?</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Typography variant="body2">{plan.sentence}</Typography>
            {plan.changes.map((change) => (
              <Box key={change.purpose}>
                <Typography variant="body2">
                  {change.label} → {change.accountName}
                </Typography>
                <Typography variant="caption" color={change.repairsDeleted ? 'error.main' : 'text.secondary'}>
                  {change.repairsDeleted ? 'Replaces a mapping whose QuickBooks account was deleted. ' : ''}
                  {change.replacesAccountName ? `Replaces ${change.replacesAccountName}. ` : ''}
                  {change.why}
                </Typography>
              </Box>
            ))}
            {plan.skipped.length > 0 && (
              <>
                <Divider />
                <Typography variant="caption" color="text.secondary">
                  Left alone:
                </Typography>
                {plan.skipped.map((skip) => (
                  <Typography key={skip.purpose} variant="caption" color="text.secondary">
                    • {skip.detail}
                  </Typography>
                ))}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAcceptOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!canWrite || plan.changeCount === 0}
            onClick={() => {
              setAcceptOpen(false);
              saveMappings(plan.assignments, `${plan.changeCount} mapping(s) saved from the suggestions.`);
            }}
          >
            Save {plan.changeCount} mapping(s)
          </Button>
        </DialogActions>
      </Dialog>

      {/* -------------------------------------------------------------------
          Create-missing: the DRY RUN is shown first, always. This writes into
          a customer's real chart of accounts.
      ------------------------------------------------------------------- */}
      <Dialog open={createPlan !== null} onClose={() => setCreatePlan(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Create accounts in QuickBooks?</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Alert severity="warning">
              This writes new accounts into the company&apos;s QuickBooks chart of accounts. Nothing has been created yet — the list below
              is a dry run.
            </Alert>
            <Typography variant="body2">{describeCreateMissing(createPlan)}</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Purpose</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Account</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(createPlan?.results ?? []).map((result) => (
                    <TableRow key={result.purpose}>
                      <TableCell>{result.label || purposeLabel(result.purpose)}</TableCell>
                      <TableCell>{createActionLabel(result.action)}</TableCell>
                      <TableCell>{result.account?.fully_qualified_name || result.account?.name || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatePlan(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            disabled={!canWrite || (createPlan?.would_create?.length ?? 0) === 0}
            onClick={() => runCreateMissing(false)}
          >
            Create {createPlan?.would_create?.length ?? 0} account(s)
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createResult !== null} onClose={() => setCreateResult(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Accounts created</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            {/* Past tense only for what actually happened — `describeCreateMissing`
                reads `created`, not `would_create`, when the run was real. */}
            <Typography variant="body2">{describeCreateMissing(createResult)}</Typography>
            {(createResult?.results ?? []).map((result) => (
              <Typography key={result.purpose} variant="caption" color="text.secondary">
                • {result.label || purposeLabel(result.purpose)} — {createActionLabel(result.action)}
                {result.account ? `: ${result.account.fully_qualified_name || result.account.name}` : ''}
              </Typography>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setCreateResult(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <QbDayDrilldown
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        locationId={previewLocation || null}
        date={previewDate || null}
        locationName={locations.find((location) => location.id === previewLocation)?.name ?? null}
      />
    </>
  );
}

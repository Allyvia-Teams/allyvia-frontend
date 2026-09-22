// views/inventory/QbPostingLog.tsx
//
// The QBPosting ledger: every journal entry, COGS journal and payout deposit
// this company has sent to QuickBooks or refused to send, with the recorded
// error and a retry that AMENDS.
//
// FIVE THINGS THIS TABLE IS CAREFUL ABOUT:
//
//   1. RETRY AMENDS, IT DOES NOT DUPLICATE. The executor sends the stored QBO Id
//      and SyncToken as a sparse update, so re-running a posted day changes the
//      entry already in the books rather than creating a second one. The button
//      says so, in `RETRY_AMENDS_NOTE`, because "Retry" on a screen that writes
//      into someone's general ledger reads like "post it again".
//
//   2. THE FAIL-CLOSED GATE IS PREDICTED, NOT DISCOVERED. `assert_can_post` runs
//      first server-side and answers 409 with no HTTP attempted, so `canRetry`
//      tells the operator what to fix instead of handing them a conflict.
//
//   3. A LINK IS ONLY OFFERED WHERE AN OBJECT EXISTS. `qboObjectUrl` returns null
//      for a row with no id or an object type this build has no path for; a dead
//      link on a reconciliation screen reads as "the entry is there" right up
//      until it 404s.
//
//   4. `amended` AND `skipped` ARE NOT `posted` AND NOT FAILURES. Amended is a
//      success that changed something after the fact — amber, because an
//      accountant reconciling that day needs to notice. Skipped means there was
//      nothing to post, which is a normal day and must not be red.
//
//   5. A DROPPED FILTER IS ANNOUNCED. `postingLogQuery` omits a malformed uuid,
//      date or enum rather than sending it, which makes the table show MORE than
//      the pickers claim — `postingLogFilterIssues` is rendered so a company-wide
//      log is never read as one store's.
//
// A payout row's gross/fees/net is shown with the derivation disclosure attached
// and NEVER as reconciled: `fees` is `gross - net`, so the sum proves nothing.

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';

import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Link,
  MenuItem,
  Stack,
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
import { IconChevronDown, IconChevronRight, IconExternalLink, IconRefresh } from '@tabler/icons-react';

import AllyviaChip from 'ui-component/common/AllyviaChip';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import AllyviaPagination from 'ui-component/common/AllyviaPagination';
import MainCard from 'ui-component/cards/MainCard';

import { useSelector } from 'store';

import { Location, listLocations } from 'api/inventoryStock.api';
import { getPostingSettings, listPostings, retryPosting } from 'api/qbPosting.api';

import QbDayDrilldown from './QbDayDrilldown';
import {
  NON_ADMIN_QB_NOTICE,
  POSTING_KINDS,
  POSTING_LOG_DEFAULT_PAGE_SIZE,
  POSTING_STATUSES,
  PostingRow,
  PostingSettings,
  PostingStatus,
  PostingsPage,
  RETRY_AMENDS_NOTE,
  RetryOutcome,
  canRetry,
  describeMissingLink,
  describePostingStatus,
  describeRetryOutcome,
  isUuid,
  parseMappingConflict,
  payoutDisclosure,
  payoutTotalsView,
  postingKindLabel,
  postingLogFilterIssues,
  postingLogQuery,
  postingStatusColor,
  postingStatusLabel,
  qboObjectUrl,
  summarizePostingError
} from './qbPosting';
import { EM_DASH } from './stockFormat';

/**
 * The expanded panel for one row.
 *
 * Everything the ledger recorded, in the words it recorded: the totals snapshot
 * is printed as the payload's own key/value pairs rather than reformatted as
 * currency, because the same dict carries money (`gross`) and counts
 * (`movements_skipped_null_cost`) and a component cannot tell them apart without
 * inventing a vocabulary the backend owns. Where the meaning IS known — a
 * payout's gross/fees/net — `payoutTotalsView` reads it and attaches the
 * derivation disclosure.
 */
const RowDetail = ({
  row,
  settings,
  disclosure,
  isAdmin,
  onRetried
}: {
  row: PostingRow;
  settings: PostingSettings | null;
  disclosure: string;
  isAdmin: boolean;
  onRetried: () => void;
}) => {
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const error = summarizePostingError(row.error);
  const gate = canRetry(row, settings);
  const allowed = gate.allowed && isAdmin;
  const reason = isAdmin ? gate.reason : NON_ADMIN_QB_NOTICE;
  const isPayout = String(row.kind) === 'payout_deposit';
  const payout = isPayout ? payoutTotalsView(row.totals, disclosure) : null;

  // A `<key>_note` in the totals QUALIFIES `<key>`, and the two are shown as one
  // thing rather than as two rows.
  //
  // The case that forced this: the sales summary carries `tips: "0.00"` beside
  // `tips_note` explaining that POSSale has no tip column at all. Printed as a
  // plain row, "tips 0.00" reads as "no tips were taken" — the fabrication this
  // whole feature is written to avoid — and a reader who stops at the number
  // never reaches the sentence. The rule is the payload's own convention, not a
  // special case for tips.
  const totalsMap = row.totals ?? {};
  const noteFor = (key: string): string | null => {
    const note = totalsMap[`${key}_note`];
    return typeof note === 'string' && note.trim() ? note.trim() : null;
  };
  const totalEntries = Object.entries(totalsMap).filter(([key]) => !(key.endsWith('_note') && key.slice(0, -'_note'.length) in totalsMap));

  const run = async (dryRun: boolean) => {
    setBusy(true);
    setOutcome(null);
    setFailure(null);
    try {
      const result = (await retryPosting(row.id, { dryRun })) as RetryOutcome;
      setOutcome(describeRetryOutcome(result));
      onRetried();
    } catch (err) {
      // The 409s carry a code and, for mappings_incomplete, a per-purpose list —
      // the same shape the settings screen renders, so the operator is told which
      // mapping to fix rather than "conflict".
      const conflict = parseMappingConflict(err);
      const named = conflict.purposes.map((entry) => entry.label).join(', ');
      setFailure(named ? `${conflict.summary} Missing: ${named}.` : conflict.summary);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={1.5} sx={{ py: 2 }}>
      <Typography variant="body2">{describePostingStatus(row)}</Typography>

      {row.performed_by_email && (
        <Typography variant="caption" color="text.secondary">
          Last run by {row.performed_by_email}
          {row.trigger ? ` (${row.trigger})` : ''}
        </Typography>
      )}

      {payout && (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Gross captured in the window
                </Typography>
                <Typography variant="h5">{payout.gross}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Stripe fees (DERIVED)
                </Typography>
                <Typography variant="h5">{payout.fees}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Net deposited
                </Typography>
                <Typography variant="h5">{payout.net}</Typography>
              </Box>
            </Stack>
            {/* `payout.reconciled` is hard-coded false in qbPosting.ts because no
                input can make it true. Rendered as text, not a tick. */}
            <Alert severity="warning">
              <AlertTitle>{payout.derivation} — not independently reconciled</AlertTitle>
              {payout.disclosure}
            </Alert>
          </Stack>
        </Box>
      )}

      {totalEntries.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Totals recorded on the posting, verbatim from the payload that was sent
          </Typography>
          <Stack spacing={0.25} sx={{ mt: 0.5 }}>
            {totalEntries.map(([key, value]) => {
              const note = noteFor(key);
              return (
                <Box key={key}>
                  <Typography variant="caption" color={note ? 'warning.main' : 'text.primary'}>
                    <strong>{key}</strong>: {String(value)}
                  </Typography>
                  {note && (
                    <Typography variant="caption" color="warning.main" display="block" sx={{ pl: 1 }}>
                      {note}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}

      {row.notes.length > 0 && (
        <Stack spacing={0.25}>
          {row.notes.map((note) => (
            <Typography key={note} variant="caption" color="text.secondary">
              • {note}
            </Typography>
          ))}
        </Stack>
      )}

      {row.refused && (
        <Alert severity="error">
          <AlertTitle>Refused before posting</AlertTitle>
          {String(row.refused.error ?? 'This posting did not reconcile and was not sent.')}
          {row.refused.discrepancy ? ` Discrepancy: ${String(row.refused.discrepancy)}.` : ''}
        </Alert>
      )}

      {error && (
        <Alert severity="error">
          <AlertTitle>Recorded error</AlertTitle>
          {/* Verbatim, never rewritten: an error an operator forwards to support
              has to be the text we actually recorded. */}
          <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', m: 0 }}>
            {error.full}
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            {error.retryWorthwhile
              ? 'This looks transient, so re-running may succeed.'
              : 'QuickBooks rejected this, so re-running will be rejected again until the cause changes.'}
          </Typography>
        </Alert>
      )}

      {outcome && <Alert severity="success">{outcome}</Alert>}
      {failure && <Alert severity="warning">{failure}</Alert>}

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Tooltip title={allowed ? 'Composes and records the posting without sending anything to QuickBooks.' : reason}>
          <span>
            <Button size="small" variant="outlined" disabled={!allowed || busy} onClick={() => run(true)}>
              Dry-run
            </Button>
          </span>
        </Tooltip>
        <Tooltip title={allowed ? RETRY_AMENDS_NOTE : reason}>
          <span>
            <Button size="small" variant="contained" disabled={!allowed || busy} onClick={() => run(false)}>
              Re-send (amends)
            </Button>
          </span>
        </Tooltip>
        {busy && <CircularProgress size={16} />}
        {!allowed && (
          <Typography variant="caption" color="text.secondary">
            {reason}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
};

export default function QbPostingLog() {
  const roleType = useSelector((state) => state.auth.currentRole?.role_type);
  // `Role.is_admin` is `role_type == "admin"` exactly, and the stored value is
  // capitalised in one place and lower-cased in another — comparing raw would
  // offer a member buttons that answer 403.
  const isAdmin = String(roleType ?? '').toLowerCase() === 'admin';

  const [page, setPage] = useState<PostingsPage | null>(null);
  const [settings, setSettings] = useState<PostingSettings | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drill, setDrill] = useState<{ locationId: string; date: string; locationName: string } | null>(null);

  const [kinds, setKinds] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<PostingStatus[]>([]);
  const [locationId, setLocationId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(POSTING_LOG_DEFAULT_PAGE_SIZE);

  const filters = useMemo(
    () => ({ kinds, statuses, locationId, start, end, page: pageNumber, pageSize }),
    [kinds, statuses, locationId, start, end, pageNumber, pageSize]
  );
  // Every omission the builder made, in words. Without this the table silently
  // shows more than the pickers say it does.
  const issues = useMemo(() => postingLogFilterIssues(filters), [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // A query STRING with repeated keys, not an axios params object: `kind` and
      // `status` are read with request.GET.getlist and axios 1.x would send
      // `kind[]=…`, which that call ignores — the filter would appear to do
      // nothing while returning everything.
      const [body, settingsBody, locationRows] = await Promise.all([
        listPostings(postingLogQuery(filters)),
        getPostingSettings(),
        listLocations()
      ]);
      setPage(body as PostingsPage);
      setSettings(settingsBody as PostingSettings);
      setLocations(locationRows);
      setError(null);
    } catch (err) {
      setPage(null);
      setError(parseMappingConflict(err).summary);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  // Every filter change resets to the first page: page 4 of an unfiltered log is
  // rarely page 4 of a filtered one, and landing past the end of a filtered set
  // renders as "no postings match" when the truth is "not on this page".
  const toggleKind = (kind: string) => {
    setPageNumber(1);
    setKinds((current) => (current.includes(kind) ? current.filter((entry) => entry !== kind) : [...current, kind]));
  };
  const toggleStatus = (status: PostingStatus) => {
    setPageNumber(1);
    setStatuses((current) => (current.includes(status) ? current.filter((entry) => entry !== status) : [...current, status]));
  };
  const setLocationFilter = (value: string) => {
    setPageNumber(1);
    setLocationId(value);
  };
  const setStartFilter = (value: string) => {
    setPageNumber(1);
    setStart(value);
  };
  const setEndFilter = (value: string) => {
    setPageNumber(1);
    setEnd(value);
  };

  const rows = page?.items ?? [];
  const pagination = page?.pagination;
  const disclosure = payoutDisclosure(page);
  const filtered = kinds.length > 0 || statuses.length > 0 || Boolean(locationId) || Boolean(start) || Boolean(end);

  return (
    <>
      <MainCard
        title="QuickBooks posting log"
        secondary={
          <Stack direction="row" spacing={1} alignItems="center">
            {loading && <CircularProgress size={18} />}
            <Tooltip title="Reload">
              <IconButton size="small" onClick={load}>
                <IconRefresh size={18} />
              </IconButton>
            </Tooltip>
          </Stack>
        }
      >
        <Stack spacing={2}>
          <Typography variant="caption" color="text.secondary">
            One row per posting the nightly run produced: a daily sales summary and COGS journal per location, plus a deposit per Stripe
            payout. Re-sending amends the entry already in QuickBooks — it never creates a second one.
          </Typography>

          {!isAdmin && <Alert severity="info">{NON_ADMIN_QB_NOTICE}</Alert>}

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 48 }}>
              Kind
            </Typography>
            {POSTING_KINDS.map((kind) => (
              <Chip
                key={kind}
                size="small"
                label={postingKindLabel(kind)}
                color={kinds.includes(kind) ? 'primary' : 'default'}
                variant={kinds.includes(kind) ? 'filled' : 'outlined'}
                onClick={() => toggleKind(kind)}
              />
            ))}
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 48 }}>
              Status
            </Typography>
            {/* Enumerated from the module, so a chip cannot exist for a status
                `postingLogQuery` would drop — the picker would then say "Amended"
                while the table returned everything. */}
            {POSTING_STATUSES.map((status) => (
              <Chip
                key={status}
                size="small"
                label={postingStatusLabel(status)}
                color={statuses.includes(status) ? postingStatusColor(status) : 'default'}
                variant={statuses.includes(status) ? 'filled' : 'outlined'}
                onClick={() => toggleStatus(status)}
              />
            ))}
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <TextField
              select
              size="small"
              label="Location"
              value={locationId}
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
            <TextField
              size="small"
              type="date"
              label="From"
              value={start}
              onChange={(event) => setStartFilter(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              type="date"
              label="To"
              value={end}
              onChange={(event) => setEndFilter(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <Box flexGrow={1} />
            {filtered && (
              <Button
                size="small"
                onClick={() => {
                  setKinds([]);
                  setStatuses([]);
                  setLocationId('');
                  setStart('');
                  setEnd('');
                  setPageNumber(1);
                }}
              >
                Clear filters
              </Button>
            )}
          </Stack>

          {issues.length > 0 && (
            <Alert severity="warning">
              <AlertTitle>Some filters were not applied</AlertTitle>
              {issues.map((issue) => (
                <Typography key={issue} variant="caption" display="block">
                  • {issue}
                </Typography>
              ))}
            </Alert>
          )}

          {error && (
            <Alert
              severity="warning"
              action={
                <Button size="small" color="inherit" onClick={load}>
                  Retry
                </Button>
              }
            >
              {error} No rows are shown because the request did not come back — that is not the same as nothing having posted.
            </Alert>
          )}

          <AllyviaEmpty
            isLoading={loading && page === null}
            isEmpty={!error && rows.length === 0}
            type="table"
            skeletonType="table"
            rows={6}
            columns={6}
            title={filtered ? 'No postings match these filters' : 'Nothing has posted yet'}
            description={
              filtered
                ? 'Clear the filters to see the whole ledger.'
                : 'The nightly run writes these once QuickBooks posting is switched on for this company. Until then the day drill-down previews what would be sent.'
            }
            showIcon={false}
            height="auto"
          >
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 40 }} />
                    <TableCell>Date</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Kind</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>QuickBooks</TableCell>
                    <TableCell align="right">Attempts</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => {
                    const open = expanded === row.id;
                    const href = qboObjectUrl(row);
                    // Not named `error`: the page-level request failure is called
                    // that, and shadowing it is how the payroll branch shipped an
                    // alert that reported the wrong one.
                    const rowError = summarizePostingError(row.error);
                    return (
                      <Fragment key={row.id}>
                        <TableRow hover>
                          <TableCell>
                            <IconButton size="small" onClick={() => setExpanded(open ? null : row.id)}>
                              {open ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                            </IconButton>
                          </TableCell>
                          <TableCell>{row.posting_date}</TableCell>
                          <TableCell>
                            {/* A payout is company-level and genuinely has no
                                location; the default store would be a guess. */}
                            {row.location_name || (
                              <Tooltip title="Payout deposits are company-level, so they carry no location.">
                                <Typography variant="caption" color="text.secondary">
                                  {EM_DASH}
                                </Typography>
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell>{row.kind_label || postingKindLabel(String(row.kind))}</TableCell>
                          <TableCell>
                            <AllyviaChip
                              size="small"
                              color={postingStatusColor(String(row.status))}
                              label={row.status_label || postingStatusLabel(String(row.status))}
                              tooltipTitle={describePostingStatus(row)}
                            />
                          </TableCell>
                          <TableCell>
                            {href ? (
                              <Tooltip title="Opens this entry in QuickBooks Online (production host).">
                                <Link
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  variant="caption"
                                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                                >
                                  {row.qb_object_type} {row.qb_object_id}
                                  <IconExternalLink size={13} />
                                </Link>
                              </Tooltip>
                            ) : (
                              <Tooltip title={describeMissingLink(row) ?? ''}>
                                <Typography variant="caption" color="text.secondary">
                                  {EM_DASH}
                                </Typography>
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell align="right">{row.attempts}</TableCell>
                          <TableCell align="right">
                            {isUuid(row.location_id) && (
                              <Button
                                size="small"
                                onClick={() =>
                                  setDrill({
                                    locationId: String(row.location_id),
                                    date: row.posting_date,
                                    locationName: row.location_name ?? ''
                                  })
                                }
                              >
                                View day
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                        {rowError && !open && (
                          <TableRow>
                            <TableCell />
                            <TableCell colSpan={7} sx={{ pt: 0 }}>
                              {/* The first line only. Expanding shows the text in
                                  full — a recorded QuickBooks fault is often a
                                  paragraph, and truncating it in the row is not
                                  the same as losing it. */}
                              <Typography variant="caption" color="error.main">
                                {rowError.headline}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow>
                          <TableCell colSpan={8} sx={{ py: 0, borderBottom: open ? undefined : 'none' }}>
                            <Collapse in={open} unmountOnExit>
                              <RowDetail row={row} settings={settings} disclosure={disclosure} isAdmin={isAdmin} onRetried={load} />
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </AllyviaEmpty>

          {pagination && pagination.total_items > 0 && (
            <AllyviaPagination
              currentPage={pagination.current_page}
              totalPages={pagination.total_pages}
              totalItems={pagination.total_items}
              pageSize={pagination.page_size}
              onPageChange={setPageNumber}
              onPageSizeChange={(size) => {
                setPageNumber(1);
                setPageSize(size);
              }}
              // The server's own maximum, reported by the payload rather than
              // guessed — a larger request is capped silently otherwise. Deduped
              // because a server that lowered the cap to 100 would otherwise put
              // two 100s in the select.
              pageSizeOptions={[...new Set([25, 50, 100, pagination.max_page_size])].sort((a, b) => a - b)}
            />
          )}
        </Stack>
      </MainCard>

      <QbDayDrilldown
        open={drill !== null}
        onClose={() => setDrill(null)}
        locationId={drill?.locationId ?? null}
        date={drill?.date ?? null}
        locationName={drill?.locationName ?? null}
      />
    </>
  );
}

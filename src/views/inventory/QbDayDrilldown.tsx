// views/inventory/QbDayDrilldown.tsx
//
// THE TRUST SURFACE. One location, one day, and exactly what QuickBooks either
// received or would receive — the screen a merchant's accountant will read
// before anybody switches posting on, and will screenshot afterwards.
//
// FOUR THINGS THIS COMPONENT IS BUILT AROUND, and each of them is a claim it
// refuses to make rather than a feature it adds:
//
//   1. IT PREVIEWS, IT DOES NOT REFUSE. `GET /postings/day/` degrades: it
//      composes with the flag OFF and, where a kind's mappings are incomplete,
//      names the missing purposes instead of composing. So this dialog renders
//      with posting disabled, with mappings missing, and with QuickBooks not
//      connected at all — because "show me what would post" is the question
//      being asked before anyone commits. No HTTP reaches QuickBooks from here.
//
//   2. THE FEE FIGURE ON A PAYOUT IS NOT RECONCILED, and this is the single most
//      important piece of copy in the session. `fees` is DERIVED as
//      `gross - net`, so `net + fees == gross` holds for every possible input:
//      the "reconciliation guard" the design asked for is arithmetically
//      incapable of firing and is deliberately absent from the backend. The only
//      reachable refusal is `net > gross`. So the payout panel prints the
//      server's own disclosure verbatim, labels the fee as derived, and shows
//      `payoutTotalsView().reconciled === false` as a badge that says so out
//      loud. Nothing here may render a tick beside those three numbers.
//
//   3. TIPS ARE AN ABSENCE, NOT A ZERO. POSSale has no tip column, so the
//      composer omits the line and says so in `totals.tips_note`. That sentence
//      is shown, prominently, in the composer's own words — a "Tips $0.00" row
//      would read as "no tips were taken" when the truth is that tips are not
//      recorded anywhere in this ledger.
//
//   4. NULL-COST MOVEMENTS ARE EXCLUDED AND COUNTED, never valued at zero. The
//      count is on screen even on a day where the COGS journal composed to
//      nothing at all — which is exactly the day every movement lacked a cost
//      and the day the number matters most.
//
// Every figure comes from `qbPosting.ts`: the journal rows, the integer-cent
// column totals, the balance verdict and all three disclosures. This file lays
// them out and adds no arithmetic of its own — money that a human reconciles is
// never summed in a component.

import { useCallback, useEffect, useState } from 'react';

import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import { IconExternalLink } from '@tabler/icons-react';

import AllyviaChip from 'ui-component/common/AllyviaChip';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';

import { getPostingDay } from 'api/qbPosting.api';

import {
  DayDrill,
  DayEntry,
  DayEntryState,
  PostingRow,
  cogsSkippedNote,
  dayDrillQuery,
  dayEntryView,
  describeDayDrillGap,
  describeDayMode,
  describeMissingLink,
  formatCents,
  parseMappingConflict,
  payoutDisclosure,
  payoutTotalsView,
  postingStatusColor,
  postingStatusLabel,
  purposeLabel,
  qboObjectUrl,
  summarizePostingError,
  tipsDisclosure
} from './qbPosting';
import { EM_DASH } from './stockFormat';

/**
 * Tone for the per-entry state chip.
 *
 * `nothing_to_post` is NEUTRAL, not green and not red: a day with no sales is a
 * normal outcome, and colouring it either way editorialises about a fact.
 */
const STATE_TONE: Record<DayEntryState, 'success' | 'warning' | 'error' | 'default'> = {
  composed: 'success',
  mappings_incomplete: 'warning',
  nothing_to_post: 'default',
  refused: 'error',
  error: 'error',
  unknown: 'default'
};

const STATE_LABEL: Record<DayEntryState, string> = {
  composed: 'Composed',
  mappings_incomplete: 'Mappings incomplete',
  nothing_to_post: 'Nothing to post',
  refused: 'Refused',
  error: 'Could not compose',
  unknown: 'Unknown'
};

/** The QuickBooks deep link, or the reason there is not one. Never a dead link. */
const QboLink = ({ row }: { row: { qb_object_type?: string | null; qb_object_id?: string | null } }) => {
  const href = qboObjectUrl(row);
  if (!href) {
    return (
      <Tooltip title={describeMissingLink(row) ?? ''}>
        <Typography variant="caption" color="text.secondary">
          No QuickBooks link
        </Typography>
      </Tooltip>
    );
  }
  return (
    <Tooltip title="Opens this entry in QuickBooks Online (production host). Sign in there to see it in your books.">
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
  );
};

/**
 * One composed (or uncomposed) posting kind.
 *
 * The debits/credits table, both column totals, and an EXPLICIT balance verdict.
 * The verdict is a separate chip from the totals on purpose: an accountant
 * reading a screenshot should not have to add up two columns to find out whether
 * the entry QuickBooks receives is acceptable to QuickBooks.
 */
const DayEntryPanel = ({ entry }: { entry: DayEntry }) => {
  const view = dayEntryView(entry);
  if (!view) return null;

  const { totals } = view;
  // The two sentences that must not be lost in a list of notes. Compared by
  // identity against what `dayEntryView` already de-duplicated into `notes`, so
  // neither is restated here and neither is shown twice.
  const prominent = new Set([tipsDisclosure(entry), cogsSkippedNote(entry)].filter(Boolean) as string[]);
  const showAmountColumn = totals.unsidedCount > 0;
  const isCogs = String(entry.kind) === 'cogs_journal';
  const skippedMovements = Number(entry.movements_skipped_null_cost ?? 0);
  const skippedUnits = Number(entry.units_skipped_null_cost ?? 0);

  // The server computed `balanced` from the payload it built; we recomputed it
  // from the rendered lines in integer cents. They should agree, and a
  // disagreement means one of the two is reading something the other is not —
  // which an accountant needs to see rather than have silently resolved.
  const balanceDisagrees = view.serverBalanced !== null && totals.balanced !== null && view.serverBalanced !== totals.balanced;

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h5">{view.label}</Typography>
          <AllyviaChip size="small" color={STATE_TONE[view.state]} label={STATE_LABEL[view.state]} />
          {view.objectType && <Chip size="small" variant="outlined" label={view.objectType} />}
          {view.txnDate && (
            <Typography variant="caption" color="text.secondary">
              Transaction date {view.txnDate}
            </Typography>
          )}
        </Stack>

        <Typography variant="body2" color="text.primary">
          {view.headline}
        </Typography>

        {view.state === 'mappings_incomplete' && view.missingPurposes.length > 0 && (
          <Alert severity="warning">
            <AlertTitle>Not composed — {view.missingPurposes.length} account mapping(s) missing</AlertTitle>
            {view.missingPurposes.map(purposeLabel).join(', ')}. This kind is skipped by the nightly run until they are mapped; nothing
            partial is posted.
          </Alert>
        )}

        {view.state === 'refused' && entry.refused && (
          <Alert severity="error">
            <AlertTitle>Refused before posting</AlertTitle>
            {entry.refused.error ?? 'The composed entry did not reconcile.'}
            {entry.refused.discrepancy ? ` Discrepancy: ${entry.refused.discrepancy}.` : ''}
          </Alert>
        )}

        {view.rows.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Account</TableCell>
                  <TableCell>Purpose</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Debit</TableCell>
                  <TableCell align="right">Credit</TableCell>
                  {showAmountColumn && <TableCell align="right">Amount</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {view.rows.map((row, index) => (
                  // The wire carries no line id, and two lines legitimately share
                  // an account (a discount contra beside its sales credit), so the
                  // key is the position in the payload — the order QuickBooks
                  // receives them in.
                  <TableRow key={`${row.accountQbId}-${row.postingType}-${index}`}>
                    <TableCell>
                      <Typography variant="body2">{row.accountName}</Typography>
                      {row.accountQbId && (
                        <Typography variant="caption" color="text.secondary">
                          QuickBooks id {row.accountQbId}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {row.purposeLabels.length === 0 ? (
                          <Tooltip title="This account is not mapped to any posting purpose we recognise — the line still posts, but it was not chosen by a mapping on this screen.">
                            <Typography variant="caption" color="text.secondary">
                              {EM_DASH}
                            </Typography>
                          </Tooltip>
                        ) : (
                          row.purposeLabels.map((label) => <Chip key={label} size="small" variant="outlined" label={label} />)
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {row.description || EM_DASH}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{row.debit}</TableCell>
                    <TableCell align="right">{row.credit}</TableCell>
                    {showAmountColumn && <TableCell align="right">{row.unsided ? row.amount : EM_DASH}</TableCell>}
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography variant="subtitle2">Totals</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2">{totals.debitTotal}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2">{totals.creditTotal}</Typography>
                  </TableCell>
                  {showAmountColumn && (
                    <TableCell align="right">
                      <Typography variant="subtitle2">{formatCents(totals.unsidedCents)}</Typography>
                    </TableCell>
                  )}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {view.state === 'composed' && (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <AllyviaChip
              size="small"
              color={totals.balanced === null ? 'default' : totals.balanced ? 'success' : 'error'}
              label={totals.balanced === null ? 'Balance not applicable' : totals.balanced ? 'Balanced' : 'Does not balance'}
            />
            <Typography variant="caption" color={totals.balanced === false ? 'error.main' : 'text.secondary'}>
              {view.balanceSentence}
            </Typography>
          </Stack>
        )}

        {balanceDisagrees && (
          <Alert severity="error">
            <AlertTitle>Two answers about the same entry</AlertTitle>
            QuickBooks posting reported this entry as {view.serverBalanced ? 'balanced' : 'unbalanced'} while adding the lines shown above
            in whole cents gives {totals.balanced ? 'balanced' : 'unbalanced'} ({totals.difference}). Do not act on either figure until that
            is explained.
          </Alert>
        )}

        {totals.unparsedCount > 0 && (
          <Alert severity="warning">
            {totals.unparsedCount} line(s) carried an amount this screen could not read as money, so they are excluded from the totals above
            rather than counted as zero.
          </Alert>
        )}

        {isCogs && (
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Cost of goods sold posted
              </Typography>
              <Typography variant="h5">{view.cogsTotal}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Movements excluded (no recorded cost)
              </Typography>
              <Typography variant="h5" color={skippedMovements > 0 ? 'error.main' : 'text.primary'}>
                {skippedMovements} {skippedMovements === 1 ? 'movement' : 'movements'} · {skippedUnits}{' '}
                {skippedUnits === 1 ? 'unit' : 'units'}
              </Typography>
            </Box>
          </Stack>
        )}

        {view.notes.length > 0 && (
          <Stack spacing={0.75}>
            {view.notes.map((note) =>
              prominent.has(note) ? (
                <Alert key={note} severity="warning" variant="outlined">
                  {note}
                </Alert>
              ) : (
                <Typography key={note} variant="caption" color="text.secondary">
                  • {note}
                </Typography>
              )
            )}
          </Stack>
        )}

        {view.privateNote && (
          <Typography variant="caption" color="text.secondary">
            Memo sent to QuickBooks: “{view.privateNote}”
          </Typography>
        )}

        {view.posting && (
          <>
            <Divider />
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <AllyviaChip
                size="small"
                color={postingStatusColor(String(view.posting.status))}
                label={view.posting.status_label || postingStatusLabel(String(view.posting.status))}
              />
              <Typography variant="caption" color="text.secondary">
                {view.posting.attempts} attempt(s)
                {view.posting.posted_at ? ` · posted ${new Date(view.posting.posted_at).toLocaleString()}` : ''}
                {view.posting.trigger ? ` · ${view.posting.trigger}` : ''}
              </Typography>
              <QboLink row={view.posting} />
            </Stack>
            {summarizePostingError(view.posting.error) && (
              <Alert severity="error">
                <AlertTitle>Recorded error</AlertTitle>
                <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', m: 0 }}>
                  {summarizePostingError(view.posting.error)?.full}
                </Typography>
              </Alert>
            )}
          </>
        )}
      </Stack>
    </Box>
  );
};

/**
 * A payout deposit.
 *
 * THE FEE IS DERIVED, NOT VERIFIED, and this panel exists mostly to say so.
 * `payoutTotalsView` hard-codes `reconciled: false` because no input can make it
 * true — there is no independent fee figure in this schema to check against.
 */
const PayoutPanel = ({ row, disclosure }: { row: PostingRow; disclosure: string }) => {
  const totals = payoutTotalsView(row.totals, disclosure);
  const figures: Array<{ label: string; value: string; caption: string }> = [
    {
      label: 'Gross captured in the window',
      value: totals.gross,
      caption:
        totals.paymentsInWindow === null
          ? 'Summed from the Stripe payments this payout window covers.'
          : `Summed from ${totals.paymentsInWindow} Stripe payment(s) in the window.`
    },
    {
      label: 'Stripe fees (DERIVED)',
      value: totals.fees,
      caption: totals.derivation
    },
    { label: 'Net deposited to the bank', value: totals.net, caption: 'The amount Stripe says it paid out.' }
  ];

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h5">{row.kind_label || 'Payout deposit'}</Typography>
          <AllyviaChip
            size="small"
            color={postingStatusColor(String(row.status))}
            label={row.status_label || postingStatusLabel(String(row.status))}
          />
          {/* Not a decoration. The design asked for a reconciliation guard that
              cannot fire; this badge is what honesty looks like in its place. */}
          <AllyviaChip
            size="small"
            color="warning"
            variant="outlined"
            label="Fee not independently reconciled"
            tooltipTitle={totals.disclosure}
          />
          {row.stripe_payout_id && (
            <Typography variant="caption" color="text.secondary">
              Stripe payout {row.stripe_payout_id}
            </Typography>
          )}
          <QboLink row={row} />
        </Stack>

        <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
          {figures.map((figure) => (
            <Box key={figure.label} sx={{ minWidth: 200 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                {figure.label}
              </Typography>
              <Typography variant="h5">{figure.value}</Typography>
              <Typography variant="caption" color="text.secondary">
                {figure.caption}
              </Typography>
            </Box>
          ))}
        </Stack>

        {/* Printed in full, not behind a tooltip: this is the sentence a
            screenshot has to carry. */}
        <Alert severity="warning">
          <AlertTitle>How to read these three numbers</AlertTitle>
          {totals.disclosure}
        </Alert>

        {row.refused && (
          <Alert severity="error">
            <AlertTitle>Refused</AlertTitle>
            {String(row.refused.error ?? 'This payout did not reconcile and was not posted.')}
            {row.refused.discrepancy ? ` Discrepancy: ${String(row.refused.discrepancy)}.` : ''}
          </Alert>
        )}

        {summarizePostingError(row.error) && (
          <Alert severity="error">
            <AlertTitle>Recorded error</AlertTitle>
            <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', m: 0 }}>
              {summarizePostingError(row.error)?.full}
            </Typography>
          </Alert>
        )}
      </Stack>
    </Box>
  );
};

export interface QbDayDrilldownProps {
  open: boolean;
  onClose: () => void;
  /** Required by the endpoint. Anything that is not a uuid produces the gap message. */
  locationId: string | null;
  /** Company-local business day, YYYY-MM-DD. */
  date: string | null;
  /** Shown in the title until the payload arrives with the server's own name. */
  locationName?: string | null;
}

export default function QbDayDrilldown({ open, onClose, locationId, date, locationName = null }: QbDayDrilldownProps) {
  const [drill, setDrill] = useState<DayDrill | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Null means "do not call": both parameters are required server-side, and an
  // unfiltered day has no meaning. The opposite rule from the posting log, which
  // drops a bad filter and says it did.
  const query = dayDrillQuery({ locationId, date });
  const gap = describeDayDrillGap({ locationId, date });

  const load = useCallback(async () => {
    if (!query) {
      setDrill(null);
      return;
    }
    // Cleared BEFORE the request, not merged after it. Opening this dialog for a
    // second day would otherwise show the first day's journal lines, under the
    // second day's heading, for as long as the fetch takes — on the one screen
    // whose entire job is to be trusted about which day it is showing.
    setDrill(null);
    setLoading(true);
    try {
      // Cast at the transport boundary; every reader in qbPosting.ts tolerates a
      // missing or null field, so a payload that grew a key still renders.
      setDrill((await getPostingDay(query)) as DayDrill);
      setError(null);
    } catch (err) {
      setDrill(null);
      setError(parseMappingConflict(err).summary);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (!open) return;
    load();
  }, [open, load]);

  const heading = drill?.location?.name || locationName || 'Location';
  const day = drill?.date || date || '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h4">What posts for {day || 'this day'}</Typography>
          <Chip size="small" label={heading} />
          {loading && <CircularProgress size={16} />}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Composed from your own sales, stock movements and account mappings. Nothing on this screen contacts QuickBooks — it is what would
          be sent, or what was.
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          {gap && <Alert severity="info">{gap}</Alert>}

          {error && (
            <Alert
              severity="warning"
              action={
                <Button size="small" color="inherit" onClick={load}>
                  Retry
                </Button>
              }
            >
              {error} Nothing is shown below because the preview did not come back — that is not the same as there being nothing to post.
            </Alert>
          )}

          {drill && (
            <Alert
              severity={!drill.quickbooks_connected ? 'warning' : drill.preview_only || !drill.qb_posting_enabled ? 'info' : 'success'}
            >
              {describeDayMode(drill)}
            </Alert>
          )}

          <AllyviaEmpty
            isLoading={loading && drill === null}
            isEmpty={!gap && !error && drill !== null && drill.entries.length === 0 && drill.payout_postings.length === 0}
            type="table"
            skeletonType="table"
            rows={4}
            columns={5}
            title="Nothing composed for this day"
            description="No sales summary, COGS journal or payout deposit exists for this location on this day."
            showIcon={false}
            height="auto"
          >
            <Stack spacing={2}>
              {(drill?.entries ?? []).map((entry) => (
                <DayEntryPanel key={String(entry.kind)} entry={entry} />
              ))}

              {(drill?.payout_postings ?? []).length > 0 && (
                <>
                  <Divider />
                  <Typography variant="subtitle1">Payout deposits recorded on this day</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Payouts are company-level, not per location, so they are listed here because this is the day you are looking at rather
                    than because they belong to {heading}.
                  </Typography>
                  {(drill?.payout_postings ?? []).map((row) => (
                    <PayoutPanel key={row.id} row={row} disclosure={payoutDisclosure(drill)} />
                  ))}
                </>
              )}
            </Stack>
          </AllyviaEmpty>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={load} disabled={!query || loading}>
          Refresh
        </Button>
        <Button variant="contained" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

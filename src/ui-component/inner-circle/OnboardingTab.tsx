import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import { IconAlertTriangle, IconCheck, IconUsers } from '@tabler/icons-react';

import {
  fetchDuplicates,
  fetchInnerCircleDashboard,
  fetchLadderProposal,
  mergeContacts,
  runPrefill,
  type DuplicateGroup
} from 'api/innerCircle.api';
import MainCard from 'ui-component/cards/MainCard';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import {
  buildActions,
  buildFunnelStages,
  buildTierSegments,
  describeBasis,
  describeMergeEffect,
  describeProposal,
  describeReasons,
  enrollableCount,
  formatMoney,
  membershipLabel
} from 'views/inner-circle/onboardingDashboard';

// ==============================|| INNER CIRCLE — SETUP ||============================== //
//
// The screen an owner opens after their history is imported. It answers one
// question in order: is my customer list clean, are my tiers set, and who is
// not in Inner Circle yet.
//
// All derivation lives in views/inner-circle/onboardingDashboard.ts. vitest
// runs in the `node` environment in this repo -- no jsdom -- so a rule that
// lives in this file is a rule with no test.
//
// NOTE ON OVERLAP WITH TiersTab: that tab has its own client-side
// `suggestLadderFromSpend`, which can only see the customers on the page it
// fetched. The proposal here comes from the server, which measures the whole
// customer base. They are allowed to differ; this one is the one to trust for
// a shop standing up for the first time.

const TONE_TO_THEME = {
  default: 'default',
  success: 'success',
  warning: 'warning',
  alert: 'alert',
  gold: 'gold'
} as const;

export default function OnboardingTab() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [mergeTarget, setMergeTarget] = useState<DuplicateGroup | null>(null);
  const [prefillOpen, setPrefillOpen] = useState(false);

  const dashboard = useQuery({
    queryKey: ['inner-circle', 'dashboard'],
    queryFn: () => fetchInnerCircleDashboard(10)
  });
  const duplicates = useQuery({
    queryKey: ['inner-circle', 'duplicates'],
    queryFn: () => fetchDuplicates({ limit: 25 })
  });
  const proposal = useQuery({
    queryKey: ['inner-circle', 'ladder-proposal'],
    queryFn: () => fetchLadderProposal('lifetime')
  });

  // The preview is the same code path as the write, so what the dialog shows
  // is what running it does. dry_run defaults true on the server too.
  const preview = useQuery({
    queryKey: ['inner-circle', 'prefill-preview'],
    queryFn: () => runPrefill(true),
    enabled: prefillOpen
  });

  const invalidate = () => {
    // NOT awaited inside a mutation's try block: react-query's mutateAsync
    // rejects if a refetch fails, which would report a write that SUCCEEDED
    // as failed -- and here that means an owner merging the same customers
    // twice, or pressing "add everyone" again.
    void queryClient.invalidateQueries({ queryKey: ['inner-circle'] });
  };

  const merge = useMutation({
    mutationFn: (group: DuplicateGroup) =>
      mergeContacts(
        group.primary.id,
        group.duplicates.map((d) => d.id)
      ),
    onSuccess: (result) => {
      setMergeTarget(null);
      enqueueSnackbar(`Merged ${result.merged_ids.length} record${result.merged_ids.length === 1 ? '' : 's'}.`, { variant: 'success' });
      invalidate();
    },
    onError: (error: unknown) => {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Could not merge those records.';
      enqueueSnackbar(detail, { variant: 'error' });
    }
  });

  const prefill = useMutation({
    mutationFn: () => runPrefill(false),
    onSuccess: (report) => {
      setPrefillOpen(false);
      enqueueSnackbar(`${report.links_created} membership${report.links_created === 1 ? '' : 's'} created.`, { variant: 'success' });
      invalidate();
    },
    onError: () => enqueueSnackbar('Could not add those customers.', { variant: 'error' })
  });

  if (dashboard.isLoading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rectangular" height={120} />
        <Skeleton variant="rectangular" height={220} />
      </Stack>
    );
  }

  if (dashboard.isError || !dashboard.data) {
    // A failed fetch must never render as an empty shop. "0 customers" beside
    // "nothing to do" is the same confident lie the audit found elsewhere.
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => void dashboard.refetch()}>
            Retry
          </Button>
        }
      >
        <AlertTitle>Could not load your Inner Circle setup</AlertTitle>
        These numbers are unavailable right now — this is not a reading that your customer list is empty.
      </Alert>
    );
  }

  const { funnel, tiers, data_quality: quality, tier_readiness: readiness, top_spenders: top } = dashboard.data;
  const stages = buildFunnelStages(funnel);
  const actions = buildActions(funnel, quality, readiness);
  const segments = buildTierSegments(tiers);
  const enrollable = enrollableCount(funnel);

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' } }}>
        {stages.map((stage) => (
          <AllyviaStats
            key={stage.key}
            title={stage.label}
            value={stage.value}
            theme={TONE_TO_THEME[stage.tone]}
            secondary={stage.key === 'customers' ? undefined : `${stage.percent}% of customers`}
          />
        ))}
      </Box>

      <MainCard title="What to do next" content={false}>
        <Stack divider={<Divider />}>
          {actions.map((action) => (
            <Stack key={action.key} direction="row" spacing={2} alignItems="flex-start" sx={{ p: 2 }}>
              <Box sx={{ pt: 0.25 }}>
                {action.severity === 'done' ? (
                  <IconCheck size={20} color="#2e7d32" />
                ) : (
                  <IconAlertTriangle size={20} color={action.severity === 'blocked' ? '#c62828' : '#ed6c02'} />
                )}
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1">{action.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {action.detail}
                </Typography>
              </Box>
              {action.cta === 'prefill' && (
                <Button variant="contained" size="small" onClick={() => setPrefillOpen(true)}>
                  Add to Inner Circle
                </Button>
              )}
            </Stack>
          ))}
        </Stack>
      </MainCard>

      {duplicates.data && duplicates.data.groups.length > 0 && (
        <MainCard title={`Customers on the list more than once (${duplicates.data.summary.groups})`} content={false}>
          <Box sx={{ px: 2, pt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Each of these looks like one person with several records. Their spend is currently split, so they rank and tier lower than
              they should. Merging keeps the fullest record and folds the rest into it.
            </Typography>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Customer</TableCell>
                <TableCell>Why we think so</TableCell>
                <TableCell align="right">Spend now</TableCell>
                <TableCell align="right">Spend merged</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {duplicates.data.groups.map((group) => (
                <TableRow key={group.primary.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{group.primary.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {group.duplicates.length + 1} records
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        size="small"
                        label={group.confidence === 'strong' ? 'Confident' : 'Check first'}
                        color={group.confidence === 'strong' ? 'success' : 'warning'}
                        variant="outlined"
                      />
                      <Typography variant="body2">{describeReasons(group.reasons)}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">{formatMoney(group.primary.net_spend)}</TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2">{formatMoney(group.combined_spend)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => setMergeTarget(group)}>
                      Merge
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </MainCard>
      )}

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <MainCard title="Your tiers">
          {tiers.mode === 'ladder' ? (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Measured over{' '}
                {tiers.ladder_window === 'lifetime' ? 'all time' : tiers.ladder_window?.replace('rolling_', 'the last ') + ' days'}.
              </Typography>
              {segments.map((segment) => (
                <Box key={segment.name}>
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                    <Typography variant="subtitle2">
                      {segment.name}
                      {segment.threshold !== null && (
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          {formatMoney(segment.threshold)}+
                        </Typography>
                      )}
                    </Typography>
                    <Typography variant="body2">
                      {segment.customers}{' '}
                      <Typography component="span" variant="caption" color="text.secondary">
                        ({segment.percent}%)
                      </Typography>
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, segment.percent)}
                    sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                  />
                </Box>
              ))}
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Alert severity="info">
                <AlertTitle>Using the default ranking</AlertTitle>
                Customers are ranked against each other rather than against thresholds you chose.
              </Alert>
              {proposal.data && !proposal.data.has_active_ladder && proposal.data.customers_measured > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Suggested from your own {proposal.data.customers_measured} customers
                  </Typography>
                  {describeProposal(proposal.data).map((line) => (
                    <Typography key={line} variant="body2" color="text.secondary">
                      • {line}
                    </Typography>
                  ))}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Set these in the Tiers tab — nothing here changes them for you.
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </MainCard>

        <MainCard title="Your top customers">
          <Table size="small">
            <TableBody>
              {top.map((row, index) => (
                <TableRow key={row.contact_id}>
                  <TableCell sx={{ width: 32 }}>
                    <Typography variant="caption" color="text.secondary">
                      {index + 1}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2">{row.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.sale_count} sales · {describeBasis(row.basis)}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.tier_level && <Chip size="small" label={row.tier_level} variant="outlined" />}</TableCell>
                  <TableCell>
                    <Tooltip title={row.membership_status === 'provisional' ? 'Their membership is waiting for them to open the app' : ''}>
                      <Typography variant="caption" color={row.membership_status ? 'text.secondary' : 'warning.main'}>
                        {membershipLabel(row.membership_status)}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2">{formatMoney(row.net_spend)}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </MainCard>
      </Box>

      <Dialog open={mergeTarget !== null} onClose={() => setMergeTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Merge these records?</DialogTitle>
        <DialogContent>
          {mergeTarget && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography variant="body2">{describeMergeEffect(mergeTarget)}</Typography>
              <Table size="small">
                <TableBody>
                  {[mergeTarget.primary, ...mergeTarget.duplicates].map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Typography variant="subtitle2">{row.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {[row.email, row.phone].filter(Boolean).join(' · ') || 'no contact details'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{formatMoney(row.net_spend)}</TableCell>
                      <TableCell align="right">
                        <Chip size="small" label={index === 0 ? 'Keeps' : 'Folds in'} variant={index === 0 ? 'filled' : 'outlined'} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Typography variant="caption" color="text.secondary">
                Sales, promotions and memberships move to the record that is kept. Nothing is deleted — the folded records stay on file
                pointing at the one that survives.
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMergeTarget(null)}>Cancel</Button>
          <Button variant="contained" disabled={merge.isPending} onClick={() => mergeTarget && merge.mutate(mergeTarget)}>
            Merge
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={prefillOpen} onClose={() => setPrefillOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add {enrollable} customers to Inner Circle?</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2">
              Each customer gets a membership that is waiting for them the first time they open the app, with their spend and tier already
              counted.
            </Typography>
            <Alert severity="info" icon={<IconUsers size={18} />}>
              Nothing is sent to anybody. No marketing consent is granted — a customer grants that themselves when they claim their
              membership.
            </Alert>
            {preview.isLoading && <Skeleton variant="rectangular" height={60} />}
            {preview.data && (
              <Box>
                <Typography variant="body2">
                  {preview.data.links_created} membership{preview.data.links_created === 1 ? '' : 's'} would be created.
                </Typography>
                {preview.data.phones_backfilled > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    {preview.data.phones_backfilled} existing account{preview.data.phones_backfilled === 1 ? '' : 's'} would gain a phone
                    number, so those customers can sign in.
                  </Typography>
                )}
                {preview.data.skipped_no_identity > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    {preview.data.skipped_no_identity} skipped — no phone or email on file.
                  </Typography>
                )}
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrefillOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={prefill.isPending} onClick={() => prefill.mutate()}>
            Add them
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

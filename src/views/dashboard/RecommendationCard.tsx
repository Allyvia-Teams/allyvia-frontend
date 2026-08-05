import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// material-ui
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme, alpha } from '@mui/material/styles';

// icons
import { IconSparkles, IconX, IconTrendingUp, IconRefresh, IconAlertTriangle } from '@tabler/icons-react';

// project imports
import { AgentAPI, PendingRecommendation, PendingRecommendationsResponse, AgentAlert, GenerateRecommendationResponse } from 'api/agent.api';

// Cosmetic only — the backend doesn't report per-step progress, so we rotate
// through plausible status text for the duration of the (5-30s) agent run.
const GENERATING_STATUS_MESSAGES = [
  'Analyzing sales trends…',
  'Checking inventory…',
  'Reading weather signals…',
  'Reviewing customer preferences…',
  'Weighing supplier risk…'
];

const useRotatingStatus = (active: boolean, messages: string[], intervalMs = 1800) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return undefined;
    }
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [active, messages, intervalMs]);

  return messages[index];
};

const isNotSurfacedResponse = (data: GenerateRecommendationResponse): data is { surfaced: false; reason: string } =>
  'surfaced' in data && data.surfaced === false;

// ==============================|| RECOMMENDATION CARD ||============================== //

const UrgencyChip = ({ score }: { score: number }) => {
  if (score >= 0.8) return <Chip label="High urgency" color="error" size="small" />;
  if (score >= 0.5) return <Chip label="Medium urgency" color="warning" size="small" />;
  return <Chip label="Low urgency" color="default" size="small" />;
};

const SingleRecommendation = ({ rec, onDismiss }: { rec: PendingRecommendation; onDismiss: () => void }) => {
  const theme = useTheme();
  const [dismissing, setDismissing] = useState(false);

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await onDismiss();
    } finally {
      setDismissing(false);
    }
  };

  const impactStr = rec.predicted_impact_dollars ? `$${parseFloat(rec.predicted_impact_dollars).toLocaleString()} estimated impact` : null;

  return (
    <Card
      variant="outlined"
      sx={{
        borderLeft: `4px solid ${theme.palette.primary.main}`,
        mb: 1.5,
        '&:last-child': { mb: 0 }
      }}
    >
      <CardContent sx={{ pb: '12px !important', pt: 1.5, px: 2 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
          <Box display="flex" alignItems="flex-start" gap={1} flex={1}>
            <IconSparkles size={18} color={theme.palette.primary.main} style={{ marginTop: 2, flexShrink: 0 }} />
            <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.5 }}>
              {rec.recommendation_text}
            </Typography>
          </Box>
          <Button
            size="small"
            variant="text"
            color="inherit"
            onClick={handleDismiss}
            disabled={dismissing}
            sx={{ minWidth: 28, p: 0.5, ml: 0.5, flexShrink: 0 }}
            aria-label="Dismiss recommendation"
          >
            <IconX size={16} />
          </Button>
        </Box>

        <Box display="flex" alignItems="center" gap={1} mt={1} flexWrap="wrap">
          <UrgencyChip score={rec.urgency_score} />
          {impactStr && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <IconTrendingUp size={14} color={theme.palette.success.main} />
              <Typography variant="caption" color="success.main">
                {impactStr}
              </Typography>
            </Box>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            Confidence: {Math.round(rec.confidence_score * 100)}%
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

const COMPACT_TRUNCATE_LENGTH = 120;

const truncateText = (text: string, maxLen: number) => (text.length > maxLen ? `${text.slice(0, maxLen).trimEnd()}…` : text);

const CompactRecommendation = ({ rec, onDismiss }: { rec: PendingRecommendation; onDismiss: () => void }) => {
  const [expanded, setExpanded] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const isTruncated = rec.recommendation_text.length > COMPACT_TRUNCATE_LENGTH;
  const displayText = expanded || !isTruncated ? rec.recommendation_text : truncateText(rec.recommendation_text, COMPACT_TRUNCATE_LENGTH);

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await onDismiss();
    } finally {
      setDismissing(false);
    }
  };

  return (
    <Box
      onClick={() => isTruncated && setExpanded((prev) => !prev)}
      display="flex"
      alignItems="flex-start"
      gap={1}
      sx={{
        mt: 1,
        px: 1.5,
        py: 0.75,
        borderRadius: 1,
        bgcolor: 'action.hover',
        cursor: isTruncated ? 'pointer' : 'default'
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ flex: 1, whiteSpace: expanded ? 'normal' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        <Box component="span" fontWeight={600} color="text.primary">
          Also worth watching:
        </Box>{' '}
        {displayText}
      </Typography>
      <Button
        size="small"
        variant="text"
        color="inherit"
        onClick={(event) => {
          event.stopPropagation();
          void handleDismiss();
        }}
        disabled={dismissing}
        sx={{ minWidth: 20, p: 0.25, flexShrink: 0 }}
        aria-label="Dismiss recommendation"
      >
        <IconX size={14} />
      </Button>
    </Box>
  );
};

const AlertRow = ({ alert }: { alert: AgentAlert }) => {
  const theme = useTheme();

  return (
    <Box
      display="flex"
      alignItems="flex-start"
      gap={1}
      sx={{
        borderLeft: `4px solid ${theme.palette.warning.main}`,
        bgcolor: alpha(theme.palette.warning.main, 0.08),
        borderRadius: 1,
        px: 1.5,
        py: 1,
        mb: 1,
        '&:last-of-type': { mb: 0 }
      }}
    >
      <IconAlertTriangle size={18} color={theme.palette.warning.main} style={{ marginTop: 2, flexShrink: 0 }} />
      <Box flex={1}>
        <Typography variant="body2" fontWeight={600} color="text.primary">
          {alert.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {alert.detail}
        </Typography>
      </Box>
    </Box>
  );
};

// Alerts are deterministic facts (duplicate bills, large overdue payables) —
// styled distinctly from the LLM-predicted recommendation cards below since
// they aren't predictions and don't carry urgency/confidence scores or
// dismiss/feedback mechanics.
const AlertsSection = ({ alerts }: { alerts: AgentAlert[] }) => {
  const theme = useTheme();
  if (alerts.length === 0) return null;

  return (
    <Grid size={12}>
      <Card variant="outlined">
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={1.5}>
            <IconAlertTriangle size={20} color={theme.palette.warning.main} />
            <Typography variant="h5">Alerts</Typography>
          </Box>
          <Divider sx={{ mb: 1.5 }} />
          {alerts.map((alert) => (
            <AlertRow key={alert.key} alert={alert} />
          ))}
        </CardContent>
      </Card>
    </Grid>
  );
};

const isTimeoutError = (error: unknown): boolean => {
  const err = error as { code?: string; message?: string } | null;
  return err?.code === 'ECONNABORTED' || /timeout/i.test(err?.message ?? '');
};

const isConflictError = (error: unknown): boolean => {
  const err = error as { response?: { status?: number } } | null;
  return err?.response?.status === 409;
};

// A gateway/proxy timeout (LB or Cloud Run returning 502/503/504) usually means
// the request outran an upstream timeout while the agent run is still finishing
// server-side — the recommendation typically lands in the DB moments later. Poll
// for it instead of treating this as a hard failure.
const isGatewayError = (error: unknown): boolean => {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  return status === 502 || status === 503 || status === 504;
};

const PENDING_QUERY_KEY = ['agent-pending-recommendations'];
const CONFLICT_POLL_INTERVAL_MS = 5000;
const CONFLICT_POLL_TIMEOUT_MS = 60000;

export const RecommendationCard = () => {
  const queryClient = useQueryClient();
  const [notSurfacedReason, setNotSurfacedReason] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [polling, setPolling] = useState(false);

  // Another request (e.g. a double-click) is already generating a recommendation
  // for this company. Rather than surfacing that as an error, poll the pending
  // list until the in-flight run finishes or we give up after 60s.
  useEffect(() => {
    if (!polling) return undefined;

    const start = Date.now();
    const id = setInterval(async () => {
      if (Date.now() - start >= CONFLICT_POLL_TIMEOUT_MS) {
        setPolling(false);
        return;
      }
      await queryClient.refetchQueries({ queryKey: PENDING_QUERY_KEY });
      const latest = queryClient.getQueryData<PendingRecommendationsResponse>(PENDING_QUERY_KEY);
      if (latest && latest.recommendations.length > 0) {
        setPolling(false);
      }
    }, CONFLICT_POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [polling, queryClient]);

  const {
    data: pendingData,
    isLoading,
    isError,
    error: listError,
    refetch
  } = useQuery({
    queryKey: PENDING_QUERY_KEY,
    queryFn: () => AgentAPI.Recommendations.list(),
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  const recommendations = pendingData?.recommendations;
  const alerts = pendingData?.alerts ?? [];

  const dismissMutation = useMutation({
    mutationFn: (id: string) => AgentAPI.Recommendations.dismiss(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PENDING_QUERY_KEY });
    }
  });

  const generateMutation = useMutation({
    mutationFn: (force?: boolean) => AgentAPI.Recommendations.generate(force),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PENDING_QUERY_KEY });
      setNotSurfacedReason(isNotSurfacedResponse(data) ? data.reason : null);
    },
    onError: (error) => {
      // Another request is already generating for this company (409), or an
      // upstream gateway (LB/Cloud Run) timed out the request (502/503/504)
      // while the run finishes server-side. In both cases the recommendation is
      // likely still being written — poll for it instead of showing an error.
      if (isConflictError(error) || isGatewayError(error)) {
        setPolling(true);
        return;
      }
      // The request can time out client-side while the run finishes server-side.
      // Give it one delayed recheck before showing an error — a slow-but-successful
      // run should just show up, not send the merchant down a needless retry.
      if (!isTimeoutError(error)) return;
      setRecovering(true);
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: PENDING_QUERY_KEY }).finally(() => setRecovering(false));
      }, 3000);
    }
  });

  const statusText = useRotatingStatus(generateMutation.isPending || recovering, GENERATING_STATUS_MESSAGES);

  const handleGenerate = (force?: boolean) => {
    setNotSurfacedReason(null);
    setPolling(false);
    generateMutation.mutate(force);
  };

  if (isLoading) {
    return (
      <Grid size={12}>
        <Skeleton variant="rounded" height={80} />
      </Grid>
    );
  }

  // Distinct error state for the LIST query (e.g. a 4xx/5xx from
  // /agent/recommendations/pending/). Previously any list failure fell through to
  // the empty placeholder, masking a backend error as "no insights yet".
  if (isError) {
    return (
      <Grid size={12}>
        <Card variant="outlined">
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1.5}>
              <IconSparkles size={20} />
              <Typography variant="h5">Today&apos;s Insights</Typography>
            </Box>
            <Divider sx={{ mb: 1.5 }} />
            <Box display="flex" flexDirection="column" alignItems="flex-start" gap={1} py={1}>
              <Typography variant="body2" color="error">
                Couldn&apos;t load your insights right now.
              </Typography>
              {listError instanceof Error && listError.message && (
                <Typography variant="caption" color="text.secondary">
                  {listError.message}
                </Typography>
              )}
              <Button size="small" variant="outlined" color="primary" startIcon={<IconRefresh size={16} />} onClick={() => refetch()}>
                Retry
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <>
        <AlertsSection alerts={alerts} />
        <Grid size={12}>
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                <IconSparkles size={20} />
                <Typography variant="h5">Today&apos;s Insights</Typography>
              </Box>
              <Divider sx={{ mb: 1.5 }} />

              {generateMutation.isPending || recovering || polling ? (
                <Box py={1}>
                  <Button variant="contained" color="primary" disabled startIcon={<CircularProgress size={16} color="inherit" />}>
                    Generate today&apos;s recommendation
                  </Button>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {polling ? 'Still working on it…' : statusText}
                  </Typography>
                </Box>
              ) : generateMutation.isError ? (
                <Box display="flex" flexDirection="column" alignItems="flex-start" gap={1} py={1}>
                  <Typography variant="body2" color="error">
                    Something went wrong generating your recommendation.
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    startIcon={<IconRefresh size={16} />}
                    onClick={() => handleGenerate(false)}
                  >
                    Retry
                  </Button>
                </Box>
              ) : notSurfacedReason ? (
                <Box display="flex" flexDirection="column" alignItems="flex-start" gap={1} py={1}>
                  <Typography variant="body2" color="text.secondary">
                    No recommendation met the bar today — your signals look stable
                  </Typography>
                  <Button size="small" variant="text" color="inherit" onClick={() => handleGenerate(true)}>
                    Run again
                  </Button>
                </Box>
              ) : (
                <Box py={1}>
                  <Button variant="contained" color="primary" startIcon={<IconSparkles size={18} />} onClick={() => handleGenerate(false)}>
                    Generate today&apos;s recommendation
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </>
    );
  }

  const [primaryRec, secondaryRec] = [...recommendations].sort((a, b) => b.urgency_score - a.urgency_score);

  return (
    <>
      <AlertsSection alerts={alerts} />
      <Grid size={12}>
        <Card variant="outlined">
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1.5}>
              <IconSparkles size={20} />
              <Typography variant="h5">Today&apos;s Insights</Typography>
            </Box>
            <Divider sx={{ mb: 1.5 }} />
            <SingleRecommendation rec={primaryRec} onDismiss={() => dismissMutation.mutateAsync(primaryRec.id)} />
            {secondaryRec && <CompactRecommendation rec={secondaryRec} onDismiss={() => dismissMutation.mutateAsync(secondaryRec.id)} />}
          </CardContent>
        </Card>
      </Grid>
    </>
  );
};

export default RecommendationCard;

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
import { useTheme } from '@mui/material/styles';

// icons
import { IconBulb, IconX, IconTrendingUp, IconRefresh } from '@tabler/icons-react';

// project imports
import { AgentAPI, PendingRecommendation, GenerateRecommendationResponse } from 'api/agent.api';

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
            <IconBulb size={18} color={theme.palette.primary.main} style={{ marginTop: 2, flexShrink: 0 }} />
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

export const RecommendationCard = () => {
  const queryClient = useQueryClient();
  const [notSurfacedReason, setNotSurfacedReason] = useState<string | null>(null);

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['agent-pending-recommendations'],
    queryFn: () => AgentAPI.Recommendations.list(),
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => AgentAPI.Recommendations.dismiss(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-pending-recommendations'] });
    }
  });

  const generateMutation = useMutation({
    mutationFn: (force?: boolean) => AgentAPI.Recommendations.generate(force),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agent-pending-recommendations'] });
      setNotSurfacedReason(isNotSurfacedResponse(data) ? data.reason : null);
    }
  });

  const statusText = useRotatingStatus(generateMutation.isPending, GENERATING_STATUS_MESSAGES);

  const handleGenerate = (force?: boolean) => {
    setNotSurfacedReason(null);
    generateMutation.mutate(force);
  };

  if (isLoading) {
    return (
      <Grid item xs={12}>
        <Skeleton variant="rounded" height={80} />
      </Grid>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <Grid item xs={12}>
        <Card variant="outlined">
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1.5}>
              <IconBulb size={20} />
              <Typography variant="h5">Today&apos;s Insights</Typography>
            </Box>
            <Divider sx={{ mb: 1.5 }} />

            {generateMutation.isPending ? (
              <Box py={1}>
                <Button variant="contained" color="primary" disabled startIcon={<CircularProgress size={16} color="inherit" />}>
                  Generate today&apos;s recommendation
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {statusText}
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
                <Button variant="contained" color="primary" startIcon={<IconBulb size={18} />} onClick={() => handleGenerate(false)}>
                  Generate today&apos;s recommendation
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    );
  }

  return (
    <Grid item xs={12}>
      <Card variant="outlined">
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={1.5}>
            <IconBulb size={20} />
            <Typography variant="h5">Today&apos;s Insights</Typography>
          </Box>
          <Divider sx={{ mb: 1.5 }} />
          {recommendations.map((rec) => (
            <SingleRecommendation key={rec.id} rec={rec} onDismiss={() => dismissMutation.mutateAsync(rec.id)} />
          ))}
        </CardContent>
      </Card>
    </Grid>
  );
};

export default RecommendationCard;

import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import {
  Box,
  Button,
  Chip,
  Grid,
  LinearProgress,
  Link,
  Paper,
  Skeleton,
  Stack,
  Typography
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import PollOutlinedIcon from '@mui/icons-material/PollOutlined';

import {
  fetchSurveyInsights,
  type SurveyInsight,
  type SurveyInsightConfidence,
  type SurveyInsightQuestionSummary
} from 'api/innerCircle.api';
import { gridSpacing } from 'store/constant';
import { formatDate } from 'utils/dateUtils';
import MainCard from 'ui-component/cards/MainCard';

const CONFIDENCE_CONFIG: Record<
  SurveyInsightConfidence,
  { label: string; color: 'success' | 'warning' | 'default' }
> = {
  high: { label: 'High confidence', color: 'success' },
  medium: { label: 'Medium confidence', color: 'warning' },
  low: { label: 'Low confidence', color: 'default' }
};

function topicLabel(insight: SurveyInsight): string {
  if (insight.topics.length > 0) {
    return insight.topics.slice(0, 3).join(' · ');
  }
  const firstQuestion = insight.summary_json.questions?.[0];
  if (firstQuestion?.question_text) {
    return firstQuestion.question_text.slice(0, 80);
  }
  return 'Trend survey';
}

function QuestionTopResponse({ question }: { question: SurveyInsightQuestionSummary }) {
  const theme = useTheme();
  const top = question.top_responses?.[0];
  if (!top) {
    return (
      <Typography variant="caption" color="textSecondary">
        No responses yet
      </Typography>
    );
  }

  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75, lineHeight: 1.35 }}>
        {question.question_text}
      </Typography>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Typography variant="caption" color="textSecondary" noWrap sx={{ maxWidth: '70%' }}>
          Top: {top.value}
        </Typography>
        <Typography variant="caption" fontWeight={700}>
          {top.pct}%
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(top.pct, 100)}
        sx={{
          height: 8,
          borderRadius: 999,
          bgcolor: alpha(theme.palette.primary.main, 0.12),
          '& .MuiLinearProgress-bar': { borderRadius: 999 }
        }}
      />
    </Box>
  );
}

function SurveyInsightCard({ insight }: { insight: SurveyInsight }) {
  const [expanded, setExpanded] = useState(false);
  const confidence = CONFIDENCE_CONFIG[insight.confidence] ?? CONFIDENCE_CONFIG.low;
  const questions = insight.summary_json.questions ?? [];
  const narrativeLong = insight.narrative.length > 220;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        height: '100%',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <PollOutlinedIcon fontSize="small" color="primary" />
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {topicLabel(insight)}
            </Typography>
          </Stack>
          <Typography variant="caption" color="textSecondary">
            Generated {formatDate(insight.generated_at, 'MMM dd, yyyy')}
          </Typography>
        </Box>
        <Chip label={confidence.label} size="small" color={confidence.color} variant="outlined" />
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            {insight.sample_size}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            respondents
          </Typography>
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            {insight.completion_rate}%
          </Typography>
          <Typography variant="caption" color="textSecondary">
            completion rate
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ mt: 2, flex: 1 }}>
        {questions.slice(0, 3).map((question) => (
          <QuestionTopResponse key={question.question_id} question={question} />
        ))}
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="textSecondary" sx={{ lineHeight: 1.6 }}>
          {narrativeLong && !expanded ? `${insight.narrative.slice(0, 220).trim()}…` : insight.narrative}
        </Typography>
        {narrativeLong && (
          <Button size="small" onClick={() => setExpanded((v) => !v)} sx={{ mt: 0.5, px: 0 }}>
            {expanded ? 'Show less' : 'Read full insight'}
          </Button>
        )}
      </Box>

      <Link
        component={RouterLink}
        to="/inner-circle/surveys/drafts"
        variant="body2"
        sx={{ mt: 2, fontWeight: 600, alignSelf: 'flex-start' }}
      >
        View draft →
      </Link>
    </Paper>
  );
}

function LoadingSkeleton() {
  return (
    <Grid container spacing={gridSpacing}>
      {[0, 1].map((key) => (
        <Grid item xs={12} md={6} key={key}>
          <Skeleton variant="rounded" height={360} />
        </Grid>
      ))}
    </Grid>
  );
}

function EmptyState() {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 5,
        textAlign: 'center',
        borderRadius: 2,
        border: '1px dashed',
        borderColor: 'divider'
      }}
    >
      <InsightsOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
      <Typography variant="h4" gutterBottom>
        No survey insights yet
      </Typography>
      <Typography color="textSecondary" sx={{ maxWidth: 480, mx: 'auto' }}>
        After you send a trend survey and customers respond, run the aggregation job to generate owner-ready insights
        here.
      </Typography>
    </Paper>
  );
}

export default function InsightsDashboard() {
  const { data: insights = [], isLoading } = useQuery({
    queryKey: ['survey-insights'],
    queryFn: fetchSurveyInsights
  });

  return (
    <MainCard
      title={
        <Stack direction="row" spacing={1} alignItems="center">
          <InsightsOutlinedIcon color="primary" />
          <span>Insights</span>
        </Stack>
      }
      secondary="Trend-signal survey results from your Inner Circle"
    >
      {isLoading ? (
        <LoadingSkeleton />
      ) : insights.length === 0 ? (
        <EmptyState />
      ) : (
        <Grid container spacing={gridSpacing}>
          {insights.map((insight) => (
            <Grid item xs={12} md={6} key={insight.id}>
              <SurveyInsightCard insight={insight} />
            </Grid>
          ))}
        </Grid>
      )}
    </MainCard>
  );
}

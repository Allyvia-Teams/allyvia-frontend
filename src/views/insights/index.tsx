import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Box, Button, Chip, Container, Grid, LinearProgress, Link, Paper, Skeleton, Stack, Tab, Tabs, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import PollOutlinedIcon from '@mui/icons-material/PollOutlined';

import { useSelector, useDispatch } from 'store';
import {
  fetchSupplierRisk,
  generateSupplierRisk,
  fetchOverstock,
  generateOverstock,
  fetchSalesTrends,
  generateSalesTrends,
  generateWeatherInsight
} from 'store/slices/analytics';
import {
  fetchSurveyInsights,
  type SurveyInsight,
  type SurveyInsightConfidence,
  type SurveyInsightQuestionSummary
} from 'api/innerCircle.api';
import { gridSpacing } from 'store/constant';
import { formatDate } from 'utils/dateUtils';
import CompanyProfileCard from './components/CompanyProfileCard';
import SupplierRiskCard from './components/SupplierRiskCard';
import OverstockCard from './components/OverstockCard';
import SalesTrendsCard from './components/SalesTrendsCard';
import { WeatherForecastCard } from './components/weather';
import InsightCardLandscapeSkeleton from 'ui-component/insights/InsightCardLandscapeSkeleton';
import MainCard from 'ui-component/cards/MainCard';
import { INSIGHT_CATEGORIES, ALL_TAB_VALUE, InsightCategory } from './constants';

const CONFIDENCE_CONFIG: Record<SurveyInsightConfidence, { label: string; color: 'success' | 'warning' | 'default' }> = {
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

function SurveyLoadingSkeleton() {
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

function SurveyEmptyState() {
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
        After you send a trend survey and customers respond, run the aggregation job to generate owner-ready insights here.
      </Typography>
    </Paper>
  );
}

function SurveyInsightsSection() {
  const { data: insights = [], isLoading } = useQuery({
    queryKey: ['survey-insights'],
    queryFn: fetchSurveyInsights
  });

  return (
    <MainCard
      title={
        <Stack direction="row" spacing={1} alignItems="center">
          <InsightsOutlinedIcon color="primary" />
          <span>Survey Insights</span>
        </Stack>
      }
      secondary="Trend-signal survey results from your Inner Circle"
    >
      {isLoading ? (
        <SurveyLoadingSkeleton />
      ) : insights.length === 0 ? (
        <SurveyEmptyState />
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

export default function InsightsDashboard() {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState<string>(ALL_TAB_VALUE);

  const profile = useSelector((state) => state.analytics.companyProfile);

  const supplierRisk = useSelector((state) => state.analytics.supplierRisk);
  const supplierRiskLoading = useSelector((state) => state.analytics.supplierRiskLoading);
  const supplierRiskError = useSelector((state) => state.analytics.supplierRiskError);

  const overstock = useSelector((state) => state.analytics.overstock);
  const overstockLoading = useSelector((state) => state.analytics.overstockLoading);
  const overstockError = useSelector((state) => state.analytics.overstockError);

  const salesTrends = useSelector((state) => state.analytics.salesTrends);
  const salesTrendsLoading = useSelector((state) => state.analytics.salesTrendsLoading);
  const salesTrendsError = useSelector((state) => state.analytics.salesTrendsError);

  const weatherInsight = useSelector((state) => state.analytics.weatherInsight);
  const weatherInsightLoading = useSelector((state) => state.analytics.weatherInsightLoading);
  const weatherInsightError = useSelector((state) => state.analytics.weatherInsightError);
  const weatherInsightInput = useSelector((state) => state.analytics.weatherInsightInput);
  const weatherInsightDays = weatherInsightInput.value;

  useEffect(() => {
    // Insights are source-agnostic: once a company profile exists (generated from
    // whatever data was imported into Allyvia), load all insights regardless of
    // which data source (Square / QuickBooks / CSV) was connected.
    if (profile) {
      if (!supplierRisk && !supplierRiskLoading && !supplierRiskError) {
        dispatch(fetchSupplierRisk());
      }
      if (!overstock && !overstockLoading && !overstockError) {
        dispatch(fetchOverstock());
      }
      if (!salesTrends && !salesTrendsLoading && !salesTrendsError) {
        dispatch(fetchSalesTrends());
      }
      if (!weatherInsight && !weatherInsightLoading && !weatherInsightError) {
        dispatch(generateWeatherInsight({ days: weatherInsightDays, forceRefresh: false }));
      }
    }
  }, [
    profile,
    supplierRisk,
    supplierRiskLoading,
    supplierRiskError,
    overstock,
    overstockLoading,
    overstockError,
    salesTrends,
    salesTrendsLoading,
    salesTrendsError,
    weatherInsight,
    weatherInsightLoading,
    weatherInsightError,
    weatherInsightDays,
    dispatch
  ]);

  const showInsightsContent = !!profile;
  const is404 = supplierRiskError?.includes('404') || supplierRiskError?.toLowerCase().includes('not found');
  const overstockIs404 = overstockError?.includes('404') || overstockError?.toLowerCase().includes('not found');
  const weatherIs404 = weatherInsightError?.includes('404') || weatherInsightError?.toLowerCase().includes('not found');

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  const shouldShowInsight = (categoryId: InsightCategory) => {
    if (activeTab === ALL_TAB_VALUE) return true;
    return activeTab === categoryId;
  };

  const renderSupplierRiskInsight = () => {
    if (!shouldShowInsight('supplier-risk')) return null;

    if (supplierRiskLoading) {
      return <InsightCardLandscapeSkeleton />;
    }

    if (is404) {
      return (
        <MainCard title="Supplier Risk Concentration">
          <Box textAlign="center" py={3}>
            <Typography variant="body2" color="text.secondary" mb={2}>
              No analysis found. Generate insights to see supplier risk concentration.
            </Typography>
            <Button
              variant="contained"
              onClick={() => dispatch(generateSupplierRisk())}
              disabled={supplierRiskLoading}
              sx={{ color: 'white' }}
            >
              {supplierRiskLoading ? 'Generating...' : 'Generate Insights'}
            </Button>
          </Box>
        </MainCard>
      );
    }

    if (supplierRiskError && !is404) {
      return (
        <MainCard title="Supplier Risk Concentration">
          <Box textAlign="center" py={3}>
            <Typography variant="body2" color="error" mb={2}>
              Failed to load supplier risk analysis. Please try again.
            </Typography>
            <Button
              variant="contained"
              onClick={() => dispatch(generateSupplierRisk())}
              disabled={supplierRiskLoading}
              sx={{ color: 'white' }}
            >
              Retry
            </Button>
          </Box>
        </MainCard>
      );
    }

    if (supplierRisk && supplierRisk.has_data === false) {
      return (
        <MainCard title="Supplier Risk Concentration">
          <Box textAlign="center" py={3}>
            <Typography variant="body2" color="text.secondary">
              No vendor spend data is available yet. Supplier risk analysis is based on vendor bills, which are currently imported from
              QuickBooks. Connect QuickBooks and sync bills to unlock this insight.
            </Typography>
          </Box>
        </MainCard>
      );
    }

    if (supplierRisk) {
      return <SupplierRiskCard data={supplierRisk} />;
    }

    return null;
  };

  const renderOverstockInsight = () => {
    if (!shouldShowInsight('overstock')) return null;

    if (overstockLoading) {
      return <InsightCardLandscapeSkeleton />;
    }

    if (overstockIs404) {
      return (
        <MainCard title="Overstock Detection">
          <Box textAlign="center" py={3}>
            <Typography variant="body2" color="text.secondary" mb={2}>
              No analysis found. Generate insights to detect slow-moving inventory.
            </Typography>
            <Button variant="contained" onClick={() => dispatch(generateOverstock())} disabled={overstockLoading} sx={{ color: 'white' }}>
              {overstockLoading ? 'Generating...' : 'Generate Insights'}
            </Button>
          </Box>
        </MainCard>
      );
    }

    if (overstockError && !overstockIs404) {
      return (
        <MainCard title="Overstock Detection">
          <Box textAlign="center" py={3}>
            <Typography variant="body2" color="error" mb={2}>
              Failed to load overstock analysis. Please try again.
            </Typography>
            <Button variant="contained" onClick={() => dispatch(generateOverstock())} disabled={overstockLoading} sx={{ color: 'white' }}>
              Retry
            </Button>
          </Box>
        </MainCard>
      );
    }

    if (overstock) {
      return <OverstockCard data={overstock} />;
    }

    return null;
  };

  const renderSalesTrendsInsight = () => {
    if (!shouldShowInsight('sales-trends')) return null;

    if (salesTrendsLoading) {
      return <InsightCardLandscapeSkeleton />;
    }

    const salesTrendsIs404 = salesTrendsError?.includes('404') || salesTrendsError?.toLowerCase().includes('not found');

    if (salesTrendsIs404) {
      return (
        <MainCard title="Sales Forecasting">
          <Box textAlign="center" py={3}>
            <Typography variant="body2" color="text.secondary" mb={2}>
              No analysis found. Generate insights to see sales trends and predictions.
            </Typography>
            <Button
              variant="contained"
              onClick={() => dispatch(generateSalesTrends())}
              disabled={salesTrendsLoading}
              sx={{ color: 'white' }}
            >
              {salesTrendsLoading ? 'Generating...' : 'Generate Insights'}
            </Button>
          </Box>
        </MainCard>
      );
    }

    if (salesTrendsError && !salesTrendsIs404) {
      return (
        <MainCard title="Sales Forecasting">
          <Box textAlign="center" py={3}>
            <Typography variant="body2" color="error" mb={2}>
              Failed to load sales trends. Please try again.
            </Typography>
            <Button
              variant="contained"
              onClick={() => dispatch(generateSalesTrends())}
              disabled={salesTrendsLoading}
              sx={{ color: 'white' }}
            >
              Retry
            </Button>
          </Box>
        </MainCard>
      );
    }

    if (salesTrends && salesTrends.status === 'INSUFFICIENT_DATA') {
      return (
        <MainCard title="Sales Forecasting">
          <Box textAlign="center" py={3}>
            <Typography variant="body2" color="text.secondary">
              {salesTrends.message || 'There are not enough records to make predictions'}
            </Typography>
          </Box>
        </MainCard>
      );
    }

    if (salesTrends && salesTrends.status === 'NO_DATA') {
      return (
        <MainCard title="Sales Forecasting">
          <Box textAlign="center" py={3}>
            <Typography variant="body2" color="text.secondary">
              {salesTrends.message || 'No sales data available yet'}
            </Typography>
          </Box>
        </MainCard>
      );
    }

    if (salesTrends && salesTrends.status === 'SUCCESS') {
      return <SalesTrendsCard data={salesTrends} />;
    }

    return null;
  };

  const renderWeatherInsight = () => {
    if (!shouldShowInsight('weather')) return null;

    if (weatherInsightLoading && !weatherInsight) {
      return <InsightCardLandscapeSkeleton />;
    }

    if (weatherInsightError && !weatherIs404 && !weatherInsight) {
      return (
        <MainCard title="Weather Business Insights">
          <Box textAlign="center" py={3}>
            <Typography variant="body2" color="error" mb={2}>
              Failed to load weather insights: {weatherInsightError}
            </Typography>
            <Button
              variant="contained"
              onClick={() => dispatch(generateWeatherInsight({ days: 7, forceRefresh: true }))}
              disabled={weatherInsightLoading}
              sx={{ color: 'white' }}
            >
              Retry
            </Button>
          </Box>
        </MainCard>
      );
    }

    if (weatherInsight) {
      return (
        <WeatherForecastCard
          data={weatherInsight}
          onRefresh={(days, forceRefresh) => dispatch(generateWeatherInsight({ days, forceRefresh }))}
          loading={weatherInsightLoading}
        />
      );
    }

    return null;
  };

  const renderPlaceholderInsight = (categoryId: InsightCategory) => {
    if (!shouldShowInsight(categoryId)) return null;
    const category = INSIGHT_CATEGORIES.find((cat) => cat.id === categoryId);
    if (!category || category.implemented) return null;
    return <InsightCardLandscapeSkeleton key={categoryId} />;
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <CompanyProfileCard />

        {showInsightsContent && (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                <Tab label="All" value={ALL_TAB_VALUE} />
                {INSIGHT_CATEGORIES.map((category) => (
                  <Tab key={category.id} label={category.label} value={category.id} />
                ))}
              </Tabs>
            </Box>

            <Stack spacing={3}>
              {renderSalesTrendsInsight()}
              {renderSupplierRiskInsight()}
              {renderOverstockInsight()}
              {renderWeatherInsight()}
              {renderPlaceholderInsight('spending-patterns')}
              {renderPlaceholderInsight('forecast')}
              {renderPlaceholderInsight('cash-flow')}
            </Stack>
          </>
        )}

        <Box sx={{ mt: 3 }}>
          <SurveyInsightsSection />
        </Box>
      </Box>
    </Container>
  );
}

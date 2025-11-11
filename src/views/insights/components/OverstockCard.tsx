import { Box, Typography, LinearProgress } from '@mui/material';
import { IconPackage, IconBox, IconAlertTriangle, IconCash } from '@tabler/icons-react';
import BaseInsightCard from 'ui-component/insights/BaseInsightCard';
import AllyviaSubcard from 'ui-component/common/AllyviaSubcard';
import MetricCardsRow from 'ui-component/insights/MetricCardsRow';
import { OverstockAnalysis } from 'types/analytics';

interface OverstockCardProps {
  data: OverstockAnalysis;
}

const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function OverstockCard({ data }: OverstockCardProps) {
  const topItems = data.slow_moving_items.slice(0, 5);
  const maxDaysOnHand = Math.max(...topItems.map((item) => item.days_on_hand), 1);

  const getProgressColor = (daysOnHand: number): 'error' | 'warning' | 'primary' => {
    if (daysOnHand >= 60) return 'error';
    if (daysOnHand >= 30) return 'warning';
    return 'primary';
  };

  return (
    <BaseInsightCard title="Overstock Detection" urgency={data.urgency} customIcon={IconPackage}>
      <MetricCardsRow>
        <AllyviaSubcard
          value={data.total_items_analyzed}
          label="Items Analyzed"
          subtitle={`Last ${data.analysis_days} days`}
          icon={<IconBox />}
          height={120}
        />
        <AllyviaSubcard value={data.slow_moving_count} label="Slow-Moving Items" icon={<IconAlertTriangle />} height={120} />
        <AllyviaSubcard value={formatCurrency(data.total_capital_tied)} label="Capital Tied Up" icon={<IconCash />} height={120} />
      </MetricCardsRow>

      <Box mb={3}>
        <Typography variant="h5" gutterBottom>
          Top Slow-Moving Items
        </Typography>

        {topItems.map((item, idx) => (
          <Box key={idx} sx={{ mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="body2" fontWeight="medium">
                {idx + 1}. {item.item_name}
              </Typography>
              <Typography variant="body2" fontWeight="bold" color="text.secondary">
                {item.days_on_hand.toFixed(1)} days on hand
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(item.days_on_hand / maxDaysOnHand) * 100}
              color={getProgressColor(item.days_on_hand)}
              sx={{ height: 8, borderRadius: 1, mb: 0.5 }}
            />
            <Typography variant="caption" color="text.secondary">
              {item.quantity_on_hand} units · Velocity: {item.sales_velocity.toFixed(2)}/day · Sold: {item.units_sold_in_period} units ·{' '}
              {formatCurrency(item.capital_tied)} tied up
            </Typography>
          </Box>
        ))}
      </Box>

      {data.llm_insights && (
        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
          <Typography variant="h3" gutterBottom>
            AI Insights
          </Typography>

          <Typography variant="body2" color="text.secondary" paragraph>
            {data.llm_insights.summary}
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
            Root Causes
          </Typography>
          <Box sx={{ pl: 2, mb: 2 }}>
            {data.llm_insights.root_causes.map((cause, idx) => (
              <Typography key={idx} variant="body2" color="text.secondary" gutterBottom>
                • {cause}
              </Typography>
            ))}
          </Box>

          <Typography variant="h5" gutterBottom>
            Recommendations
          </Typography>
          <Box sx={{ pl: 2, mb: 2 }}>
            {data.llm_insights.recommendations.map((rec, idx) => (
              <Typography key={idx} variant="body2" color="text.secondary" gutterBottom>
                • {rec}
              </Typography>
            ))}
          </Box>

          <Typography variant="h5" gutterBottom>
            Financial Impact
          </Typography>
          <Box sx={{ pl: 2, mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {data.llm_insights.financial_impact.potential_savings}
            </Typography>
            {data.llm_insights.financial_impact.cost_benefit_points.map((point, idx) => (
              <Typography key={idx} variant="body2" color="text.secondary" gutterBottom>
                • {point}
              </Typography>
            ))}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <strong>Timeline:</strong> {data.llm_insights.financial_impact.timeline}
            </Typography>
          </Box>

          <Typography variant="h5" gutterBottom>
            Immediate Actions
          </Typography>
          <Box sx={{ pl: 2, mb: 2 }}>
            {data.llm_insights.immediate_actions.map((action, idx) => (
              <Typography key={idx} variant="body2" color="text.secondary" gutterBottom>
                {idx + 1}. {action}
              </Typography>
            ))}
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
            {data.llm_insights.urgency_reason}
          </Typography>
        </Box>
      )}
    </BaseInsightCard>
  );
}

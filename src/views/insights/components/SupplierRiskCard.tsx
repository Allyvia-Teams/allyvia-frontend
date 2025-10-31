import { Box, Typography, LinearProgress } from '@mui/material';
import { IconTrendingUp, IconBuildingStore, IconCalendar, IconTruck } from '@tabler/icons-react';
import BaseInsightCard from 'ui-component/insights/BaseInsightCard';
import { SupplierRiskAnalysis } from 'types/analytics';

interface SupplierRiskCardProps {
  data: SupplierRiskAnalysis;
}

export default function SupplierRiskCard({ data }: SupplierRiskCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const topVendors = data.vendor_breakdown.slice(0, 3);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 70) return 'warning';
    return 'primary';
  };

  return (
    <BaseInsightCard title="Supplier Risk Concentration" urgency={data.urgency} customIcon={IconTruck}>
      <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }} mb={3}>
        <Box
          flex={1}
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 1,
              bgcolor: 'primary.lighter',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IconTrendingUp size={24} color="primary" />
          </Box>
          <Box>
            <Typography variant="h4">{formatCurrency(data.total_spend)}</Typography>
            <Typography variant="caption" color="text.secondary">
              Total Spend (Last {data.days_analyzed} days)
            </Typography>
          </Box>
        </Box>

        <Box
          flex={1}
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 1,
              bgcolor: getProgressColor(data.top_vendor_percentage) === 'error' ? 'error.lighter' : 'warning.lighter',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IconBuildingStore size={24} />
          </Box>
          <Box>
            <Typography variant="h4">{data.top_vendor_percentage.toFixed(1)}%</Typography>
            <Typography variant="caption" color="text.secondary">
              Top Vendor Concentration
            </Typography>
          </Box>
        </Box>

        <Box
          flex={1}
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 1,
              bgcolor: 'secondary.lighter',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IconCalendar size={24} />
          </Box>
          <Box>
            <Typography variant="h4">{data.vendor_count}</Typography>
            <Typography variant="caption" color="text.secondary">
              Vendors Tracked
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box mb={3}>
        <Typography variant="h5" gutterBottom>
          Top Vendors by Spend
        </Typography>

        {topVendors.map((vendor, idx) => (
          <Box key={idx} sx={{ mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="body2" fontWeight="medium">
                {idx + 1}. {vendor.vendor_name}
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {vendor.percentage.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(vendor.percentage, 100)}
              color={getProgressColor(vendor.percentage)}
              sx={{ height: 8, borderRadius: 1, mb: 0.5 }}
            />
            <Typography variant="caption" color="text.secondary">
              {formatCurrency(vendor.total_spend)} · {vendor.bill_count} bills
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
            Risk Points
          </Typography>
          <Box sx={{ pl: 2, mb: 2 }}>
            {data.llm_insights.risk_points.map((point, idx) => (
              <Typography key={idx} variant="body2" color="text.secondary" gutterBottom>
                • {point}
              </Typography>
            ))}
          </Box>

          <Typography variant="h5" gutterBottom>
            Root Causes
          </Typography>
          <Box sx={{ pl: 2, mb: 2 }}>
            {data.llm_insights.root_causes.map((cause, idx) => (
              <Typography key={idx} variant="body2" color="text.secondary" gutterBottom>
                • {cause}
              </Typography>
            ))}
          </Box>

          {data.llm_insights.recommendations.length > 0 && (
            <>
              <Typography variant="h5" gutterBottom>
                Recommendations
              </Typography>
              <Box sx={{ pl: 2, mb: 2 }}>
                {data.llm_insights.recommendations.map((rec, idx) => (
                  <Box key={idx} sx={{ mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" fontWeight="medium">
                      {rec.vendor_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {rec.reason}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Action: {rec.action}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </>
          )}

          <Typography variant="h5" gutterBottom>
            Financial Impact
          </Typography>
          <Box sx={{ pl: 2, mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {data.llm_insights.financial_impact.potential_savings_description}
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

          <Typography variant="h5" gutterBottom>
            Industry Benchmarks
          </Typography>
          <Box sx={{ pl: 2, mb: 2 }}>
            {data.llm_insights.industry_benchmarks.map((benchmark, idx) => (
              <Typography key={idx} variant="body2" color="text.secondary" gutterBottom>
                • {benchmark}
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

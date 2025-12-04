import { Chip, Tooltip, Box, Typography } from '@mui/material';
import { ConfidenceScore } from 'types/analytics';

interface ConfidenceIndicatorProps {
  confidence: ConfidenceScore;
}

export default function ConfidenceIndicator({ confidence }: ConfidenceIndicatorProps) {
  const getColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'success';
      case 'medium':
        return 'warning';
      case 'low':
        return 'error';
      default:
        return 'default';
    }
  };

  const tooltipContent = (
    <Box sx={{ p: 1 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Confidence Breakdown
      </Typography>
      <Box sx={{ mb: 1 }}>
        <Typography variant="body2">
          <strong>Overall:</strong> {confidence.overall_score}/100
        </Typography>
        <Typography variant="body2">
          <strong>Data Quality:</strong> {confidence.data_quality_score}/100
        </Typography>
        <Typography variant="body2">
          <strong>Model Confidence:</strong> {confidence.model_confidence_score}/100
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
        {confidence.reasoning}
      </Typography>
      {confidence.limitations.length > 0 && (
        <>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', mb: 0.5 }}>
            Limitations:
          </Typography>
          {confidence.limitations.map((limitation, index) => (
            <Typography key={index} variant="caption" sx={{ display: 'block', mb: 0.5 }}>
              • {limitation}
            </Typography>
          ))}
        </>
      )}
      <Typography variant="caption" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
        {confidence.reliability_notes}
      </Typography>
    </Box>
  );

  return (
    <Tooltip title={tooltipContent} arrow>
      <Chip
        label={`${confidence.level.toUpperCase()} CONFIDENCE (${confidence.overall_score}/100)`}
        color={getColor(confidence.level)}
        size="small"
        sx={{ cursor: 'help' }}
      />
    </Tooltip>
  );
}

import { Box, Typography, Chip, Skeleton, Tooltip, Popover, Paper } from '@mui/material';
import { IconMapPin, IconCalendar } from '@tabler/icons-react';
import { WeatherInsight } from 'types/analytics';
import { formatDateOnly, formatUTCToLocal } from 'utils/dateUtils';
import { useState, MouseEvent } from 'react';

interface MetadataBannerProps {
  data: WeatherInsight;
  loading?: boolean;
}

export default function MetadataBanner({ data, loading }: MetadataBannerProps) {
  const [confidenceAnchorEl, setConfidenceAnchorEl] = useState<HTMLElement | null>(null);

  const handleConfidenceClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setConfidenceAnchorEl(event.currentTarget);
  };

  const handleConfidenceClose = () => {
    setConfidenceAnchorEl(null);
  };

  const confidenceOpen = Boolean(confidenceAnchorEl);

  if (loading) {
    return (
      <Box sx={{ mb: 3 }}>
        <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        mb: 3,
        flexWrap: 'wrap',
        p: 2.5,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: '#f8f9fa',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center', flex: 1, minWidth: '120px' }}>
        <Typography variant="caption" sx={{ color: '#6c757d', fontWeight: 500, textAlign: 'center' }}>
          Forecast Period
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          <IconCalendar size={16} color="#6c757d" />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {data.forecast_days} day{data.forecast_days !== 1 ? 's' : ''}
          </Typography>
          {data.forecast_start_date && data.forecast_end_date && (
            <Typography variant="caption" sx={{ color: '#6c757d', ml: 0.5 }}>
              ({formatDateOnly(data.forecast_start_date, 'MMM dd')} - {formatDateOnly(data.forecast_end_date, 'MMM dd')})
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center', flex: 1, minWidth: '120px' }}>
        <Typography variant="caption" sx={{ color: '#6c757d', fontWeight: 500, textAlign: 'center' }}>
          Location
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
          <IconMapPin size={16} color="#6c757d" />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {data.location.city
              ? data.location.state
                ? `${data.location.city}, ${data.location.state}, ${data.location.country}`
                : `${data.location.city}, ${data.location.country}`
              : data.location.pos
                ? `${data.location.pos.lat.toFixed(2)}°, ${data.location.pos.long.toFixed(2)}°`
                : 'Location unknown'}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center', flex: 1, minWidth: '120px' }}>
        <Typography variant="caption" sx={{ color: '#6c757d', fontWeight: 500, textAlign: 'center' }}>
          {data.updated_at ? 'Last Updated (Local Time)' : 'Generated (Local Time)'}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'center' }}>
          {formatUTCToLocal(data.updated_at || data.generated_at, 'MMM dd, yyyy HH:mm')}
        </Typography>
      </Box>

      <Box
        sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center', flex: 1, minWidth: '120px', position: 'relative' }}
      >
        <Typography variant="caption" sx={{ color: '#6c757d', fontWeight: 500, textAlign: 'center' }}>
          Confidence Score
        </Typography>
        <Tooltip title="Click for details" arrow>
          <Chip
            label={`${data.confidence.overall_score}%`}
            onClick={handleConfidenceClick}
            sx={{
              bgcolor: data.confidence.overall_score >= 70 ? '#e8f5e9' : data.confidence.overall_score >= 40 ? '#fff3e0' : '#ffebee',
              color: data.confidence.overall_score >= 70 ? '#2e7d32' : data.confidence.overall_score >= 40 ? '#e65100' : '#c62828',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              position: 'relative',
              zIndex: 1,
              minWidth: 'fit-content',
              '&:hover': {
                opacity: 0.9
              },
              '&:active': {
                transform: 'none',
                boxShadow: 'none'
              },
              '&:focus': {
                outline: 'none'
              }
            }}
          />
        </Tooltip>
        <Popover
          open={confidenceOpen}
          anchorEl={confidenceAnchorEl}
          onClose={handleConfidenceClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center'
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center'
          }}
          disableRestoreFocus
          disableScrollLock
          sx={{
            zIndex: 1300,
            '& .MuiPopover-paper': {
              marginTop: '4px'
            }
          }}
        >
          <Paper sx={{ p: 2, maxWidth: 400 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Confidence Score Breakdown
            </Typography>
            <Box sx={{ mb: 2, mt: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Overall Score:</strong> {data.confidence.overall_score}/100 ({data.confidence.level.toUpperCase()})
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Data Quality:</strong> {data.confidence.data_quality_score}/100
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Insights Quality:</strong> {data.confidence.insights_quality_score}/100
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Model Confidence:</strong> {data.confidence.model_confidence_score}/100
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', mb: 1.5 }}>
              <strong>Reasoning:</strong> {data.confidence.reasoning}
            </Typography>
            {data.confidence.limitations && data.confidence.limitations.length > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                  Limitations:
                </Typography>
                {data.confidence.limitations.map((limitation, index) => (
                  <Typography key={index} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    • {limitation}
                  </Typography>
                ))}
              </Box>
            )}
            {data.confidence.reliability_notes && (
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', mt: 1 }}>
                {data.confidence.reliability_notes}
              </Typography>
            )}
          </Paper>
        </Popover>
      </Box>
    </Box>
  );
}

import { Box, Typography, Chip } from '@mui/material';
import { IconAlertTriangle, IconAlertCircle, IconInfoCircle, IconChevronRight } from '@tabler/icons-react';
import { CriticalAlert } from 'types/analytics';
import { formatDateOnly } from 'utils/dateUtils';

interface AlertBadgeProps {
  alert: CriticalAlert;
}

// Helper function to properly capitalize time blocks
const capitalizeTimeBlock = (timeBlock: string): string => {
  return timeBlock
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function AlertBadge({ alert }: AlertBadgeProps) {
  const getUrgencyConfig = (urgency: string) => {
    switch (urgency) {
      case 'URGENT':
        return {
          accentColor: '#d32f2f',
          bgColor: '#ffebee',
          icon: IconAlertTriangle
        };
      case 'WARNING':
        return {
          accentColor: '#ed6c02',
          bgColor: '#fff3e0',
          icon: IconAlertCircle
        };
      case 'INFO':
      default:
        return {
          accentColor: '#0288d1',
          bgColor: '#e3f2fd',
          icon: IconInfoCircle
        };
    }
  };

  const config = getUrgencyConfig(alert.urgency);
  const Icon = config.icon;

  return (
    <Box
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderLeft: '4px solid',
        borderLeftColor: config.accentColor,
        borderRadius: 1.5,
        bgcolor: 'background.paper',
        transition: 'all 0.2s ease',
        overflow: 'hidden',
        width: '100%',
        display: 'flex',
        gap: 1.5,
        alignItems: 'center',
        position: 'relative',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          borderColor: 'divider',
          transform: 'translateY(-1px)',
          '& .chevron-icon': {
            opacity: 1,
            transform: 'translateY(-50%) translateX(0)'
          }
        }
      }}
    >
      {/* Icon - Vertically Centered */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: '50%',
          bgcolor: config.bgColor,
          color: config.accentColor,
          flexShrink: 0,
          border: '1px solid',
          borderColor: config.bgColor
        }}
      >
        <Icon size={20} />
      </Box>

      {/* Content - Left Aligned */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              px: 1.5,
              py: 0.5,
              borderRadius: '12px',
              bgcolor: config.bgColor,
              color: config.accentColor,
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              height: 24,
              flexShrink: 0
            }}
          >
            {alert.urgency}
          </Box>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.75rem',
              fontWeight: 500,
              flexShrink: 0
            }}
          >
            {formatDateOnly(alert.date, 'weekDate')} • {capitalizeTimeBlock(alert.time_block)}
          </Typography>
        </Box>

        {/* Title */}
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            mb: 0.75,
            color: 'text.primary',
            fontSize: '0.9375rem',
            lineHeight: 1.4,
            wordBreak: 'break-word'
          }}
        >
          {alert.alert_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
        </Typography>

        {/* Description */}
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            fontSize: '0.875rem',
            lineHeight: 1.5,
            wordBreak: 'break-word'
          }}
        >
          {alert.impact}
        </Typography>
      </Box>

      {/* Chevron Icon - Appears on Hover */}
      <Box
        className="chevron-icon"
        sx={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%) translateX(4px)',
          opacity: 0,
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary'
        }}
      >
        <IconChevronRight size={20} style={{ color: 'inherit' }} />
      </Box>
    </Box>
  );
}

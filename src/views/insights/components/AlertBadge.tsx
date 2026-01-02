import { Box, Typography, Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { IconAlertTriangle, IconAlertCircle, IconInfoCircle, IconChevronRight } from '@tabler/icons-react';
import { CriticalAlert } from 'types/analytics';
import { formatDateOnly } from 'utils/dateUtils';
import { COLORS } from 'styles/colors';

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
    // Normalize urgency to uppercase for case-insensitive matching
    const normalizedUrgency = (urgency || '').toUpperCase().trim();

    switch (normalizedUrgency) {
      case 'URGENT':
        return {
          borderColor: COLORS.badRed,
          iconBgColor: alpha(COLORS.badRed, 0.1),
          iconColor: COLORS.badRed,
          chipBgColor: alpha(COLORS.badRed, 0.1),
          chipTextColor: COLORS.badRed,
          icon: IconAlertCircle
        };
      case 'WARNING':
        return {
          borderColor: COLORS.orange500,
          iconBgColor: alpha(COLORS.orange500, 0.1),
          iconColor: COLORS.orange500,
          chipBgColor: alpha(COLORS.orange500, 0.1),
          chipTextColor: COLORS.orange500,
          icon: IconAlertTriangle
        };
      case 'INFO':
        return {
          borderColor: COLORS.primaryBlue,
          iconBgColor: alpha(COLORS.primaryBlue, 0.1),
          iconColor: COLORS.primaryBlue,
          chipBgColor: alpha(COLORS.primaryBlue, 0.1),
          chipTextColor: COLORS.primaryBlue,
          icon: IconInfoCircle
        };
      default:
        // Default to WARNING colors if urgency is not recognized
        return {
          borderColor: COLORS.orange500,
          iconBgColor: alpha(COLORS.orange500, 0.1),
          iconColor: COLORS.orange500,
          chipBgColor: alpha(COLORS.orange500, 0.1),
          chipTextColor: COLORS.orange500,
          icon: IconAlertTriangle
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
        borderLeftColor: config.borderColor,
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
          bgcolor: config.iconBgColor,
          color: config.iconColor,
          flexShrink: 0,
          border: '1px solid',
          borderColor: config.iconBgColor
        }}
      >
        <Icon size={20} />
      </Box>

      {/* Content - Left Aligned */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
          <Chip
            label={alert.urgency}
            size="small"
            sx={{
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              height: 24,
              flexShrink: 0,
              bgcolor: config.chipBgColor,
              color: config.chipTextColor,
              border: 'none',
              '& .MuiChip-label': {
                px: 1.5
              }
            }}
          />
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

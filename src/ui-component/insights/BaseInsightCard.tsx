import { ReactNode, useState, MouseEvent } from 'react';
import { Box, Chip, Typography, Tooltip, Popover, Paper } from '@mui/material';
import { IconAlertTriangle, IconAlertCircle, IconInfoCircle, Icon as TablerIcon } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';

export type UrgencyLevel = 'URGENT' | 'WARNING' | 'INFO';

interface PriorityDetails {
  requires_immediate_action?: boolean;
  high_impact_periods?: number;
  days_until_critical?: number | null;
  critical_periods?: Array<{
    day: number;
    date: string;
    impact: string;
  }>;
}

interface BaseInsightCardProps {
  title: string;
  urgency: UrgencyLevel;
  children: ReactNode;
  customIcon?: TablerIcon;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  priorityDetails?: PriorityDetails;
}

const urgencyConfig = {
  URGENT: {
    color: 'error' as const,
    icon: IconAlertTriangle,
    label: 'Urgent Priority',
    description: 'Critical conditions detected requiring immediate attention'
  },
  WARNING: {
    color: 'warning' as const,
    icon: IconAlertCircle,
    label: 'High Priority',
    description: 'High-impact periods identified that need attention'
  },
  INFO: {
    color: 'primary' as const,
    icon: IconInfoCircle,
    label: 'Normal Priority',
    description: 'Standard conditions with no immediate concerns'
  }
};

export default function BaseInsightCard({ title, urgency, children, customIcon, onRefresh, isRefreshing, priorityDetails }: BaseInsightCardProps) {
  const config = urgencyConfig[urgency];
  const Icon = customIcon || config.icon;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleChipClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const getStatusExplanation = (): string[] => {
    if (!priorityDetails) return [config.description];

    const explanations: string[] = [config.description];

    if (priorityDetails.requires_immediate_action) {
      explanations.push('• Immediate action required');
    }

    if (priorityDetails.high_impact_periods !== undefined && priorityDetails.high_impact_periods > 0) {
      explanations.push(
        `• ${priorityDetails.high_impact_periods} high-impact period${priorityDetails.high_impact_periods > 1 ? 's' : ''} detected`
      );
    }

    if (priorityDetails.days_until_critical !== null && priorityDetails.days_until_critical !== undefined) {
      if (priorityDetails.days_until_critical > 0) {
        explanations.push(
          `• Critical conditions expected in ${priorityDetails.days_until_critical} day${priorityDetails.days_until_critical > 1 ? 's' : ''}`
        );
      } else {
        explanations.push('• Critical conditions are imminent');
      }
    }

    if (priorityDetails.critical_periods && priorityDetails.critical_periods.length > 0) {
      explanations.push(
        `• ${priorityDetails.critical_periods.length} critical period${priorityDetails.critical_periods.length > 1 ? 's' : ''} identified:`
      );
      priorityDetails.critical_periods.slice(0, 3).forEach((period, idx) => {
        explanations.push(`  - ${period.date}: ${period.impact}`);
      });
      if (priorityDetails.critical_periods.length > 3) {
        explanations.push(`  ... and ${priorityDetails.critical_periods.length - 3} more`);
      }
    }

    return explanations;
  };

  const cardTitle = (
    <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
      <Box display="flex" alignItems="center" gap={1.5}>
        <Icon size={24} />
        <Typography variant="h4">{title}</Typography>
      </Box>
      <Box sx={{ position: 'relative' }}>
        <Tooltip title="Click for details" arrow>
          <Chip
            label={config.label}
            color={config.color}
            size="small"
            onClick={handleChipClick}
            sx={{
              cursor: 'pointer',
              fontWeight: 500,
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
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right'
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right'
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
              Priority Status: {config.label}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', mt: 1 }}>
              {getStatusExplanation().join('\n')}
            </Typography>
          </Paper>
        </Popover>
      </Box>
    </Box>
  );

  return (
    <MainCard title={cardTitle} onRefresh={onRefresh} isRefreshing={isRefreshing}>
      {children}
    </MainCard>
  );
}

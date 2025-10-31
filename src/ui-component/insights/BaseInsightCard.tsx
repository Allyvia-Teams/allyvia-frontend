import { ReactNode } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { IconAlertTriangle, IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';
import { Icon as TablerIcon } from '@tabler/icons-react';

export type UrgencyLevel = 'URGENT' | 'WARNING' | 'INFO';

interface BaseInsightCardProps {
  title: string;
  urgency: UrgencyLevel;
  children: ReactNode;
  customIcon?: TablerIcon;
}

const urgencyConfig = {
  URGENT: {
    color: 'error' as const,
    icon: IconAlertTriangle,
    label: 'URGENT'
  },
  WARNING: {
    color: 'warning' as const,
    icon: IconAlertCircle,
    label: 'WARNING'
  },
  INFO: {
    color: 'primary' as const,
    icon: IconInfoCircle,
    label: 'INFO'
  }
};

export default function BaseInsightCard({ title, urgency, children, customIcon }: BaseInsightCardProps) {
  const config = urgencyConfig[urgency];
  const Icon = customIcon || config.icon;

  const cardTitle = (
    <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
      <Box display="flex" alignItems="center" gap={1.5}>
        <Icon size={24} />
        <Typography variant="h4">{title}</Typography>
      </Box>
      <Chip label={config.label} color={config.color} size="small" />
    </Box>
  );

  return <MainCard title={cardTitle}>{children}</MainCard>;
}

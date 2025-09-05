import React from 'react';
import { useSelector } from 'store';
import { Box, Typography, Chip } from '@mui/material';
import { IconBuilding } from '@tabler/icons-react';

interface CompanySelectorProps {
  variant?: 'outlined' | 'filled' | 'standard';
  size?: 'small' | 'medium';
  showLabel?: boolean;
  showIcon?: boolean;
}

export const CompanySelector: React.FC<CompanySelectorProps> = ({ showIcon = true }) => {
  const { currentRole } = useSelector((state) => state.auth);

  if (!currentRole) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {showIcon && <IconBuilding size={20} />}
        <Typography variant="body2" color="text.secondary">
          No company selected
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {showIcon && <IconBuilding size={20} />}
      <Chip label={currentRole.company_name || 'Unknown Company'} size="small" color="primary" variant="outlined" />
      <Chip label={currentRole.role_display || currentRole.role_type} size="small" color="secondary" variant="outlined" />
    </Box>
  );
};

export default CompanySelector;

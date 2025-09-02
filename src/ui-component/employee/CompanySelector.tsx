import React, { useState } from 'react';
import { useSelector, useDispatch } from 'store';
import { Box, FormControl, InputLabel, Select, MenuItem, Typography, Chip } from '@mui/material';
import { IconBuilding } from '@tabler/icons-react';
import { switchRole } from 'store/slices/auth';

interface CompanySelectorProps {
  variant?: 'outlined' | 'filled' | 'standard';
  size?: 'small' | 'medium';
  showLabel?: boolean;
  showIcon?: boolean;
}

export const CompanySelector: React.FC<CompanySelectorProps> = ({
  variant = 'outlined',
  size = 'medium',
  showLabel = true,
  showIcon = true
}) => {
  const dispatch = useDispatch();
  const { roles, currentRole } = useSelector((state) => state.auth);
  const [isSwitching, setIsSwitching] = useState(false);

  const handleCompanyChange = async (roleId: string) => {
    if (roleId === currentRole?.id) return;

    setIsSwitching(true);
    try {
      await dispatch(switchRole(roleId)).unwrap();
    } catch (error) {
      console.error('Failed to switch company:', error);
    } finally {
      setIsSwitching(false);
    }
  };

  if (!roles || roles.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {showIcon && <IconBuilding size={20} />}
        <Typography variant="body2" color="text.secondary">
          No companies available
        </Typography>
      </Box>
    );
  }

  if (roles.length === 1) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {showIcon && <IconBuilding size={20} />}
        <Chip label={currentRole?.company_name || 'Unknown Company'} size="small" color="primary" variant="outlined" />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {showIcon && <IconBuilding size={20} />}
      <FormControl variant={variant} size={size} sx={{ minWidth: 200 }} disabled={isSwitching}>
        {showLabel && <InputLabel id="company-selector-label">Company</InputLabel>}
        <Select
          labelId="company-selector-label"
          id="company-selector"
          value={currentRole?.id || ''}
          label={showLabel ? 'Company' : undefined}
          onChange={(e) => handleCompanyChange(e.target.value)}
          renderValue={(selected) => {
            const role = roles.find((r) => r.id === selected);
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" noWrap>
                  {role?.company_name || 'Select Company'}
                </Typography>
                {role && <Chip label={role.role_display} size="small" color="secondary" variant="outlined" />}
              </Box>
            );
          }}
        >
          {roles.map((role) => (
            <MenuItem key={role.id} value={role.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Typography variant="body2">{role.company_name}</Typography>
                <Chip label={role.role_display} size="small" color="secondary" variant="outlined" />
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default CompanySelector;

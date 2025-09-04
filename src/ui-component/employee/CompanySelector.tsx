import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'store';
import { Box, FormControl, InputLabel, Select, MenuItem, Typography, Chip } from '@mui/material';
import { IconBuilding } from '@tabler/icons-react';
import { switchRole } from 'store/slices/auth';
import { fetchCompanies } from 'store/slices/company';

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
  const { companies, selectedCompany, isLoading } = useSelector((state) => state.company);
  const { currentRole, roles } = useSelector((state) => state.auth);
  const [isSwitching, setIsSwitching] = useState(false);

  // Fetch companies when component mounts
  useEffect(() => {
    dispatch(fetchCompanies());
  }, [dispatch]);

  const handleCompanyChange = async (companyId: string) => {
    if (companyId === currentRole?.company_id) return;

    setIsSwitching(true);
    try {
      // Find the role that corresponds to this company
      const targetRole = roles.find((role) => role.company_id === companyId);

      if (targetRole) {
        await dispatch(switchRole(targetRole.id)).unwrap();
      } else {
        console.error('No role found for company:', companyId);
      }
    } catch (error) {
      console.error('Failed to switch company:', error);
    } finally {
      setIsSwitching(false);
    }
  };

  if (!companies || companies.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {showIcon && <IconBuilding size={20} />}
        <Typography variant="body2" color="text.secondary">
          No companies available
        </Typography>
      </Box>
    );
  }

  if (companies.length === 1) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {showIcon && <IconBuilding size={20} />}
        <Chip label={companies[0].name || 'Unknown Company'} size="small" color="primary" variant="outlined" />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {showIcon && <IconBuilding size={20} />}
      <FormControl variant={variant} size={size} sx={{ minWidth: 200 }} disabled={isSwitching || isLoading}>
        {showLabel && <InputLabel id="company-selector-label">Company</InputLabel>}
        <Select
          labelId="company-selector-label"
          id="company-selector"
          value={currentRole?.company_id || ''}
          label={showLabel ? 'Company' : undefined}
          onChange={(e) => handleCompanyChange(e.target.value)}
          renderValue={(selected) => {
            const company = companies.find((c) => c.id === selected);
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" noWrap>
                  {company?.name || 'Select Company'}
                </Typography>
                {company && <Chip label={company.user_role} size="small" color="secondary" variant="outlined" />}
              </Box>
            );
          }}
        >
          {companies.map((company) => (
            <MenuItem key={company.id} value={company.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Typography variant="body2">{company.name}</Typography>
                <Chip label={company.user_role} size="small" color="secondary" variant="outlined" />
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default CompanySelector;

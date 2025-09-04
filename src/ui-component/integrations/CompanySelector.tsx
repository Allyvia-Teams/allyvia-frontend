import { FormControl, InputLabel, Select, MenuItem, Typography, Box, Alert } from '@mui/material';
import { CompanyWithRole } from 'types/company';
import { IconBuilding } from '@tabler/icons-react';
import { useTheme } from '@mui/material/styles';

interface CompanySelectorProps {
  companies: CompanyWithRole[];
  selectedCompanyId: string | null;
  onCompanyChange: (companyId: string) => void;
  disabled?: boolean;
}

export default function CompanySelector({ companies, selectedCompanyId, onCompanyChange, disabled = false }: CompanySelectorProps) {
  const theme = useTheme();

  const adminCompanies = companies.filter((c) => c.user_role === 'admin');
  const hasNonAdminCompanies = companies.some((c) => c.user_role !== 'admin');

  if (adminCompanies.length === 0) {
    return <Alert severity="info">No companies with admin access available.</Alert>;
  }

  if (adminCompanies.length === 1) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        <IconBuilding size={20} color={theme.palette.primary.main} />
        <Typography variant="body1">
          <strong>Company:</strong> {adminCompanies[0].name}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          (Admin)
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <FormControl fullWidth disabled={disabled}>
        <InputLabel id="company-selector-label">Select Company</InputLabel>
        <Select
          labelId="company-selector-label"
          id="company-selector"
          value={selectedCompanyId || ''}
          label="Select Company"
          onChange={(e) => onCompanyChange(e.target.value)}
        >
          {adminCompanies.map((company) => (
            <MenuItem key={company.id} value={company.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <IconBuilding size={16} />
                <Typography>{company.name}</Typography>
                <Typography variant="caption" color="textSecondary" sx={{ ml: 'auto' }}>
                  Admin
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {hasNonAdminCompanies && (
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
          Note: Only showing companies where you have admin access. QuickBooks integration requires admin privileges.
        </Typography>
      )}
    </Box>
  );
}

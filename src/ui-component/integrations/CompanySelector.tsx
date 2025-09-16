import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from 'utils/axios';
import { Company } from 'types/entities';
import { setCompanyId, getCompanyId } from 'utils/authStorage';

interface CompanySelectorProps {
  onCompanySelected?: (companyId: string) => void;
  showCurrentSelection?: boolean;
}

const CompanySelector: React.FC<CompanySelectorProps> = ({ 
  onCompanySelected, 
  showCurrentSelection = true 
}) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ['company'],
    queryFn: () => fetcher('/company/')
  });

  useEffect(() => {
    const currentCompanyId = getCompanyId();
    if (currentCompanyId) {
      setSelectedCompanyId(currentCompanyId);
    }
  }, []);

  const handleCompanyChange = async (event: any) => {
    const companyId = event.target.value;
    setSelectedCompanyId(companyId);
    setIsLoading(true);
    
    try {
      setCompanyId(companyId);
      if (onCompanySelected) {
        onCompanySelected(companyId);
      }
    } catch (error) {
      console.error('Error setting company:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentCompany = () => {
    if (!companies || !selectedCompanyId) return null;
    return companies.find(company => company.id === selectedCompanyId);
  };

  const currentCompany = getCurrentCompany();

  if (companiesLoading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="center" p={2}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Loading companies...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning">
            No companies found. Please create a company first.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Select Company
        </Typography>
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Company</InputLabel>
          <Select
            value={selectedCompanyId}
            onChange={handleCompanyChange}
            label="Company"
            disabled={isLoading}
          >
            {companies.map((company) => (
              <MenuItem key={company.id} value={company.id}>
                {company.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {showCurrentSelection && currentCompany && (
          <Box>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Current Selection:
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Chip 
                label={currentCompany.name} 
                color="primary" 
                variant="outlined"
              />
              {currentCompany.qb_connected_at && (
                <Chip 
                  label="QuickBooks Connected" 
                  color="success" 
                  size="small"
                />
              )}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default CompanySelector;

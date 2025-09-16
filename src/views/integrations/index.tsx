import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from 'utils/axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Avatar
} from '@mui/material';
import { gridSpacing } from 'store/constant';
import MainCard from 'ui-component/cards/MainCard';
import { RootState } from 'store';
import { getCompanyId } from 'utils/authStorage';
import QuickBooksIcon from 'assets/images/icons/quickbooks_logo.png';
import SquareIcon from '@mui/icons-material/Square';
import CompanySelector from 'ui-component/integrations/CompanySelector';

interface IntegrationCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  isConnected: boolean;
  statusText: string;
  statusColor: 'success' | 'error' | 'warning';
  onConnect: () => void;
  onManage: () => void;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({
  title,
  description,
  icon,
  isConnected,
  statusText,
  statusColor,
  onConnect,
  onManage
}) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          {icon}
          <Box flex={1}>
            <Typography variant="h6">{title}</Typography>
            <Typography variant="body2" color="textSecondary">
              {description}
            </Typography>
          </Box>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Chip 
            label={statusText} 
            color={statusColor} 
            size="small" 
          />
        </Box>
        
        <Box mt="auto">
          {isConnected ? (
            <Button 
              variant="outlined" 
              fullWidth 
              onClick={onManage}
            >
              Manage Integration
            </Button>
          ) : (
            <Button 
              variant="contained" 
              fullWidth 
              onClick={onConnect}
            >
              Connect
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

const IntegrationsPage: React.FC = () => {
  const navigate = useNavigate();
  const companyId = getCompanyId();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companyId || '');
  
  const { connectionStatus: squareStatus } = useSelector((state: RootState) => state.integrations.square);

  const handleCompanySelected = (companyId: string) => {
    setSelectedCompanyId(companyId);
  };
  
  // Get QuickBooks status from company data (existing pattern)
  const { data: companies } = useQuery({
    queryKey: ['company'],
    queryFn: () => fetcher('/company'),
    enabled: !!selectedCompanyId
  });
  
  const quickbooksStatus = companies?.find((c: any) => c.id === selectedCompanyId);

  const handleQuickBooksConnect = () => {
    navigate('/dashboard'); // QuickBooks is handled in dashboard
  };

  const handleQuickBooksManage = () => {
    navigate('/dashboard'); // QuickBooks is managed in dashboard
  };

  const handleSquareConnect = () => {
    navigate('/integrations/square');
  };

  const handleSquareManage = () => {
    navigate('/integrations/square');
  };

  const getQuickBooksStatus = () => {
    if (!quickbooksStatus) return { text: 'Unknown', color: 'warning' as const };
    
    if (quickbooksStatus.is_connected_to_quickbooks && quickbooksStatus.is_qb_access_token_valid) {
      return { text: 'Connected', color: 'success' as const };
    } else if (quickbooksStatus.is_connected_to_quickbooks && !quickbooksStatus.is_qb_access_token_valid) {
      return { text: 'Token Expired', color: 'warning' as const };
    } else {
      return { text: 'Disconnected', color: 'error' as const };
    }
  };

  const getSquareStatus = () => {
    if (!squareStatus) return { text: 'Unknown', color: 'warning' as const };
    
    if (squareStatus.is_connected && squareStatus.access_token_valid) {
      return { text: 'Connected', color: 'success' as const };
    } else if (squareStatus.is_connected && !squareStatus.access_token_valid) {
      return { text: 'Token Expired', color: 'warning' as const };
    } else {
      return { text: 'Disconnected', color: 'error' as const };
    }
  };

  const quickbooksStatusInfo = getQuickBooksStatus();
  const squareStatusInfo = getSquareStatus();

  return (
    <MainCard title="Integrations">
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        Connect your business tools to streamline your workflow and sync data automatically.
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <CompanySelector onCompanySelected={handleCompanySelected} />
      </Box>
      
      <Grid container spacing={gridSpacing}>
        <Grid item xs={12} md={6}>
          <IntegrationCard
            title="QuickBooks"
            description="Sync invoices, payments, expenses, and accounting data"
            icon={
              <Avatar 
                src={QuickBooksIcon} 
                sx={{ width: 40, height: 40 }}
                variant="square"
              />
            }
            isConnected={quickbooksStatus?.is_connected_to_quickbooks || false}
            statusText={quickbooksStatusInfo.text}
            statusColor={quickbooksStatusInfo.color}
            onConnect={handleQuickBooksConnect}
            onManage={handleQuickBooksManage}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <IntegrationCard
            title="Square"
            description="Sync payments, catalog items, and transaction data"
            icon={
              <Avatar sx={{ width: 40, height: 40, bgcolor: '#00C851' }}>
                <SquareIcon sx={{ color: 'white', fontSize: 24 }} />
              </Avatar>
            }
            isConnected={squareStatus?.is_connected || false}
            statusText={squareStatusInfo.text}
            statusColor={squareStatusInfo.color}
            onConnect={handleSquareConnect}
            onManage={handleSquareManage}
          />
        </Grid>
      </Grid>
      
      <Box mt={4}>
        <Typography variant="h6" gutterBottom>
          Integration Benefits
        </Typography>
        <Grid container spacing={gridSpacing}>
          <Grid item xs={12} md={4}>
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                📊 Automated Data Sync
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Keep your data synchronized across all platforms automatically
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                🔄 Real-time Updates
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Get instant notifications when data changes in connected systems
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                📈 Better Insights
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Combine data from multiple sources for comprehensive business insights
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </MainCard>
  );
};

export default IntegrationsPage;

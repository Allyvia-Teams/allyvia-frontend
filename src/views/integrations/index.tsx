import { useEffect } from 'react';
import { Grid, Card, CardContent, CardActionArea, Typography, Box, Avatar, Alert, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import { gridSpacing } from 'store/constant';
import QuickBooksIcon from 'assets/images/icons/quickbooks_logo.png';
import { IconPlugConnected, IconPlus } from '@tabler/icons-react';
import { useTheme } from '@mui/material/styles';
import { fetchCompanies } from 'store/slices/company';

interface IntegrationCard {
  id: string;
  name: string;
  description: string;
  icon: string | React.ReactElement;
  status: 'available' | 'connected' | 'coming_soon';
  route: string;
}

export default function IntegrationsHub() {
  const navigate = useNavigate();
  const theme = useTheme();
  const dispatch = useDispatch();
  const { companies, isLoading } = useSelector((state) => state.company);

  const adminCompanies = companies.filter((company) => company.user_role === 'admin');

  useEffect(() => {
    dispatch(fetchCompanies());
  }, [dispatch]);

  const integrations: IntegrationCard[] = [
    {
      id: 'quickbooks',
      name: 'QuickBooks',
      description: 'Sync your financial data with QuickBooks Online',
      icon: QuickBooksIcon,
      status: 'available',
      route: '/integrations/quickbooks'
    }
  ];

  const handleIntegrationClick = (integration: IntegrationCard) => {
    if (integration.status === 'available') {
      if (integration.id === 'quickbooks' && adminCompanies.length === 0) {
        return;
      }
      navigate(integration.route);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return theme.palette.success.main;
      case 'available':
        return theme.palette.primary.main;
      case 'coming_soon':
        return theme.palette.grey[500];
      default:
        return theme.palette.grey[500];
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'available':
        return 'Available';
      case 'coming_soon':
        return 'Coming Soon';
      default:
        return status;
    }
  };

  return (
    <MainCard title="Integrations">
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Connect your favorite tools and services to streamline your workflow
      </Typography>

      {!isLoading && adminCompanies.length === 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <AnimateButton>
              <Button color="inherit" size="small" startIcon={<IconPlus />} onClick={() => navigate('/companies')}>
                Create Company
              </Button>
            </AnimateButton>
          }
        >
          You need to create a company or have admin access to connect integrations.
        </Alert>
      )}

      <Grid container spacing={gridSpacing}>
        {integrations.map((integration) => (
          <Grid key={integration.id} item xs={12} sm={6} md={4} lg={3}>
            <Card
              sx={{
                position: 'relative',
                cursor: integration.status === 'available' ? 'pointer' : 'default',
                opacity: integration.status === 'coming_soon' ? 0.7 : 1,
                '&:hover': {
                  boxShadow: integration.status === 'available' ? theme.shadows[4] : theme.shadows[1]
                }
              }}
            >
              <CardActionArea onClick={() => handleIntegrationClick(integration)} disabled={integration.status === 'coming_soon'}>
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <Box sx={{ mb: 2, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {typeof integration.icon === 'string' ? (
                        <img src={integration.icon} alt={integration.name} style={{ height: 48 }} />
                      ) : (
                        <Avatar sx={{ bgcolor: 'transparent', color: theme.palette.primary.main, width: 60, height: 60 }}>
                          {integration.icon}
                        </Avatar>
                      )}
                    </Box>
                    <Typography variant="h4" gutterBottom>
                      {integration.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2, minHeight: 40 }}>
                      {integration.description}
                    </Typography>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: `${getStatusColor(integration.status)}15`,
                        color: getStatusColor(integration.status)
                      }}
                    >
                      <IconPlugConnected size={14} />
                      <Typography variant="caption" fontWeight="medium">
                        {getStatusText(integration.status)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </MainCard>
  );
}

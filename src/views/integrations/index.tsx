import { Grid, Card, CardContent, CardActionArea, Typography, Box, Avatar, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';
import QuickBooksIcon from 'assets/images/icons/quickbooks_logo.png';
import SquareIcon from 'assets/images/icons/square_logo.png';
import { useTheme } from '@mui/material/styles';

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
  const { currentRole } = useSelector((state) => state.auth);

  const isAdmin = currentRole?.role_type === 'admin';

  const integrations: IntegrationCard[] = [
    {
      id: 'quickbooks',
      name: 'QuickBooks',
      description: 'Sync your financial data with QuickBooks Online',
      icon: QuickBooksIcon,
      status: 'available',
      route: '/integrations/quickbooks'
    },
    {
      id: 'square',
      name: 'Square',
      description: 'Connect Square POS for inventory and sales data',
      icon: SquareIcon,
      status: 'available',
      route: '/integrations/square'
    }
  ];

  const handleIntegrationClick = (integration: IntegrationCard) => {
    if (integration.status === 'available') {
      if ((integration.id === 'quickbooks' || integration.id === 'square') && !isAdmin) {
        return;
      }
      navigate(integration.route);
    }
  };

  return (
    <MainCard title="Integrations">
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Connect your favorite tools and services to streamline your workflow
      </Typography>

      {!currentRole && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please login to connect integrations.
        </Alert>
      )}

      {currentRole && !isAdmin && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Only administrators can manage integrations. Your role: {currentRole.role_display || currentRole.role_type}
        </Alert>
      )}

      <Grid container spacing={gridSpacing}>
        {integrations.map((integration) => (
          <Grid key={integration.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
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
                    <Box sx={{ mb: 2, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {typeof integration.icon === 'string' ? (
                        <img src={integration.icon} alt={integration.name} style={{ height: integration.id === 'quickbooks' ? 56 : 64 }} />
                      ) : (
                        <Avatar sx={{ bgcolor: 'transparent', color: theme.palette.primary.main, width: 70, height: 70 }}>
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

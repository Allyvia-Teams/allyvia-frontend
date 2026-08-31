import { Grid, Card, CardContent, CardActionArea, Typography, Box, Avatar, Alert } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'store';
import { useEffect } from 'react';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';
import QuickBooksIcon from 'assets/images/icons/quickbooks_logo.png';
import SquareIcon from 'assets/images/icons/square_logo.png';
import { useTheme } from '@mui/material/styles';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { fetchQBConnectionStatus, fetchSquareConnectionStatus } from 'store/slices/integrations';

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
  const [searchParams] = useSearchParams();
  const { currentRole } = useSelector((state) => state.auth);
  const { quickbooks, square } = useSelector((state) => state.integrations);

  const isAdmin = currentRole?.role_type === 'admin';
  const companyId = currentRole?.company_id || null;

  // Check if user explicitly wants to see the hub (via "Back to Integrations" button)
  const showHub = searchParams.get('hub') === 'true';

  // Determine connection status
  const isQBConnected =
    quickbooks.connection.status === 'connected' ||
    quickbooks.connection.status === 'refreshing' ||
    quickbooks.connection.status === 'expired';
  const isSquareConnected = square.connection.status === 'connected' || square.connection.status === 'expired';

  // Fetch connection statuses on mount
  useEffect(() => {
    if (currentRole && companyId && isAdmin) {
      dispatch(fetchQBConnectionStatus(companyId));
      dispatch(fetchSquareConnectionStatus(companyId));
    }
  }, [dispatch, currentRole, companyId, isAdmin]);

  // Auto-redirect to connected integration if not explicitly showing hub
  useEffect(() => {
    if (!showHub && isAdmin && companyId) {
      // QuickBooks takes priority if both are connected
      if (isQBConnected) {
        navigate('/integrations/quickbooks', { replace: true });
      } else if (isSquareConnected) {
        navigate('/integrations/square', { replace: true });
      }
    }
  }, [showHub, isAdmin, companyId, isQBConnected, isSquareConnected, navigate]);

  const integrations: IntegrationCard[] = [
    {
      id: 'quickbooks',
      name: 'QuickBooks',
      description: 'Sync your financial data with QuickBooks Online',
      icon: QuickBooksIcon,
      status: isQBConnected ? 'connected' : 'available',
      route: '/integrations/quickbooks'
    },
    {
      id: 'square',
      name: 'Square',
      description: 'Connect Square POS for inventory and sales data',
      icon: SquareIcon,
      status: isSquareConnected ? 'connected' : 'available',
      route: '/integrations/square'
    },
    {
      // The POS data migration path (the `integrations` Django app). Distinct
      // from the two above, which keep an ongoing financial ledger in sync:
      // this one moves a merchant's history OFF an old till and into Allyvia.
      id: 'pos-migration',
      name: 'Move from another POS',
      description: 'Import customers, products, stock and sales history from your old point of sale',
      icon: <SwapHorizIcon sx={{ fontSize: 48 }} />,
      status: 'available',
      route: '/integrations/pos'
    }
  ];

  const handleIntegrationClick = (integration: IntegrationCard) => {
    if (integration.status === 'available' || integration.status === 'connected') {
      if ((integration.id === 'quickbooks' || integration.id === 'square' || integration.id === 'pos-migration') && !isAdmin) {
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
                cursor: integration.status === 'available' || integration.status === 'connected' ? 'pointer' : 'default',
                opacity: integration.status === 'coming_soon' ? 0.7 : 1,
                // Flat cards per the design system — hover emphasizes the hairline border, no shadow
                '&:hover': {
                  boxShadow: 'none',
                  borderColor: integration.status === 'available' ? 'grey.300' : 'divider',
                  bgcolor: integration.status === 'available' ? 'grey.50' : 'background.paper'
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

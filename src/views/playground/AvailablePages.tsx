import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Link,
  Paper
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { IconExternalLink } from '@tabler/icons-react';

interface RouteInfo {
  path: string;
  name: string;
  category: string;
  requiresAuth: boolean;
  requiresAdmin?: boolean;
  description?: string;
}

const AvailablePages: React.FC = () => {
  const navigate = useNavigate();

  // All available routes in the application
  const routes: RouteInfo[] = [
    // Main App Routes
    { path: '/', name: 'Dashboard', category: 'Main', requiresAuth: true, description: 'Main dashboard page' },
    { path: '/dashboard', name: 'Dashboard', category: 'Main', requiresAuth: true, description: 'Main dashboard page' },
    { path: '/finance', name: 'Finance & Accounting', category: 'Main', requiresAuth: true },
    { path: '/expense/bills', name: 'Expense Bills', category: 'Main', requiresAuth: true },
    { path: '/employees', name: 'Employees & Payroll', category: 'Main', requiresAuth: true },
    { path: '/employees/clock', name: 'Clock In/Out', category: 'Main', requiresAuth: true },
    { path: '/crm', name: 'CRM', category: 'Main', requiresAuth: true },
    { path: '/community', name: 'Community Networking', category: 'Main', requiresAuth: true, description: 'Under Construction' },
    { path: '/inventory', name: 'Inventory', category: 'Main', requiresAuth: true },
    { path: '/inventory/update', name: 'Update Inventory', category: 'Main', requiresAuth: true },
    { path: '/documents', name: 'Documents', category: 'Main', requiresAuth: true },
    { path: '/analytics', name: 'Analytics', category: 'Main', requiresAuth: true },
    { path: '/calendar', name: 'Calendar', category: 'Main', requiresAuth: true },
    { path: '/insights', name: 'AI Insights', category: 'Main', requiresAuth: true, description: 'Pro Plan exclusive' },
    { path: '/marketing', name: 'Marketing Tools', category: 'Main', requiresAuth: true, description: 'Under Construction' },
    { path: '/integrations', name: 'Integrations', category: 'Main', requiresAuth: true },
    { path: '/integrations/quickbooks', name: 'QuickBooks Integration', category: 'Main', requiresAuth: true },
    { path: '/settings', name: 'Settings', category: 'Main', requiresAuth: true },
    { path: '/me', name: 'My Profile', category: 'Main', requiresAuth: true },

    // Subscription Routes
    { path: '/paymentplan', name: 'Payment Plan Selection', category: 'Subscription', requiresAuth: true },
    { path: '/checkout/success', name: 'Checkout Success', category: 'Subscription', requiresAuth: true },

    // Kiosk Routes
    { path: '/kiosk/login', name: 'Kiosk Login', category: 'Kiosk', requiresAuth: false },
    { path: '/kiosk', name: 'Kiosk Clock', category: 'Kiosk', requiresAuth: true },
    { path: '/kiosk/clock', name: 'Kiosk Clock In/Out', category: 'Kiosk', requiresAuth: true },
    { path: '/kiosk/inventory', name: 'Kiosk Inventory', category: 'Kiosk', requiresAuth: true },

    // Developer/Demo Routes
    { path: '/playground', name: 'Playground', category: 'Developer', requiresAuth: true, description: 'Component playground' },
    { path: '/demo', name: 'RBAC Demo', category: 'Developer', requiresAuth: true, description: 'Role-based access control demo' },

    // Authentication Routes
    { path: '/login', name: 'Login', category: 'Authentication', requiresAuth: false },
    { path: '/forgot-password', name: 'Forgot Password', category: 'Authentication', requiresAuth: false },
    { path: '/reset-password', name: 'Reset Password', category: 'Authentication', requiresAuth: false },
    { path: '/check-mail', name: 'Check Mail', category: 'Authentication', requiresAuth: false },
    { path: '/code-verification', name: 'Code Verification', category: 'Authentication', requiresAuth: false },
    { path: '/verify-email-pending', name: 'Verify Email Pending', category: 'Authentication', requiresAuth: false },
    { path: '/forgot-password-sent', name: 'Forgot Password Sent', category: 'Authentication', requiresAuth: false },
    { path: '/change-password', name: 'Change Password', category: 'Authentication', requiresAuth: false },
    { path: '/auth/callback/google', name: 'Google Auth Callback', category: 'Authentication', requiresAuth: false },
    { path: '/auth/google-drive/callback', name: 'Google Drive Callback', category: 'Authentication', requiresAuth: true },

    // Registration Routes
    { path: '/register', name: 'Register', category: 'Registration', requiresAuth: false },
    { path: '/verify-email', name: 'Verify Email', category: 'Registration', requiresAuth: false },

    // Error/Maintenance Routes
    { path: '/pages/error', name: 'Error Page', category: 'System', requiresAuth: true },
    { path: '/pages/500', name: 'Error 500', category: 'System', requiresAuth: true },
    { path: '/pages/coming-soon1', name: 'Coming Soon 1', category: 'System', requiresAuth: true },
    { path: '/pages/coming-soon2', name: 'Coming Soon 2', category: 'System', requiresAuth: true },
    { path: '/pages/under-construction', name: 'Under Construction', category: 'System', requiresAuth: true },
    { path: '/quickbooks-callback', name: 'QuickBooks Callback', category: 'System', requiresAuth: true }
  ];

  const categories = Array.from(new Set(routes.map((r) => r.category)));

  const handleRouteClick = (path: string) => {
    navigate(path);
  };

  const getCategoryColor = (category: string): 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' => {
    const colors: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
      Main: 'primary',
      Authentication: 'success',
      Registration: 'info',
      Subscription: 'warning',
      Kiosk: 'secondary',
      Developer: 'error',
      System: 'secondary'
    };
    return colors[category] || 'secondary';
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Available Pages & Routes
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Click on any route to navigate to that page. Routes are organized by category.
      </Typography>

      <Stack spacing={3}>
        {categories.map((category) => {
          const categoryRoutes = routes.filter((r) => r.category === category);
          return (
            <Card key={category} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Chip label={category} color={getCategoryColor(category) as any} size="small" />
                  <Typography variant="body2" color="text.secondary">
                    {categoryRoutes.length} {categoryRoutes.length === 1 ? 'route' : 'routes'}
                  </Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Path</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">
                          Auth Required
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">
                          Action
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {categoryRoutes.map((route) => (
                        <TableRow key={route.path} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                              {route.path}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {route.name}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {route.requiresAuth ? (
                              <Chip label="Yes" size="small" color="warning" />
                            ) : (
                              <Chip label="No" size="small" color="success" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {route.description || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Link
                              component="button"
                              variant="body2"
                              onClick={() => handleRouteClick(route.path)}
                              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
                            >
                              Navigate
                              <IconExternalLink size={16} />
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      <Paper sx={{ mt: 4, p: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Summary
        </Typography>
        <Stack direction="row" spacing={4} flexWrap="wrap">
          <Box>
            <Typography variant="body2" color="text.secondary">
              Total Routes
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {routes.length}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Categories
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {categories.length}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Auth Required
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {routes.filter((r) => r.requiresAuth).length}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Public Routes
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {routes.filter((r) => !r.requiresAuth).length}
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};

export default AvailablePages;

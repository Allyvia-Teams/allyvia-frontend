import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Divider,
  Collapse,
  IconButton as MuiIconButton
} from '@mui/material';
import {
  IconCheck,
  IconX,
  IconLogout,
  IconUser,
  IconShieldCheck,
  IconBuilding,
  IconChevronDown,
  IconChevronUp,
  IconApi,
  IconDatabase
} from '@tabler/icons-react';
import { useDispatch, useSelector } from 'store';
import { setCurrentRole, logoutAsync } from 'store/slices/auth';
import { hasPermission, canPerformAction, RoleType } from 'utils/role';
import MainCard from 'ui-component/cards/MainCard';
import axiosServices from 'utils/axios';

const roleColorMap: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  admin: 'error',
  manager: 'warning',
  member: 'info',
  viewer: 'default'
};

export default function RBACDemo() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, roles, currentRole, isLoggedIn } = useSelector((state) => state.auth);
  
  // State for API data display
  const [profileData, setProfileData] = useState<any>(null);
  const [rolesData, setRolesData] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showRawData, setShowRawData] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const isMockMode = import.meta.env.VITE_USE_MOCK_API === 'true';

  // Fetch profile data
  const fetchProfileData = async () => {
    setLoadingProfile(true);
    try {
      const endpoint = isMockMode ? '/auth/me/' : '/user/profile/';
      const response = await axiosServices.get(endpoint);
      setProfileData(response.data);
      setApiError(null);
    } catch (error: any) {
      setApiError(error.message || 'Failed to fetch profile');
      setProfileData(null);
    }
    setLoadingProfile(false);
  };

  // Fetch roles data
  const fetchRolesData = async () => {
    setLoadingRoles(true);
    try {
      const response = await axiosServices.get('/role/');
      setRolesData(response.data);
      setApiError(null);
    } catch (error: any) {
      setApiError(error.message || 'Failed to fetch roles');
      setRolesData(null);
    }
    setLoadingRoles(false);
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchProfileData();
      fetchRolesData();
    }
  }, [isLoggedIn]);

  const handleLogout = async () => {
    await dispatch(logoutAsync());
    navigate('/login');
  };

  const handleRoleChange = (event: SelectChangeEvent<string>) => {
    const selectedRole = roles.find(r => r.id === event.target.value);
    if (selectedRole) {
      dispatch(setCurrentRole(selectedRole));
    }
  };

  if (!isLoggedIn || !user) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="warning">
          Please login to view the RBAC demo. <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </Alert>
      </Container>
    );
  }

  const roleType = currentRole?.role_type as RoleType;

  const permissions = [
    { feature: 'Dashboard', viewer: true, member: true, manager: true, admin: true },
    { feature: 'View Reports', viewer: true, member: true, manager: true, admin: true },
    { feature: 'Create Invoices', viewer: false, member: true, manager: true, admin: true },
    { feature: 'Edit Invoices', viewer: false, member: true, manager: true, admin: true },
    { feature: 'Delete Invoices', viewer: false, member: false, manager: true, admin: true },
    { feature: 'Company Settings', viewer: false, member: false, manager: true, admin: true },
    { feature: 'User Management', viewer: false, member: false, manager: false, admin: true },
    { feature: 'QuickBooks Sync', viewer: false, member: false, manager: false, admin: true }
  ];

  const checkPermission = (feature: any): boolean => {
    if (!roleType) return false;
    const rolePermissions = {
      viewer: feature.viewer,
      member: feature.member,
      manager: feature.manager,
      admin: feature.admin
    };
    return rolePermissions[roleType] || false;
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid size={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h2">RBAC Demo - FE-002</Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Chip 
                icon={<IconApi size={16} />}
                label={isMockMode ? 'Mock API' : 'Backend API'} 
                color={isMockMode ? 'warning' : 'success'}
                variant="outlined"
              />
            </Box>
          </Box>
        </Grid>

        {/* API Status Card */}
        <Grid size={12}>
          <MainCard>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Box display="flex" alignItems="center">
                <IconDatabase size={24} style={{ marginRight: 8 }} />
                <Typography variant="h4">API Data</Typography>
              </Box>
              <MuiIconButton onClick={() => setShowRawData(!showRawData)} size="small">
                {showRawData ? <IconChevronUp /> : <IconChevronDown />}
              </MuiIconButton>
            </Box>
            
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Typography variant="subtitle1"><strong>Profile Endpoint:</strong></Typography>
                  <Button 
                    size="small" 
                    onClick={fetchProfileData}
                    disabled={loadingProfile}
                  >
                    {loadingProfile ? 'Loading...' : 'Refresh'}
                  </Button>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {isMockMode ? 'GET /auth/me/' : 'GET /user/profile/'}
                </Typography>
                {profileData && (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    Profile loaded successfully
                  </Alert>
                )}
              </Grid>
              
              <Grid size={{ xs: 12, md: 6 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Typography variant="subtitle1"><strong>Roles Endpoint:</strong></Typography>
                  <Button 
                    size="small" 
                    onClick={fetchRolesData}
                    disabled={loadingRoles}
                  >
                    {loadingRoles ? 'Loading...' : 'Refresh'}
                  </Button>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  GET /role/
                </Typography>
                {rolesData && (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    {rolesData.length} role(s) loaded
                  </Alert>
                )}
              </Grid>
            </Grid>

            <Collapse in={showRawData}>
              <Box mt={3}>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" gutterBottom>Profile Response:</Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <pre style={{ margin: 0, fontSize: '12px', overflow: 'auto' }}>
                        {profileData ? JSON.stringify(profileData, null, 2) : 'No data'}
                      </pre>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" gutterBottom>Roles Response:</Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <pre style={{ margin: 0, fontSize: '12px', overflow: 'auto' }}>
                        {rolesData ? JSON.stringify(rolesData, null, 2) : 'No data'}
                      </pre>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </Collapse>
            
            {apiError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                API Error: {apiError}
              </Alert>
            )}
          </MainCard>
        </Grid>

        {/* User Info Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <MainCard>
            <Box display="flex" alignItems="center" mb={2}>
              <IconUser size={24} style={{ marginRight: 8 }} />
              <Typography variant="h4">User Information</Typography>
            </Box>
            <Box display="flex" flexDirection="column" gap={1}>
              <Typography><strong>Email:</strong> {user.email}</Typography>
              <Typography><strong>Name:</strong> {user.first_name || 'N/A'} {user.last_name || ''}</Typography>
              <Typography><strong>User ID:</strong> <code>{user.id}</code></Typography>
            </Box>
          </MainCard>
        </Grid>

        {/* Role Info Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <MainCard>
            <Box display="flex" alignItems="center" mb={2}>
              <IconShieldCheck size={24} style={{ marginRight: 8 }} />
              <Typography variant="h4">Current Role</Typography>
            </Box>
            
            {roles.length > 1 && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Switch Role</InputLabel>
                <Select
                  value={currentRole?.id || ''}
                  label="Switch Role"
                  onChange={handleRoleChange}
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <IconBuilding size={16} />
                        {role.company_name} - 
                        <Chip
                          label={role.role_display}
                          size="small"
                          color={roleColorMap[role.role_type]}
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {currentRole ? (
              <Box display="flex" flexDirection="column" gap={1}>
                <Typography><strong>Company:</strong> {currentRole.company_name}</Typography>
                <Typography component="div">
                  <strong>Role:</strong>{' '}
                  <Chip
                    label={currentRole.role_display}
                    size="small"
                    color={roleColorMap[currentRole.role_type]}
                  />
                </Typography>
                <Typography><strong>Role ID:</strong> <code>{currentRole.id}</code></Typography>
              </Box>
            ) : (
              <Alert severity="warning">No role assigned</Alert>
            )}
          </MainCard>
        </Grid>

        {/* Permissions Matrix */}
        <Grid size={12}>
          <MainCard>
            <Typography variant="h4" mb={2}>Permissions Matrix</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Feature</strong></TableCell>
                    <TableCell align="center"><strong>Viewer</strong></TableCell>
                    <TableCell align="center"><strong>Member</strong></TableCell>
                    <TableCell align="center"><strong>Manager</strong></TableCell>
                    <TableCell align="center"><strong>Admin</strong></TableCell>
                    <TableCell align="center"><strong>Your Access</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {permissions.map((perm) => {
                    const hasAccess = checkPermission(perm);
                    return (
                      <TableRow key={perm.feature}>
                        <TableCell>{perm.feature}</TableCell>
                        <TableCell align="center">
                          {perm.viewer ? <IconCheck size={18} color="green" /> : <IconX size={18} color="red" />}
                        </TableCell>
                        <TableCell align="center">
                          {perm.member ? <IconCheck size={18} color="green" /> : <IconX size={18} color="red" />}
                        </TableCell>
                        <TableCell align="center">
                          {perm.manager ? <IconCheck size={18} color="green" /> : <IconX size={18} color="red" />}
                        </TableCell>
                        <TableCell align="center">
                          {perm.admin ? <IconCheck size={18} color="green" /> : <IconX size={18} color="red" />}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={hasAccess ? 'Allowed' : 'Denied'}
                            size="small"
                            color={hasAccess ? 'success' : 'error'}
                            icon={hasAccess ? <IconCheck size={14} /> : <IconX size={14} />}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Box mt={3}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Role Hierarchy
              </Typography>
              <Box display="flex" gap={1} alignItems="center">
                <Chip label="Admin" color="error" size="small" />
                <Typography variant="caption">{'>'}</Typography>
                <Chip label="Manager" color="warning" size="small" />
                <Typography variant="caption">{'>'}</Typography>
                <Chip label="Member" color="info" size="small" />
                <Typography variant="caption">{'>'}</Typography>
                <Chip label="Viewer" color="default" size="small" />
              </Box>
            </Box>
          </MainCard>
        </Grid>

        {/* Test Actions */}
        <Grid size={12}>
          <MainCard>
            <Typography variant="h4" mb={2}>Test Actions</Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              These buttons are enabled/disabled based on your current role
            </Alert>
            
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Button
                  variant="contained"
                  fullWidth
                  disabled={!roleType || !hasPermission(roleType, RoleType.VIEWER)}
                >
                  View Dashboard (Viewer+)
                </Button>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Button
                  variant="contained"
                  color="success"
                  fullWidth
                  disabled={!roleType || !hasPermission(roleType, RoleType.MEMBER)}
                >
                  Create Invoice (Member+)
                </Button>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Button
                  variant="contained"
                  color="warning"
                  fullWidth
                  disabled={!roleType || !hasPermission(roleType, RoleType.MANAGER)}
                >
                  Company Settings (Manager+)
                </Button>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Button
                  variant="contained"
                  color="error"
                  fullWidth
                  disabled={!roleType || !hasPermission(roleType, RoleType.ADMIN)}
                >
                  Manage Users (Admin)
                </Button>
              </Grid>
            </Grid>
          </MainCard>
        </Grid>

        {/* Test Users Info */}
        {isMockMode && (
          <Grid size={12}>
            <MainCard>
              <Typography variant="h4" mb={2}>Test Users (Mock API)</Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Mock API is enabled. Use these credentials to test different roles:
              </Alert>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Password</strong></TableCell>
                    <TableCell><strong>Role(s)</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>admin@allyvia.com</TableCell>
                    <TableCell>admin123</TableCell>
                    <TableCell>Admin at Acme Corp, Viewer at Tech Solutions</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>manager@allyvia.com</TableCell>
                    <TableCell>manager123</TableCell>
                    <TableCell>Manager at Acme Corp</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>member@allyvia.com</TableCell>
                    <TableCell>member123</TableCell>
                    <TableCell>Member at Tech Solutions</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>viewer@allyvia.com</TableCell>
                    <TableCell>viewer123</TableCell>
                    <TableCell>Viewer at Tech Solutions</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>multi@allyvia.com</TableCell>
                    <TableCell>multi123</TableCell>
                    <TableCell>Multiple roles across companies</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </MainCard>
        </Grid>
        )}

        {/* Backend API Info */}
        {!isMockMode && (
          <Grid size={12}>
            <MainCard>
              <Typography variant="h4" mb={2}>Backend API Configuration</Typography>
              <Alert severity="success" sx={{ mb: 2 }}>
                Connected to backend API. You can register new users or use existing credentials.
              </Alert>
              <Box display="flex" flexDirection="column" gap={1}>
                <Typography><strong>API Base URL:</strong> {import.meta.env.VITE_APP_API_URL || 'Not configured'}</Typography>
                <Typography><strong>Auth Method:</strong> JWT with refresh token rotation</Typography>
                <Typography><strong>Token Storage:</strong> localStorage</Typography>
                <Box mt={2}>
                  <Button variant="contained" onClick={() => navigate('/register')} sx={{ mr: 2 }}>
                    Register New User
                  </Button>
                  <Button variant="outlined" onClick={() => navigate('/login')}>
                    Go to Login
                  </Button>
                </Box>
              </Box>
            </MainCard>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}
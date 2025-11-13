import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Alert,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import { useSelector, useDispatch } from 'store';
import { useIsAdmin } from 'hooks/usePermission';
import {
  fetchUsers,
  fetchRoleDefinitions,
  deleteRole,
  clearDeleteRoleSuccess,
  clearInviteUserSuccess,
  deleteUser,
  clearDeleteUserSuccess
} from 'store/slices/role';
import { IconDots, IconEdit, IconTrash, IconUserPlus, IconShield, IconUsers, IconPlus, IconShieldCheck } from '@tabler/icons-react';
import ChangeUserRoleModal from 'ui-component/role/ChangeUserRoleModal';
import CreateRoleModal from 'ui-component/role/CreateRoleModal';
import InviteUserModal from 'ui-component/role/InviteUserModal';
import type { User, Role } from 'types/role';

export default function UserRoleManagementTab() {
  const dispatch = useDispatch();
  const isAdmin = useIsAdmin();
  const roleState = useSelector((s) => s.role);
  const {
    users,
    usersLoading,
    usersError,
    roleDefinitions,
    roleDefinitionsLoading,
    roleDefinitionsError,
    deleteRoleLoading,
    deleteRoleSuccess,
    deleteRoleError,
    inviteUserSuccess,
    inviteUserError,
    deleteUserLoading,
    deleteUserSuccess,
    deleteUserError
  } = roleState;

  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [roleAnchorEl, setRoleAnchorEl] = React.useState<null | HTMLElement>(null);
  const [changeRoleModalOpen, setChangeRoleModalOpen] = React.useState(false);
  const [createRoleModalOpen, setCreateRoleModalOpen] = React.useState(false);
  const [inviteUserModalOpen, setInviteUserModalOpen] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [roleToDelete, setRoleToDelete] = React.useState<Role | null>(null);
  const [deleteUserConfirmOpen, setDeleteUserConfirmOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<User | null>(null);

  React.useEffect(() => {
    if (isAdmin) {
      dispatch(fetchUsers());
      dispatch(fetchRoleDefinitions());
    }
  }, [dispatch, isAdmin]);

  React.useEffect(() => {
    if (deleteRoleSuccess) {
      setDeleteConfirmOpen(false);
      setRoleToDelete(null);
      const timer = setTimeout(() => {
        dispatch(clearDeleteRoleSuccess());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [deleteRoleSuccess, dispatch]);

  React.useEffect(() => {
    if (inviteUserSuccess) {
      const timer = setTimeout(() => {
        dispatch(clearInviteUserSuccess());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [inviteUserSuccess, dispatch]);

  React.useEffect(() => {
    if (deleteUserSuccess) {
      setDeleteUserConfirmOpen(false);
      setUserToDelete(null);
      const timer = setTimeout(() => {
        dispatch(clearDeleteUserSuccess());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [deleteUserSuccess, dispatch]);

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  const handleRoleMenuOpen = (event: React.MouseEvent<HTMLElement>, role: Role) => {
    setRoleAnchorEl(event.currentTarget);
    setSelectedRole(role);
  };

  const handleRoleMenuClose = () => {
    setRoleAnchorEl(null);
    setSelectedRole(null);
  };

  const handleChangeRole = () => {
    if (selectedUser) {
      setChangeRoleModalOpen(true);
    }
    handleUserMenuClose();
  };

  const handleCloseChangeRoleModal = () => {
    setChangeRoleModalOpen(false);
    setSelectedUser(null);
  };

  const handleEditRole = () => {
    if (selectedRole) {
      setCreateRoleModalOpen(true);
    }
    handleRoleMenuClose();
  };

  const handleDeleteRole = () => {
    if (selectedRole) {
      setRoleToDelete(selectedRole);
      setDeleteConfirmOpen(true);
    }
    handleRoleMenuClose();
  };

  const confirmDeleteRole = () => {
    if (roleToDelete) {
      dispatch(deleteRole(roleToDelete.id));
    }
  };

  const handleCreateRole = () => {
    setSelectedRole(null);
    setCreateRoleModalOpen(true);
  };

  const handleCloseCreateRoleModal = () => {
    setCreateRoleModalOpen(false);
    setSelectedRole(null);
  };

  const handleInviteUser = () => {
    setInviteUserModalOpen(true);
  };

  const handleCloseInviteUserModal = () => {
    setInviteUserModalOpen(false);
  };

  const handleDeleteUser = () => {
    if (selectedUser) {
      setUserToDelete(selectedUser);
      setDeleteUserConfirmOpen(true);
    }
    handleUserMenuClose();
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      dispatch(deleteUser(userToDelete.user_id));
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  const isSystemRole = (role: Role) => {
    return role.is_system_role || role.role_type === 'admin' || role.role_type === 'member';
  };

  if (!isAdmin) {
    return (
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Alert severity="info">Only administrators can manage users and roles.</Alert>
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        {(usersError || roleDefinitionsError) && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {usersError || roleDefinitionsError}
          </Alert>
        )}
        {deleteRoleSuccess && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => dispatch(clearDeleteRoleSuccess())}>
            Role deleted successfully!
          </Alert>
        )}
        {deleteRoleError && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => dispatch(clearDeleteRoleSuccess())}>
            {deleteRoleError}
          </Alert>
        )}
        {inviteUserSuccess && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => dispatch(clearInviteUserSuccess())}>
            User invited successfully! A welcome email has been sent.
          </Alert>
        )}
        {inviteUserError && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => dispatch(clearInviteUserSuccess())}>
            {inviteUserError}
          </Alert>
        )}
        {deleteUserSuccess && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => dispatch(clearDeleteUserSuccess())}>
            User deleted successfully!
          </Alert>
        )}
        {deleteUserError && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => dispatch(clearDeleteUserSuccess())}>
            {deleteUserError}
          </Alert>
        )}
      </Grid>

      {/* Roles Section */}
      <Grid size={{ xs: 12 }}>
        <Card variant="outlined">
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconShield size={24} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Roles ({roleDefinitions.length})
                </Typography>
              </Box>
              <Button variant="contained" startIcon={<IconPlus />} onClick={handleCreateRole}>
                Create Role
              </Button>
            </Stack>

            {roleDefinitionsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Role Name</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {roleDefinitions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            No roles found. Create your first custom role.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      roleDefinitions.map((role) => {
                        const systemRole = isSystemRole(role);
                        return (
                          <TableRow key={role.id}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {systemRole && <IconShieldCheck size={18} color="#4caf50" stroke={2} />}
                                <Typography variant="body2" fontWeight={500}>
                                  {role.role_display || 'Unnamed Role'}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {role.created_at ? formatDate(role.created_at) : 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              {!systemRole && (
                                <IconButton size="small" onClick={(e) => handleRoleMenuOpen(e, role)}>
                                  <IconDots size={20} />
                                </IconButton>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Users Section */}
      <Grid size={{ xs: 12 }}>
        <Card variant="outlined">
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconUsers size={24} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Users ({users.length})
                </Typography>
              </Box>
              <Button variant="contained" startIcon={<IconUserPlus />} onClick={handleInviteUser}>
                Invite User
              </Button>
            </Stack>

            {usersLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            No users found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.user_id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {user.user_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>{user.user_email || user.email || 'N/A'}</TableCell>
                          <TableCell>
                            <Typography variant="body2">{user.role_display || 'N/A'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={user.is_active ? 'Active' : 'Inactive'}
                              size="small"
                              color={user.is_active ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={(e) => handleUserMenuOpen(e, user)}>
                              <IconDots size={20} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* User Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleUserMenuClose}>
        <MenuItem onClick={handleChangeRole}>
          <IconEdit size={18} style={{ marginRight: 8 }} />
          Change Role
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteUser} sx={{ color: 'error.main' }}>
          <IconTrash size={18} style={{ marginRight: 8 }} />
          Delete User
        </MenuItem>
      </Menu>

      {/* Role Actions Menu */}
      <Menu anchorEl={roleAnchorEl} open={Boolean(roleAnchorEl)} onClose={handleRoleMenuClose}>
        <MenuItem onClick={handleEditRole}>
          <IconEdit size={18} style={{ marginRight: 8 }} />
          Edit Role
        </MenuItem>
        {selectedRole && !isSystemRole(selectedRole) && (
          <>
            <Divider />
            <MenuItem onClick={handleDeleteRole} sx={{ color: 'error.main' }}>
              <IconTrash size={18} style={{ marginRight: 8 }} />
              Delete Role
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Delete Role Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Role</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the role "{roleToDelete?.role_display}"? This action cannot be undone. Users with this role will
            need to be reassigned.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleteRoleLoading}>
            Cancel
          </Button>
          <Button onClick={confirmDeleteRole} color="error" variant="contained" disabled={deleteRoleLoading}>
            {deleteRoleLoading ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteUserConfirmOpen} onClose={() => setDeleteUserConfirmOpen(false)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the user "{userToDelete?.user_name || userToDelete?.user_email}"? This action cannot be undone.
            All data associated with this user will be permanently removed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteUserConfirmOpen(false)} disabled={deleteUserLoading}>
            Cancel
          </Button>
          <Button onClick={confirmDeleteUser} color="error" variant="contained" disabled={deleteUserLoading}>
            {deleteUserLoading ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change User Role Modal */}
      <ChangeUserRoleModal
        open={changeRoleModalOpen}
        onClose={handleCloseChangeRoleModal}
        user={selectedUser}
        roleDefinitions={roleDefinitions}
      />

      {/* Create/Edit Role Modal */}
      <CreateRoleModal open={createRoleModalOpen} onClose={handleCloseCreateRoleModal} role={selectedRole} />

      {/* Invite User Modal */}
      <InviteUserModal open={inviteUserModalOpen} onClose={handleCloseInviteUserModal} />
    </Grid>
  );
}

import { useState } from 'react';
import useSWR from 'swr';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { IconShieldLock, IconTrash, IconUsersGroup } from '@tabler/icons-react';

import SettingsSectionCard from './SettingsSectionCard';
import ConfirmActionDialog from './team/ConfirmActionDialog';
import EditPermissionsDialog from './team/EditPermissionsDialog';
import {
  listTeamMembers,
  listPendingInvitations,
  revokeInvitation,
  updateMemberRole,
  updateMemberPermissions,
  removeTeamMember
} from 'api/settings';
import { ModuleKey, ModulePermissions, PendingInvitation, TOGGLABLE_MODULES, TeamMember, TeamRoleType } from 'types/settings';
import { dispatch, useSelector } from 'store';
import { openSnackbar } from 'store/slices/snackbar';

interface TeamPermissionsProps {
  companyId: string;
}

const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
};

const fullName = (member: TeamMember) => {
  const full = `${member.first_name || ''} ${member.last_name || ''}`.trim();
  return full || member.user_email;
};

const grantedCount = (perms: ModulePermissions): number =>
  TOGGLABLE_MODULES.reduce((n, { key }) => n + (perms?.[key as ModuleKey] ? 1 : 0), 0);

export default function TeamPermissions({ companyId }: TeamPermissionsProps) {
  const { user } = useSelector((state) => state.auth);

  const membersKey = companyId ? `team-members-${companyId}` : null;
  const { data: members, isLoading: membersLoading, mutate: mutateMembers } = useSWR(membersKey, () => listTeamMembers(companyId));

  const {
    data: invitations,
    isLoading: invitationsLoading,
    mutate: mutateInvitations
  } = useSWR('pending-invitations', listPendingInvitations);

  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<PendingInvitation | null>(null);
  const [permissionsTarget, setPermissionsTarget] = useState<TeamMember | null>(null);
  const [permissionsSaving, setPermissionsSaving] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);

  const currentUserId = user?.id;

  const runAction = async (fn: () => Promise<unknown>, successMessage: string) => {
    setError(null);
    try {
      await fn();
      dispatch(
        openSnackbar({
          open: true,
          message: successMessage,
          variant: 'alert',
          alert: { color: 'success' },
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          close: true
        })
      );
    } catch (e: any) {
      const d = e?.response?.data;
      let msg = 'Action failed. Please try again.';
      if (d) {
        if (typeof d === 'string') msg = d;
        else if (d.detail) msg = d.detail;
        else if (d.email) msg = Array.isArray(d.email) ? d.email.join(' ') : d.email;
        else if (d.error) msg = d.error;
      }
      setError(msg);
      throw e;
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setWorking(true);
    try {
      await runAction(async () => {
        await revokeInvitation(revokeTarget.id);
        await mutateInvitations();
      }, 'Invitation revoked.');
      setRevokeTarget(null);
    } catch {
      // surfaced
    } finally {
      setWorking(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeTarget) return;
    setWorking(true);
    try {
      await runAction(async () => {
        await removeTeamMember(removeTarget.id);
        await mutateMembers();
      }, 'Member removed.');
      setRemoveTarget(null);
    } catch {
      // surfaced
    } finally {
      setWorking(false);
    }
  };

  const handleRoleChange = async (member: TeamMember, newRole: TeamRoleType) => {
    if (newRole === member.role_type) return;
    setRoleUpdatingId(member.id);
    try {
      await runAction(async () => {
        await updateMemberRole(member.id, newRole);
        await mutateMembers();
      }, 'Role updated.');
    } catch {
      // surfaced
    } finally {
      setRoleUpdatingId(null);
    }
  };

  const handleSavePermissions = async (permissions: ModulePermissions) => {
    if (!permissionsTarget) return;
    setPermissionsSaving(true);
    setPermissionsError(null);
    try {
      await updateMemberPermissions(permissionsTarget.id, permissions);
      await mutateMembers();
      dispatch(
        openSnackbar({
          open: true,
          message: 'Permissions updated.',
          variant: 'alert',
          alert: { color: 'success' },
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          close: true
        })
      );
      setPermissionsTarget(null);
    } catch (e: any) {
      const d = e?.response?.data;
      let msg = 'Failed to update permissions. Please try again.';
      if (d) {
        if (typeof d === 'string') msg = d;
        else if (d.detail) msg = d.detail;
        else if (d.error) msg = d.error;
      }
      setPermissionsError(msg);
    } finally {
      setPermissionsSaving(false);
    }
  };

  return (
    <SettingsSectionCard
      title="Team & Permissions"
      description="Manage which app modules each team member can access"
      icon={<IconUsersGroup size={24} stroke={1.5} />}
    >
      <Box>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
          Members
        </Typography>

        {membersLoading || !members ? (
          <Box>
            <Skeleton variant="rounded" height={44} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={44} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={44} />
          </Box>
        ) : members.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No members yet. Add employees from the Employees & Pay section.
          </Typography>
        ) : (
          <TableContainer sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Modules</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.map((m) => {
                  const isSelf = m.user_id === currentUserId;
                  const isAdmin = m.role_type === 'admin';
                  const granted = grantedCount(m.module_permissions || {});
                  const total = TOGGLABLE_MODULES.length;
                  return (
                    <TableRow key={m.id} hover>
                      <TableCell>
                        {fullName(m)}
                        {isSelf && <Chip label="You" size="small" sx={{ ml: 1 }} variant="outlined" />}
                      </TableCell>
                      <TableCell>{m.user_email}</TableCell>
                      <TableCell>
                        <Select
                          value={m.role_type}
                          size="small"
                          disabled={isSelf || roleUpdatingId === m.id}
                          onChange={(e) => handleRoleChange(m, e.target.value as TeamRoleType)}
                          sx={{ minWidth: 120 }}
                        >
                          <MenuItem value="member">Member</MenuItem>
                          <MenuItem value="admin">Admin</MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Chip label="All modules" size="small" color="primary" variant="outlined" />
                        ) : (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip label={`${granted} of ${total}`} size="small" variant="outlined" />
                            <Button
                              size="small"
                              variant="text"
                              startIcon={<IconShieldLock size={14} stroke={1.5} />}
                              onClick={() => {
                                setPermissionsError(null);
                                setPermissionsTarget(m);
                              }}
                            >
                              Edit
                            </Button>
                          </Stack>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="error"
                          disabled={isSelf}
                          onClick={() => setRemoveTarget(m)}
                          aria-label="remove member"
                        >
                          <IconTrash size={16} stroke={1.5} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Pending invitations stay visible so admins can revoke older invites
            that pre-date the current "no new invites from Settings" policy.
            New invites are not created from this card anymore. */}
        {invitations && invitations.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 3, mb: 1.5 }}>
              Pending invitations
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Older invites can still be revoked here.
            </Typography>
            {invitationsLoading ? (
              <Skeleton variant="rounded" height={44} />
            ) : (
              <TableContainer sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Invited by</TableCell>
                      <TableCell>Expires</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invitations.map((inv) => (
                      <TableRow key={inv.id} hover>
                        <TableCell>{inv.email}</TableCell>
                        <TableCell>
                          <Chip label={inv.role_type === 'admin' ? 'Admin' : 'Member'} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{inv.invited_by_email}</TableCell>
                        <TableCell>{formatDate(inv.expires_at)}</TableCell>
                        <TableCell align="right">
                          <Button size="small" color="error" variant="outlined" onClick={() => setRevokeTarget(inv)}>
                            Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Box>

      <EditPermissionsDialog
        open={!!permissionsTarget}
        member={permissionsTarget}
        saving={permissionsSaving}
        error={permissionsError}
        onClose={() => !permissionsSaving && setPermissionsTarget(null)}
        onSave={handleSavePermissions}
      />

      <ConfirmActionDialog
        open={!!removeTarget}
        title="Remove member"
        message={removeTarget ? `Remove ${fullName(removeTarget)} from the company? They will lose access immediately.` : ''}
        confirmLabel="Remove"
        destructive
        working={working}
        onClose={() => !working && setRemoveTarget(null)}
        onConfirm={handleRemoveMember}
      />

      <ConfirmActionDialog
        open={!!revokeTarget}
        title="Revoke invitation"
        message={revokeTarget ? `Revoke the pending invitation for ${revokeTarget.email}? They will no longer be able to accept it.` : ''}
        confirmLabel="Revoke"
        destructive
        working={working}
        onClose={() => !working && setRevokeTarget(null)}
        onConfirm={handleRevoke}
      />
    </SettingsSectionCard>
  );
}

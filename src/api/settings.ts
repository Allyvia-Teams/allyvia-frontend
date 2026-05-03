import axiosServices from 'utils/axios';
import {
  UserSettingsProfile,
  UserPreferences,
  UpdateUserProfilePayload,
  UpdateUserPreferencesPayload,
  CompanyBusinessInfo,
  UpdateCompanyPayload,
  TeamMember,
  TeamRoleType,
  ModulePermissions,
  PendingInvitation,
  SendInvitationPayload,
  AuditLogResponse,
  AuditLogFilters
} from 'types/settings';

// User profile + preferences

export async function getUserProfile(): Promise<UserSettingsProfile> {
  const { data } = await axiosServices.get<UserSettingsProfile>('/user/profile/');
  return data;
}

export async function updateUserProfile(payload: UpdateUserProfilePayload): Promise<UserSettingsProfile> {
  const { data } = await axiosServices.post<UserSettingsProfile>('/user/profile/', payload);
  return data;
}

export async function getUserPreferences(): Promise<UserPreferences> {
  const { data } = await axiosServices.get<UserPreferences>('/user/preferences/');
  return data;
}

export async function updateUserPreferences(payload: UpdateUserPreferencesPayload): Promise<UserPreferences> {
  const { data } = await axiosServices.patch<UserPreferences>('/user/preferences/', payload);
  return data;
}

// Company business info

export async function getCompanyBusinessInfo(companyId: string): Promise<CompanyBusinessInfo> {
  const { data } = await axiosServices.get<CompanyBusinessInfo>(`/company/${companyId}/`);
  return data;
}

export async function updateCompanyBusinessInfo(
  companyId: string,
  payload: UpdateCompanyPayload
): Promise<CompanyBusinessInfo> {
  const { data } = await axiosServices.put<CompanyBusinessInfo>(`/company/${companyId}/`, payload);
  return data;
}

// Team members

export async function listTeamMembers(companyId: string): Promise<TeamMember[]> {
  const { data } = await axiosServices.get<TeamMember[]>(`/role/company/${companyId}/`);
  return data;
}

export async function updateMemberRole(roleId: string, roleType: TeamRoleType): Promise<TeamMember> {
  const { data } = await axiosServices.put<TeamMember>(`/role/${roleId}/`, { role_type: roleType });
  return data;
}

export async function updateMemberPermissions(
  roleId: string,
  permissions: ModulePermissions
): Promise<TeamMember> {
  const { data } = await axiosServices.put<TeamMember>(`/role/${roleId}/`, {
    module_permissions: permissions
  });
  return data;
}

export async function removeTeamMember(roleId: string): Promise<void> {
  await axiosServices.delete(`/role/${roleId}/`);
}

// Invitations

export async function listPendingInvitations(): Promise<PendingInvitation[]> {
  const { data } = await axiosServices.get<PendingInvitation[]>('/role/invitations/');
  return data;
}

export async function sendTeamInvitation(payload: SendInvitationPayload): Promise<PendingInvitation> {
  const { data } = await axiosServices.post<PendingInvitation>('/role/invitations/', payload);
  return data;
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  await axiosServices.delete(`/role/invitations/${invitationId}/`);
}

// Audit log

export async function getAuditLog(filters: AuditLogFilters = {}): Promise<AuditLogResponse> {
  const { data } = await axiosServices.get<AuditLogResponse>('/settings/audit-log/', { params: filters });
  return data;
}

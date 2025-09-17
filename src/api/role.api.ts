import useSWR, { mutate } from 'swr';
import { useMemo } from 'react';
import axiosServices, { fetcher } from 'utils/axios';
import { getRoleId } from 'utils/authStorage';

// types
import { RoleById, CompanyRole } from 'types/entities';

const endpoints = {
  roles: '/role/',
  roleById: (id: string) => `/role/${id}/`,
  userRoles: '/role/user-roles/'
};

// Role API functions
export function useGetUserRoles() {
  const { data, isLoading, error, isValidating } = useSWR(endpoints.userRoles, fetcher);

  const memoizedValue = useMemo(
    () => ({
      userRoles: data as CompanyRole[],
      userRolesLoading: isLoading,
      userRolesError: error,
      userRolesValidating: isValidating,
      userRolesEmpty: !isLoading && !data?.length
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

export function useGetRoleById(roleId: string | null) {
  const url = roleId ? endpoints.roleById(roleId) : null;
  const { data, isLoading, error, isValidating } = useSWR(url, fetcher);

  const memoizedValue = useMemo(
    () => ({
      role: data as RoleById | null,
      roleLoading: isLoading,
      roleError: error,
      roleValidating: isValidating
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// Get current role from localStorage
export function useGetCurrentRole() {
  const roleId = getRoleId();
  return useGetRoleById(roleId);
}

// Helper function to check if user can manage shifts (admin/manager)
export function canManageShifts(roleType: string): boolean {
  return roleType === 'admin' || roleType === 'manager';
}

// Helper function to check if user has any role permissions
export function hasAnyRole(roleType: string): boolean {
  return ['admin', 'manager', 'member', 'viewer'].includes(roleType);
}

// Helper function to get role display name
export function getRoleDisplayName(roleType: string): string {
  const roleMap: { [key: string]: string } = {
    admin: 'Administrator',
    manager: 'Manager',
    member: 'Member',
    viewer: 'Viewer'
  };
  return roleMap[roleType] || 'Unknown';
}

// Helper function to check if user can perform admin actions
export function isAdmin(roleType: string): boolean {
  return roleType === 'admin';
}

// Helper function to check if user can perform manager actions
export function isManager(roleType: string): boolean {
  return roleType === 'manager' || roleType === 'admin';
}

// Utility functions for cache invalidation
export function invalidateRolesCache() {
  mutate((key) => typeof key === 'string' && key.includes('role/'));
}

import axiosServices from 'utils/axios';

export interface Role {
  id: string;
  company_id: string;
  company_name: string;
  role_type: 'admin' | 'manager' | 'member' | 'viewer';
  role_display: string;
  permissions?: string[];
}

export const roleApi = {
  getRoles: async (): Promise<Role[]> => {
    const response = await axiosServices.get('/role/');
    return response.data;
  }
};

// Helper function to check if user can manage shifts
export function canManageShifts(roleType: string): boolean {
  return roleType === 'admin' || roleType === 'manager';
}

export default roleApi;

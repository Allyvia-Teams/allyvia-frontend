import axiosServices from 'utils/axios';
import {
  AvailabilityException,
  AvailabilitySlot,
  ForecastRow,
  PaginationInfo,
  RoleAssignment,
  ScheduleRecommendation,
  ScheduleTemplate,
  ShiftCandidate,
  StaffRole,
  TemplateBlock
} from 'types/scheduling';

const BASE_URL = '/scheduling';

export interface ListResponse<T> {
  items: T[];
  pagination: PaginationInfo | null;
}

export interface CrudResponse<T> {
  success: boolean;
  item: T | null;
  message: string;
}

// ---------------------------------------------------------------------------
// Staff roles + assignments
// ---------------------------------------------------------------------------

export const getStaffRoles = async (): Promise<ListResponse<StaffRole>> => {
  const response = await axiosServices.get(`${BASE_URL}/roles/?page_size=100`);
  return response.data;
};

export const createStaffRole = async (payload: { name: string; hourly_rate_default?: string | null }): Promise<CrudResponse<StaffRole>> => {
  const response = await axiosServices.post(`${BASE_URL}/roles/`, payload);
  return response.data;
};

export const updateStaffRole = async (
  roleId: number,
  payload: { name: string; hourly_rate_default?: string | null }
): Promise<CrudResponse<StaffRole>> => {
  const response = await axiosServices.put(`${BASE_URL}/roles/${roleId}/`, payload);
  return response.data;
};

export const deleteStaffRole = async (roleId: number): Promise<CrudResponse<null>> => {
  const response = await axiosServices.delete(`${BASE_URL}/roles/${roleId}/`);
  return response.data;
};

export const getRoleAssignments = async (employeeId?: string): Promise<ListResponse<RoleAssignment>> => {
  const query = employeeId ? `?employee_id=${employeeId}&page_size=200` : '?page_size=200';
  const response = await axiosServices.get(`${BASE_URL}/assignments/${query}`);
  return response.data;
};

export const createRoleAssignment = async (payload: {
  employee: string;
  staff_role: number;
  proficiency?: number;
  is_primary?: boolean;
}): Promise<CrudResponse<RoleAssignment>> => {
  const response = await axiosServices.post(`${BASE_URL}/assignments/`, payload);
  return response.data;
};

export const deleteRoleAssignment = async (assignmentId: number): Promise<CrudResponse<null>> => {
  const response = await axiosServices.delete(`${BASE_URL}/assignments/${assignmentId}/`);
  return response.data;
};

// ---------------------------------------------------------------------------
// Templates + blocks
// ---------------------------------------------------------------------------

export const getTemplates = async (): Promise<ListResponse<ScheduleTemplate>> => {
  const response = await axiosServices.get(`${BASE_URL}/templates/?page_size=50`);
  return response.data;
};

export const getTemplateDetail = async (templateId: number): Promise<ScheduleTemplate> => {
  const response = await axiosServices.get(`${BASE_URL}/templates/${templateId}/`);
  return response.data;
};

export const createTemplate = async (payload: {
  name: string;
  location_id?: string;
  is_default?: boolean;
}): Promise<CrudResponse<ScheduleTemplate>> => {
  const response = await axiosServices.post(`${BASE_URL}/templates/`, payload);
  return response.data;
};

export const createTemplateBlock = async (
  templateId: number,
  payload: {
    day_of_week: number;
    start_time: string;
    end_time: string;
    staff_role: number;
    min_staff: number;
    max_staff: number;
    flex_rule: string;
  }
): Promise<CrudResponse<TemplateBlock>> => {
  const response = await axiosServices.post(`${BASE_URL}/templates/${templateId}/blocks/`, payload);
  return response.data;
};

export const updateTemplateBlock = async (
  blockId: number,
  payload: {
    day_of_week: number;
    start_time: string;
    end_time: string;
    staff_role: number;
    min_staff: number;
    max_staff: number;
    flex_rule: string;
  }
): Promise<CrudResponse<TemplateBlock>> => {
  const response = await axiosServices.put(`${BASE_URL}/blocks/${blockId}/`, payload);
  return response.data;
};

export const deleteTemplateBlock = async (blockId: number): Promise<CrudResponse<null>> => {
  const response = await axiosServices.delete(`${BASE_URL}/blocks/${blockId}/`);
  return response.data;
};

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

export const getAvailability = async (employeeId?: string): Promise<ListResponse<AvailabilitySlot>> => {
  const query = employeeId ? `?employee_id=${employeeId}&page_size=500` : '?page_size=500';
  const response = await axiosServices.get(`${BASE_URL}/availability/${query}`);
  return response.data;
};

export const createAvailability = async (payload: {
  employee?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  preference?: string;
}): Promise<CrudResponse<AvailabilitySlot>> => {
  const response = await axiosServices.post(`${BASE_URL}/availability/`, payload);
  return response.data;
};

export const deleteAvailability = async (slotId: number): Promise<CrudResponse<null>> => {
  const response = await axiosServices.delete(`${BASE_URL}/availability/${slotId}/`);
  return response.data;
};

export const getAvailabilityExceptions = async (employeeId?: string): Promise<ListResponse<AvailabilityException>> => {
  const query = employeeId ? `?employee_id=${employeeId}&page_size=200` : '?page_size=200';
  const response = await axiosServices.get(`${BASE_URL}/availability/exceptions/${query}`);
  return response.data;
};

export const createAvailabilityException = async (payload: {
  employee?: string;
  date: string;
  is_available: boolean;
  start_time?: string | null;
  end_time?: string | null;
  reason?: string;
}): Promise<CrudResponse<AvailabilityException>> => {
  const response = await axiosServices.post(`${BASE_URL}/availability/exceptions/`, payload);
  return response.data;
};

export const deleteAvailabilityException = async (exceptionId: number): Promise<CrudResponse<null>> => {
  const response = await axiosServices.delete(`${BASE_URL}/availability/exceptions/${exceptionId}/`);
  return response.data;
};

// ---------------------------------------------------------------------------
// Forecast + recommendations
// ---------------------------------------------------------------------------

export const getForecast = async (weekStart: string, locationId = ''): Promise<{ items: ForecastRow[] }> => {
  const query = new URLSearchParams({ week_start: weekStart });
  if (locationId) query.append('location_id', locationId);
  const response = await axiosServices.get(`${BASE_URL}/forecast/?${query.toString()}`);
  return response.data;
};

export const getRecommendations = async (params?: { status?: string; page?: number }): Promise<ListResponse<ScheduleRecommendation>> => {
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.page) query.append('page', String(params.page));
  const response = await axiosServices.get(`${BASE_URL}/recommendations/?${query.toString()}`);
  return response.data;
};

export const getRecommendationDetail = async (recommendationId: number): Promise<ScheduleRecommendation> => {
  const response = await axiosServices.get(`${BASE_URL}/recommendations/${recommendationId}/`);
  return response.data;
};

export const generateRecommendation = async (payload: {
  week_start?: string;
  template_id?: number;
  narrative?: boolean;
}): Promise<CrudResponse<ScheduleRecommendation>> => {
  const response = await axiosServices.post(`${BASE_URL}/recommendations/generate/`, payload);
  return response.data;
};

export const approveRecommendation = async (
  recommendationId: number,
  payload: { shift_ids?: number[]; dates?: string[] } = {}
): Promise<CrudResponse<ScheduleRecommendation> & { result?: any }> => {
  const response = await axiosServices.post(`${BASE_URL}/recommendations/${recommendationId}/approve/`, payload);
  return response.data;
};

export const dismissRecommendation = async (recommendationId: number, reason: string): Promise<CrudResponse<ScheduleRecommendation>> => {
  const response = await axiosServices.post(`${BASE_URL}/recommendations/${recommendationId}/dismiss/`, {
    reason
  });
  return response.data;
};

export const getShiftCandidates = async (recommendationId: number, shiftId: number): Promise<{ items: ShiftCandidate[] }> => {
  const response = await axiosServices.get(`${BASE_URL}/recommendations/${recommendationId}/shifts/${shiftId}/candidates/`);
  return response.data;
};

export const swapShiftEmployee = async (
  recommendationId: number,
  shiftId: number,
  employeeId: string | null
): Promise<CrudResponse<any>> => {
  const response = await axiosServices.patch(`${BASE_URL}/recommendations/${recommendationId}/shifts/${shiftId}/`, {
    employee: employeeId
  });
  return response.data;
};

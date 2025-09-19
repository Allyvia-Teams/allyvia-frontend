import axios from 'utils/axios';
import type {
  Contact,
  PaginatedResponse,
  CreateContact,
  UpdateContact,
  Lead,
  CreateLead,
  UpdateLead,
  Deal,
  CreateDeal,
  UpdateDeal,
  Task,
  CreateTask,
  UpdateTask
} from 'types/crm';

export interface GetContactsParams {
  search?: string;
  page?: number;
  page_size?: number;
}

// CRM endpoints are mounted at /api/crm/ (non-versioned)
const API_ORIGIN = new URL(import.meta.env.VITE_APP_API_URL).origin;
const CRM_BASE = `${API_ORIGIN}/api/crm`;

export async function getContacts(params?: GetContactsParams): Promise<PaginatedResponse<Contact>> {
  const res = await axios.get(`${CRM_BASE}/contacts/`, { params });
  return res.data as PaginatedResponse<Contact>;
}

export async function createContact(payload: CreateContact): Promise<Contact> {
  const res = await axios.post(`${CRM_BASE}/contacts/`, payload);
  return res.data as Contact;
}

export async function updateContact(id: string, payload: UpdateContact): Promise<Contact> {
  const res = await axios.patch(`${CRM_BASE}/contacts/${id}/`, payload);
  return res.data as Contact;
}

export async function deleteContact(id: string): Promise<void> {
  await axios.delete(`${CRM_BASE}/contacts/${id}/`);
}

// Leads
export interface GetLeadsParams {
  search?: string;
  page?: number;
  page_size?: number;
}

export async function getLeads(params?: GetLeadsParams): Promise<PaginatedResponse<Lead>> {
  const res = await axios.get(`${CRM_BASE}/leads/`, { params });
  return res.data as PaginatedResponse<Lead>;
}

export async function createLead(payload: CreateLead): Promise<Lead> {
  const res = await axios.post(`${CRM_BASE}/leads/`, payload);
  return res.data as Lead;
}

export async function updateLead(id: string, payload: UpdateLead): Promise<Lead> {
  const res = await axios.patch(`${CRM_BASE}/leads/${id}/`, payload);
  return res.data as Lead;
}

export async function deleteLead(id: string): Promise<void> {
  await axios.delete(`${CRM_BASE}/leads/${id}/`);
}

// Deals
export interface GetDealsParams {
  search?: string;
  page?: number;
  page_size?: number;
}

export async function getDeals(params?: GetDealsParams): Promise<PaginatedResponse<Deal>> {
  const res = await axios.get(`${CRM_BASE}/deals/`, { params });
  return res.data as PaginatedResponse<Deal>;
}

export async function createDeal(payload: CreateDeal): Promise<Deal> {
  const res = await axios.post(`${CRM_BASE}/deals/`, payload);
  return res.data as Deal;
}

export async function updateDeal(id: string, payload: UpdateDeal): Promise<Deal> {
  const res = await axios.patch(`${CRM_BASE}/deals/${id}/`, payload);
  return res.data as Deal;
}

export async function deleteDeal(id: string): Promise<void> {
  await axios.delete(`${CRM_BASE}/deals/${id}/`);
}

// Tasks
export interface GetTasksParams {
  search?: string;
  page?: number;
  page_size?: number;
}

export async function getTasks(params?: GetTasksParams): Promise<PaginatedResponse<Task>> {
  const res = await axios.get(`${CRM_BASE}/tasks/`, { params });
  return res.data as PaginatedResponse<Task>;
}

export async function createTask(payload: CreateTask): Promise<Task> {
  const res = await axios.post(`${CRM_BASE}/tasks/`, payload);
  return res.data as Task;
}

export async function updateTask(id: string, payload: UpdateTask): Promise<Task> {
  const res = await axios.patch(`${CRM_BASE}/tasks/${id}/`, payload);
  return res.data as Task;
}

export async function deleteTask(id: string): Promise<void> {
  await axios.delete(`${CRM_BASE}/tasks/${id}/`);
}

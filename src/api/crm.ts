import axios from 'utils/axios';
import type { Contact, PaginatedResponse, CreateContact, UpdateContact } from 'types/crm';

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

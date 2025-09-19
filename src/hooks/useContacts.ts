import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  type GetContactsParams,
  getLeads,
  createLead,
  updateLead,
  deleteLead,
  type GetLeadsParams
} from 'api/crm';
import type { Contact, CreateContact, UpdateContact, PaginatedResponse, Lead, CreateLead, UpdateLead } from 'types/crm';

export function useContacts(params: GetContactsParams) {
  return useQuery<PaginatedResponse<Contact>>({
    queryKey: ['crm-contacts', params],
    queryFn: () => getContacts(params)
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateContact) => createContact(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-contacts'] });
    }
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContact }) => updateContact(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-contacts'] });
    }
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-contacts'] });
    }
  });
}

// Leads hooks
export function useLeads(params: GetLeadsParams) {
  return useQuery<PaginatedResponse<Lead>>({
    queryKey: ['crm-leads', params],
    queryFn: () => getLeads(params)
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLead) => createLead(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
    }
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLead }) => updateLead(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
    }
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
    }
  });
}

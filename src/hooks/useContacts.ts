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
  type GetLeadsParams,
  getDeals,
  createDeal,
  updateDeal,
  deleteDeal,
  type GetDealsParams,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  type GetTasksParams,
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  type GetNotesParams
} from 'api/crm';
import type {
  Contact,
  CreateContact,
  UpdateContact,
  PaginatedResponse,
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
import type { Note, CreateNote, UpdateNote } from 'types/crm';

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

// Deals hooks
export function useDeals(params: GetDealsParams) {
  return useQuery<PaginatedResponse<Deal>>({
    queryKey: ['crm-deals', params],
    queryFn: () => getDeals(params)
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDeal) => createDeal(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-deals'] });
    }
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDeal }) => updateDeal(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-deals'] });
    }
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDeal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-deals'] });
    }
  });
}

// Tasks hooks
export function useTasks(params: GetTasksParams) {
  return useQuery<PaginatedResponse<Task>>({
    queryKey: ['crm-tasks', params],
    queryFn: () => getTasks(params)
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTask) => createTask(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-tasks'] });
    }
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTask }) => updateTask(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-tasks'] });
    }
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-tasks'] });
    }
  });
}

// Notes hooks
export function useNotes(params: GetNotesParams) {
  return useQuery<PaginatedResponse<Note>>({
    queryKey: ['crm-notes', params],
    queryFn: () => getNotes(params)
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateNote) => createNote(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-notes'] });
    }
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNote }) => updateNote(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-notes'] });
    }
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-notes'] });
    }
  });
}

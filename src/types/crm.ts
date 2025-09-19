export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company_name?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CreateContact {
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
  notes?: string;
}

export type UpdateContact = Partial<CreateContact>;

export interface Lead {
  id: string;
  contact: string; // contact id (UUID)
  contact_name?: string;
  contact_company_name?: string;
  status: 'New' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';
  priority: 'Low' | 'Medium' | 'High';
  score: number;
  estimated_value: number;
  expected_close_date?: string | null;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLead {
  contact: string;
  status: Lead['status'];
  priority: Lead['priority'];
  score: number;
  estimated_value: number;
  expected_close_date?: string | null;
  assigned_to?: string | null;
}

export type UpdateLead = Partial<CreateLead>;

export interface ContactListItem {
  id: string;
  name: string;
}

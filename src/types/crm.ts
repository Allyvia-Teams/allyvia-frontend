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

// Deals
export interface Deal {
  id: string;
  contact: string;
  contact_name?: string;
  contact_company_name?: string;
  name: string;
  description?: string | null;
  value: number;
  stage: 'Prospecting' | 'Qualification' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';
  probability: number;
  expected_close_date?: string | null;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDeal {
  contact: string;
  name: string;
  description?: string;
  value: number;
  stage: Deal['stage'];
  probability: number;
  expected_close_date?: string | null;
  assigned_to?: string | null;
}

export type UpdateDeal = Partial<CreateDeal>;

// Tasks
export interface Task {
  id: string;
  contact: string;
  contact_name?: string;
  contact_company_name?: string;
  subject: string;
  description?: string | null;
  activity_type: 'Call' | 'Email' | 'Meeting' | 'Demo' | 'Proposal' | 'Follow Up' | 'Other';
  status: 'Pending' | 'Completed' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High';
  due_date?: string | null;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTask {
  contact: string;
  subject: string;
  description?: string;
  activity_type: Task['activity_type'];
  status: Task['status'];
  priority: Task['priority'];
  due_date?: string | null;
  assigned_to?: string | null;
}

export type UpdateTask = Partial<CreateTask>;

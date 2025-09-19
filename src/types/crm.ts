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

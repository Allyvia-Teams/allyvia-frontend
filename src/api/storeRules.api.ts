// Store rules (owner trust T6; backend agent/store_rules_views.py). An owner writes a rule in her words; one that
// names a category keeps that category out of Allyvia's recommendations. Rules are never deleted: Retire takes one
// out of force and keeps it. Admin or owner only (a member gets 403).

import axiosServices from 'utils/axios';

export type StoreRuleStatus = 'in_force' | 'retired';

export interface StoreRule {
  id: string;
  statement: string;
  category_key: string | null;
  category_label: string | null;
  location_id: string | null;
  location_name: string | null;
  author_email: string | null;
  created_at: string | null;
  status: StoreRuleStatus;
  retired_at: string | null;
  retired_by_email: string | null;
}

export interface StoreRulesResponse {
  results: StoreRule[];
  limit: number;
  max_statement_chars: number;
}

export interface StoreRuleCategory {
  key: string;
  label: string;
}

export interface StoreRulePayload {
  statement: string;
  category_key?: string;
  location_id?: string;
}

const BASE = '/agent/store-rules';

export const listStoreRules = async (includeRetired: boolean): Promise<StoreRulesResponse> => {
  const response = await axiosServices.get<StoreRulesResponse>(`${BASE}/`, {
    params: includeRetired ? { include_retired: 1 } : undefined
  });
  return response.data;
};

export const createStoreRule = async (payload: StoreRulePayload): Promise<StoreRule> => {
  const response = await axiosServices.post<StoreRule>(`${BASE}/`, payload);
  return response.data;
};

export const retireStoreRule = async (id: string): Promise<StoreRule> => {
  const response = await axiosServices.post<StoreRule>(`${BASE}/${id}/retire/`);
  return response.data;
};

export const listStoreRuleCategories = async (): Promise<StoreRuleCategory[]> => {
  const response = await axiosServices.get<{ results: StoreRuleCategory[] }>(`${BASE}/categories/`);
  return response.data.results;
};

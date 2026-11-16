// Rules suggested from the owner's notes (owner trust T7; backend agent/rule_proposal_views.py). A person confirms
// or dismisses each one; nothing reaches a vendor or a store rule until a confirm. Admin or owner only.

import axiosServices from 'utils/axios';

export type RuleProposalKind = 'vendor_rule' | 'store_rule';
export type RuleProposalStatus = 'proposed' | 'confirmed' | 'dismissed';

export type VendorRuleField =
  | 'description'
  | 'min_order_units'
  | 'min_order_value'
  | 'reorder_policy'
  | 'order_ahead_days'
  | 'season_cover_days';

export type VendorRuleValue = string | number | null;

export interface VendorSuggestion {
  id: string;
  name: string;
  is_active: boolean;
}

export interface RuleProposal {
  id: string;
  kind: RuleProposalKind;
  status: RuleProposalStatus;
  quote: string;
  /** Vendor rule: some of the six fields (min_order_value a decimal string). Store rule: statement and category_key. */
  fields: Record<string, VendorRuleValue>;
  spoken_name: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  /** A matched vendor's value today for each proposed field; null when unmatched or a store rule. */
  current: Partial<Record<VendorRuleField, VendorRuleValue>> | null;
  /** Up to three of the company's vendors with a close name, when none matched exactly. */
  suggestions: VendorSuggestion[];
  category_label: string | null;
  created_at: string | null;
  decided_by_email: string | null;
  decided_at: string | null;
}

export interface RuleProposalsResponse {
  results: RuleProposal[];
  count: number;
}

export interface ConfirmVendorRulePayload {
  fields: Partial<Record<VendorRuleField, VendorRuleValue>>;
  supplier_id?: string;
  create_vendor?: true;
  name?: string;
}

export interface ConfirmStoreRulePayload {
  fields: { statement: string; category_key: string | null };
}

const BASE = '/agent/rule-proposals';

export const listRuleProposals = async (kind: RuleProposalKind, status: RuleProposalStatus = 'proposed') => {
  const response = await axiosServices.get<RuleProposalsResponse>(`${BASE}/`, { params: { kind, status } });
  return response.data;
};

export const confirmRuleProposal = async (id: string, payload: ConfirmVendorRulePayload | ConfirmStoreRulePayload) => {
  const response = await axiosServices.post<RuleProposal>(`${BASE}/${id}/confirm/`, payload);
  return response.data;
};

export const dismissRuleProposal = async (id: string) => {
  const response = await axiosServices.post<RuleProposal>(`${BASE}/${id}/dismiss/`);
  return response.data;
};

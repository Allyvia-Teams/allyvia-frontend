import axios from 'utils/axios';
import rawAxios from 'axios';

// Inner Circle endpoints are mounted at /api/inner-circle/ (non-versioned)
const API_ORIGIN = new URL(import.meta.env.VITE_APP_API_URL).origin;
const INNER_CIRCLE_BASE = `${API_ORIGIN}/api/inner-circle`;

// Public (customer-facing) endpoints are authenticated purely by the ?token=
// query param, so they must NOT carry the app's auth headers or trip the
// shared axios 401/refresh interceptor. Use a clean client for these.
const publicClient = rawAxios.create();

export type CustomerTier = 'vault' | 'regular' | 'shopper';

export interface InnerCircleSummary {
  vault_count: number;
  total_crm_ltv: number | string;
  active_this_month: number;
  automations_sent_month: number;
}

export interface CustomerListItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  tier: CustomerTier | null;
  ltv: string | null;
  visit_count: number;
  avg_order_value: string | null;
  last_visit_at: string | null;
  style_tags: string[];
  days_since_last_visit: number | null;
  spend_to_next_tier: string | null;
}

export interface RecentSale {
  id: string;
  total: string;
  transaction_date: string;
  line_count: number;
  receipt_number: string | null;
}

export interface CustomerDetail extends CustomerListItem {
  birthday: string | null;
  sizes: Record<string, string>;
  opted_in: boolean;
  recent_sales: RecentSale[];
}

export interface CustomerUpdate {
  birthday?: string | null;
  sizes?: Record<string, string>;
  opted_in?: boolean;
}

export interface CustomerListParams {
  page?: number;
  page_size?: number;
  ordering?: string;
  tier?: string;
  search?: string;
}

export interface PaginatedCustomers {
  count: number;
  next: string | null;
  previous: string | null;
  results: CustomerListItem[];
}

export interface BirthdayThisWeek {
  id: string;
  name: string;
  tier: CustomerTier | null;
  birthday: string;
  days_until: number;
}

export interface WinbackCandidate {
  id: string;
  name: string;
  tier: CustomerTier | null;
  last_visit_at: string | null;
  days_silent: number;
}

export interface NearTierPromotion {
  id: string;
  name: string;
  tier: CustomerTier | null;
  spend_to_next_tier: string | null;
  ltv: string | null;
}

export interface ActionQueue {
  birthdays_this_week: BirthdayThisWeek[];
  winback_candidates: WinbackCandidate[];
  near_tier_promotions: NearTierPromotion[];
}

export async function fetchInnerCircleSummary(companyId: string): Promise<InnerCircleSummary> {
  const res = await axios.get(`${INNER_CIRCLE_BASE}/summary/`, {
    params: { company_id: companyId }
  });
  return res.data as InnerCircleSummary;
}

export async function fetchCustomers(params?: CustomerListParams): Promise<PaginatedCustomers> {
  const res = await axios.get(`${INNER_CIRCLE_BASE}/customers/`, { params });
  return res.data as PaginatedCustomers;
}

export async function fetchCustomerDetail(customerId: string): Promise<CustomerDetail> {
  const res = await axios.get(`${INNER_CIRCLE_BASE}/customers/${customerId}/`);
  return res.data as CustomerDetail;
}

export async function updateCustomer(customerId: string, data: Partial<CustomerUpdate>): Promise<CustomerDetail> {
  const res = await axios.patch(`${INNER_CIRCLE_BASE}/customers/${customerId}/`, data);
  return res.data as CustomerDetail;
}

export async function fetchActionQueue(): Promise<ActionQueue> {
  const res = await axios.get(`${INNER_CIRCLE_BASE}/action-queue/`);
  return res.data as ActionQueue;
}

// ---------------------------------------------------------------------------
// Public Customer Profile Portal (token-based, no auth)
// ---------------------------------------------------------------------------

export interface PublicTierProgress {
  current_tier: string;
  next_tier: string | null;
  ltv: number;
  next_threshold: number | null;
  amount_to_next: number;
  percent: number;
}

export interface PublicRecentPurchase {
  id: string;
  total: string;
  transaction_date: string;
  line_count: number;
  receipt_number: string | null;
}

export interface PublicProfileCompany {
  name: string;
  brand_color: string | null;
}

export interface PublicProfile {
  id: string;
  name: string;
  email: string;
  tier: CustomerTier | null;
  ltv: string | null;
  visit_count: number;
  avg_order_value: string | null;
  last_visit_at: string | null;
  days_since_last_visit: number | null;
  style_tags: string[];
  tier_updated_at: string | null;
  birthday: string | null;
  opted_in: boolean;
  tier_progress: PublicTierProgress;
  recent_purchases: PublicRecentPurchase[];
  company: PublicProfileCompany;
}

export interface PublicProfileUpdate {
  birthday?: string | null;
  opted_in?: boolean;
}

export async function fetchPublicProfile(token: string): Promise<PublicProfile> {
  const res = await publicClient.get(`${INNER_CIRCLE_BASE}/public/profile/`, {
    params: { token }
  });
  return res.data as PublicProfile;
}

export async function updatePublicProfile(token: string, data: PublicProfileUpdate): Promise<PublicProfile> {
  const res = await publicClient.patch(`${INNER_CIRCLE_BASE}/public/profile/`, data, {
    params: { token }
  });
  return res.data as PublicProfile;
}

export async function unsubscribePublicProfile(token: string): Promise<{ status: string }> {
  const res = await publicClient.post(
    `${INNER_CIRCLE_BASE}/public/unsubscribe/`,
    {},
    { params: { token } }
  );
  return res.data as { status: string };
}

// ---------------------------------------------------------------------------
// Public Survey (token-based, no auth)
// ---------------------------------------------------------------------------

export type PublicSurveyState = 'open' | 'completed' | 'expired';

export interface PublicSurveyCompany {
  name: string;
  brand_color: string | null;
}

export interface PublicSurveyQuestion {
  id: string;
  text: string;
  question_type: SurveyQuestionType;
  options: string[];
  order: number;
}

export interface PublicSurvey {
  state: PublicSurveyState;
  company: PublicSurveyCompany;
  questions?: PublicSurveyQuestion[];
  answered_question_ids?: string[];
}

export interface SurveyAnswerResult {
  status: 'recorded' | 'completed';
  question_id?: string;
}

export async function fetchPublicSurvey(token: string): Promise<PublicSurvey> {
  const res = await publicClient.get(`${INNER_CIRCLE_BASE}/public/survey/`, {
    params: { token }
  });
  return res.data as PublicSurvey;
}

export async function submitSurveyAnswer(
  token: string,
  questionId: string,
  responseValue: string
): Promise<SurveyAnswerResult> {
  const res = await publicClient.post(
    `${INNER_CIRCLE_BASE}/public/survey/respond/`,
    { question_id: questionId, response_value: responseValue },
    { params: { token } }
  );
  return res.data as SurveyAnswerResult;
}

// ---------------------------------------------------------------------------
// Survey draft owner approval (authenticated)
// ---------------------------------------------------------------------------

export type SurveyDraftStatus = 'draft' | 'scheduled' | 'sent' | 'cancelled';
export type SurveyQuestionType = 'multiple_choice' | 'text';

export interface SurveyQuestion {
  id: string;
  text: string;
  question_type: SurveyQuestionType;
  options: string[];
  order: number;
}

export interface SurveyDraft {
  id: string;
  status: SurveyDraftStatus;
  originating_signal_ids: string[];
  delivery_cadence_days: number;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
  questions: SurveyQuestion[];
  question_count: number;
  response_count: number;
}

export interface SurveyDraftUpdate {
  delivery_cadence_days?: number;
  questions?: Array<Partial<SurveyQuestion> & { id: string }>;
}

export async function fetchSurveyDrafts(): Promise<SurveyDraft[]> {
  const res = await axios.get(`${INNER_CIRCLE_BASE}/survey-drafts/`);
  return res.data as SurveyDraft[];
}

export async function fetchSurveyDraft(id: string): Promise<SurveyDraft> {
  const res = await axios.get(`${INNER_CIRCLE_BASE}/survey-drafts/${id}/`);
  return res.data as SurveyDraft;
}

export async function updateSurveyDraft(id: string, data: SurveyDraftUpdate): Promise<SurveyDraft> {
  const res = await axios.patch(`${INNER_CIRCLE_BASE}/survey-drafts/${id}/`, data);
  return res.data as SurveyDraft;
}

export async function approveSurveyDraft(id: string): Promise<SurveyDraft> {
  const res = await axios.post(`${INNER_CIRCLE_BASE}/survey-drafts/${id}/approve/`);
  return res.data as SurveyDraft;
}

export async function cancelSurveyDraft(id: string): Promise<SurveyDraft> {
  const res = await axios.post(`${INNER_CIRCLE_BASE}/survey-drafts/${id}/cancel/`);
  return res.data as SurveyDraft;
}

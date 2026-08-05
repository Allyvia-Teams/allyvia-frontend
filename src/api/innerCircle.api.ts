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
  /** Token used to build the customer's public profile/survey links. */
  portal_token: string;
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
  const res = await publicClient.post(`${INNER_CIRCLE_BASE}/public/unsubscribe/`, {}, { params: { token } });
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

export async function submitSurveyAnswer(token: string, questionId: string, responseValue: string): Promise<SurveyAnswerResult> {
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

// ---------------------------------------------------------------------------
// Survey insights (authenticated)
// ---------------------------------------------------------------------------

export type SurveyInsightConfidence = 'high' | 'medium' | 'low';

export interface SurveyInsightResponseBreakdown {
  value: string;
  count: number;
  pct: number;
}

export interface SurveyInsightQuestionSummary {
  question_id: string;
  question_text: string;
  question_type: SurveyQuestionType;
  response_count: number;
  top_responses: SurveyInsightResponseBreakdown[];
}

export interface SurveyInsightSummaryJson {
  sample_size: number;
  completion_rate: number;
  tokens_sent?: number;
  questions: SurveyInsightQuestionSummary[];
  top_themes: string[];
  confidence: SurveyInsightConfidence;
}

export interface SurveyInsight {
  id: string;
  draft_id: string;
  draft_status: SurveyDraftStatus;
  topics: string[];
  sample_size: number;
  completion_rate: number;
  confidence: SurveyInsightConfidence;
  summary_json: SurveyInsightSummaryJson;
  narrative: string;
  generated_at: string;
}

export async function fetchSurveyInsights(): Promise<SurveyInsight[]> {
  const res = await axios.get(`${INNER_CIRCLE_BASE}/survey-insights/`);
  return res.data as SurveyInsight[];
}

export async function generateSurveyDraft(): Promise<SurveyDraft> {
  const res = await axios.post(`${INNER_CIRCLE_BASE}/survey-drafts/generate/`);
  return res.data as SurveyDraft;
}

export async function generateSurveyInsights(): Promise<SurveyInsight[]> {
  const res = await axios.post(`${INNER_CIRCLE_BASE}/survey-insights/generate/`);
  return res.data as SurveyInsight[];
}

// ---------------------------------------------------------------------------
// Shared pagination envelope (DRF)
// ---------------------------------------------------------------------------

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ---------------------------------------------------------------------------
// Promotion rules (authenticated)
// ---------------------------------------------------------------------------

export type PromotionTierScope = 'vault' | 'regular' | 'shopper' | 'top_n';
export type PromotionTriggerType = 'new_inventory' | 'winback' | 'birthday' | 'manual';

export interface PromotionRule {
  id: string;
  name: string;
  description: string;
  tier_scope: PromotionTierScope;
  top_n: number | null;
  discount_pct: string;
  cadence_days: number;
  code_valid_days: number;
  trigger_type: PromotionTriggerType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromotionRuleInput {
  name: string;
  description: string;
  tier_scope: PromotionTierScope;
  top_n: number | null;
  discount_pct: string;
  cadence_days: number;
  code_valid_days: number;
  trigger_type: PromotionTriggerType;
  is_active: boolean;
}

export type GenerateDraftsSkipReason = 'not_opted_in' | 'no_email' | 'cadence' | 'pending_draft';

export interface GenerateDraftsSkipped {
  contact_id: string;
  name: string;
  reason: GenerateDraftsSkipReason;
}

export interface GenerateDraftsResult {
  created: number;
  skipped: GenerateDraftsSkipped[];
}

export async function fetchPromotions(params?: { page?: number; page_size?: number }): Promise<Paginated<PromotionRule>> {
  const res = await axios.get(`${INNER_CIRCLE_BASE}/promotions/`, { params });
  return res.data as Paginated<PromotionRule>;
}

export async function fetchPromotion(id: string): Promise<PromotionRule> {
  const res = await axios.get(`${INNER_CIRCLE_BASE}/promotions/${id}/`);
  return res.data as PromotionRule;
}

export async function createPromotion(data: PromotionRuleInput): Promise<PromotionRule> {
  const res = await axios.post(`${INNER_CIRCLE_BASE}/promotions/`, data);
  return res.data as PromotionRule;
}

export async function updatePromotion(id: string, data: Partial<PromotionRuleInput>): Promise<PromotionRule> {
  const res = await axios.patch(`${INNER_CIRCLE_BASE}/promotions/${id}/`, data);
  return res.data as PromotionRule;
}

export async function deletePromotion(id: string): Promise<void> {
  await axios.delete(`${INNER_CIRCLE_BASE}/promotions/${id}/`);
}

export async function generatePromotionDrafts(id: string): Promise<GenerateDraftsResult> {
  const res = await axios.post(`${INNER_CIRCLE_BASE}/promotions/${id}/generate-drafts/`);
  return res.data as GenerateDraftsResult;
}

// ---------------------------------------------------------------------------
// Email drafts / approval queue (authenticated)
// ---------------------------------------------------------------------------

export type EmailDraftType = 'promotion' | 'perk_invite' | 'vote_invite' | 'winback' | 'birthday';
export type EmailDraftStatus = 'draft' | 'approved' | 'sent' | 'dismissed' | 'failed';
export type PromoCodeStatus = 'issued' | 'redeemed' | 'expired' | 'void';

export interface EmailDraftContact {
  id: string;
  name: string;
  email: string;
  tier: CustomerTier | null;
  style_tags: string[];
}

export interface EmailDraftPromoCode {
  code: string;
  discount_pct: string;
  expires_at: string;
  status: PromoCodeStatus;
}

export interface EmailDraft {
  id: string;
  contact: EmailDraftContact;
  promotion_id: string | null;
  promotion_name: string | null;
  perk_id: string | null;
  draft_type: EmailDraftType;
  subject: string;
  body_html: string;
  personalization_context: Record<string, unknown>;
  status: EmailDraftStatus;
  promo_code: EmailDraftPromoCode | null;
  approved_at: string | null;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface EmailDraftListParams {
  page?: number;
  page_size?: number;
  status?: EmailDraftStatus;
  draft_type?: EmailDraftType;
}

export interface EmailDraftUpdate {
  subject?: string;
  body_html?: string;
}

export async function fetchEmailDrafts(params?: EmailDraftListParams): Promise<Paginated<EmailDraft>> {
  const res = await axios.get(`${INNER_CIRCLE_BASE}/email-drafts/`, { params });
  return res.data as Paginated<EmailDraft>;
}

export async function fetchEmailDraft(id: string): Promise<EmailDraft> {
  const res = await axios.get(`${INNER_CIRCLE_BASE}/email-drafts/${id}/`);
  return res.data as EmailDraft;
}

export async function updateEmailDraft(id: string, data: EmailDraftUpdate): Promise<EmailDraft> {
  const res = await axios.patch(`${INNER_CIRCLE_BASE}/email-drafts/${id}/`, data);
  return res.data as EmailDraft;
}

export async function approveEmailDraft(id: string): Promise<EmailDraft> {
  const res = await axios.post(`${INNER_CIRCLE_BASE}/email-drafts/${id}/approve/`);
  return res.data as EmailDraft;
}

export async function dismissEmailDraft(id: string): Promise<EmailDraft> {
  const res = await axios.post(`${INNER_CIRCLE_BASE}/email-drafts/${id}/dismiss/`);
  return res.data as EmailDraft;
}

// ---------------------------------------------------------------------------
// Promo codes (authenticated)
// ---------------------------------------------------------------------------

export interface PromoCode {
  id: string;
  code: string;
  discount_pct: string;
  status: PromoCodeStatus;
  expires_at: string | null;
  issued_at: string | null;
  redeemed_at: string | null;
  contact_id?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
}

export interface PromoCodeListParams {
  page?: number;
  page_size?: number;
  status?: PromoCodeStatus;
  search?: string;
}

export type PromoCodeInvalidReason = 'not_found' | 'expired' | 'redeemed' | 'void';

export interface PromoCodeValidationResult {
  valid: boolean;
  reason?: PromoCodeInvalidReason;
  discount_pct?: string;
  contact_name?: string;
  expires_at?: string;
}

export async function fetchPromoCodes(params?: PromoCodeListParams): Promise<Paginated<PromoCode>> {
  const res = await axios.get(`${INNER_CIRCLE_BASE}/promo-codes/`, { params });
  return res.data as Paginated<PromoCode>;
}

export async function validatePromoCode(code: string): Promise<PromoCodeValidationResult> {
  const res = await axios.post(`${INNER_CIRCLE_BASE}/promo-codes/validate/`, { code });
  return res.data as PromoCodeValidationResult;
}

export async function redeemPromoCode(code: string, saleId?: string): Promise<PromoCodeValidationResult> {
  const payload: { code: string; sale_id?: string } = { code };
  if (saleId) payload.sale_id = saleId;
  const res = await axios.post(`${INNER_CIRCLE_BASE}/promo-codes/redeem/`, payload);
  return res.data as PromoCodeValidationResult;
}

// ---------------------------------------------------------------------------
// Perk events (authenticated)
// ---------------------------------------------------------------------------

export type PerkType = 'design_meeting' | 'private_event' | 'early_access';
export type PerkEligibleScope = 'top_n' | 'tier';
export type PerkStatus = 'draft' | 'inviting' | 'closed';
export type PerkInviteStatus = 'invited' | 'interested' | 'booked' | 'declined';

export interface PerkResponseCounts {
  invited: number;
  interested: number;
  booked: number;
  declined: number;
}

export interface PerkEvent {
  id: string;
  title: string;
  description: string;
  perk_type: PerkType;
  eligible_scope: PerkEligibleScope;
  top_n: number;
  tier: string | null;
  capacity: number | null;
  event_date: string | null;
  location: string;
  status: PerkStatus;
  invite_count: number;
  response_counts: PerkResponseCounts;
  created_at: string;
  updated_at: string;
}

export interface PerkEventInput {
  title: string;
  description: string;
  perk_type: PerkType;
  eligible_scope: PerkEligibleScope;
  top_n: number;
  tier: string | null;
  capacity: number | null;
  event_date: string | null;
  location: string;
  status?: PerkStatus;
}

export interface PerkInviteResult {
  invited: number;
  drafts_created: number;
}

export interface PerkInviteContact {
  id: string;
  name: string;
  email: string;
  tier: CustomerTier | null;
  ltv: string | null;
}

export interface PerkInvite {
  id: string;
  contact: PerkInviteContact;
  status: PerkInviteStatus;
  responded_at: string | null;
  scheduled_at: string | null;
  notes: string;
}

export interface PerkInviteUpdate {
  status?: PerkInviteStatus;
  scheduled_at?: string | null;
  notes?: string;
}

export async function fetchPerks(params?: { page?: number; page_size?: number }): Promise<Paginated<PerkEvent>> {
  const res = await axios.get(`${INNER_CIRCLE_BASE}/perks/`, { params });
  return res.data as Paginated<PerkEvent>;
}

export async function fetchPerk(id: string): Promise<PerkEvent> {
  const res = await axios.get(`${INNER_CIRCLE_BASE}/perks/${id}/`);
  return res.data as PerkEvent;
}

export async function createPerk(data: PerkEventInput): Promise<PerkEvent> {
  const res = await axios.post(`${INNER_CIRCLE_BASE}/perks/`, data);
  return res.data as PerkEvent;
}

export async function updatePerk(id: string, data: Partial<PerkEventInput>): Promise<PerkEvent> {
  const res = await axios.patch(`${INNER_CIRCLE_BASE}/perks/${id}/`, data);
  return res.data as PerkEvent;
}

export async function deletePerk(id: string): Promise<void> {
  await axios.delete(`${INNER_CIRCLE_BASE}/perks/${id}/`);
}

export async function invitePerkMembers(id: string): Promise<PerkInviteResult> {
  const res = await axios.post(`${INNER_CIRCLE_BASE}/perks/${id}/invite/`);
  return res.data as PerkInviteResult;
}

export async function fetchPerkInvites(perkId: string): Promise<PerkInvite[]> {
  const res = await axios.get(`${INNER_CIRCLE_BASE}/perks/${perkId}/invites/`);
  return res.data as PerkInvite[];
}

export async function updatePerkInvite(inviteId: string, data: PerkInviteUpdate): Promise<PerkInvite> {
  const res = await axios.patch(`${INNER_CIRCLE_BASE}/perk-invites/${inviteId}/`, data);
  return res.data as PerkInvite;
}

// ---------------------------------------------------------------------------
// Style Vote / buying rounds (authenticated)
// ---------------------------------------------------------------------------

export type BuyingRoundStatus = 'draft' | 'open' | 'closed';
export type BuyingRoundScope = 'top_n' | 'tier';

export interface BuyingRoundOption {
  label: string;
  image_url?: string | null;
  description?: string | null;
}

export interface BuyingRound {
  id: string;
  title: string;
  description: string;
  options: BuyingRoundOption[];
  eligible_scope: BuyingRoundScope;
  top_n: number;
  tier: string | null;
  status: BuyingRoundStatus;
  closes_at: string | null;
  opened_at: string | null;
  closed_at: string | null;
  winning_option_index: number | null;
  fulfilled_item: string | null;
  invite_count: number;
  vote_count: number;
  is_accepting_votes: boolean;
  created_at: string;
  updated_at: string;
}

export interface BuyingRoundInput {
  title: string;
  description: string;
  options: BuyingRoundOption[];
  eligible_scope: BuyingRoundScope;
  top_n: number;
  tier: string | null;
  closes_at: string | null;
}

export interface VoteSkipped {
  contact_id: string;
  name: string;
  reason: 'not_opted_in' | 'no_email' | 'already_invited';
}

export interface BuyingRoundInviteResult {
  invited: number;
  drafts_created: number;
  skipped: VoteSkipped[];
}

export interface VoteInvite {
  id: string;
  contact: PerkInviteContact;
  voted_option_index: number | null;
  created_at: string;
}

export interface BuyingRoundOptionResult {
  option_index: number;
  label: string;
  image_url: string | null;
  votes: number;
  share: number;
}

export interface BuyingRoundTally {
  results: BuyingRoundOptionResult[];
  total_votes: number;
  invited: number;
  participation_rate: number;
  // Empty when nobody has voted; more than one entry means a genuine tie the
  // owner has to settle when closing.
  winning_option_indexes: number[];
}

export interface CloseBuyingRoundInput {
  winning_option_index?: number;
  fulfilled_item?: string | null;
}

export async function fetchBuyingRounds(params?: { page?: number; page_size?: number }): Promise<Paginated<BuyingRound>> {
  const res = await axios.get(`${INNER_CIRCLE_BASE}/buying-rounds/`, { params });
  return res.data as Paginated<BuyingRound>;
}

export async function createBuyingRound(data: BuyingRoundInput): Promise<BuyingRound> {
  const res = await axios.post(`${INNER_CIRCLE_BASE}/buying-rounds/`, data);
  return res.data as BuyingRound;
}

export async function updateBuyingRound(id: string, data: Partial<BuyingRoundInput>): Promise<BuyingRound> {
  const res = await axios.patch(`${INNER_CIRCLE_BASE}/buying-rounds/${id}/`, data);
  return res.data as BuyingRound;
}

export async function deleteBuyingRound(id: string): Promise<void> {
  await axios.delete(`${INNER_CIRCLE_BASE}/buying-rounds/${id}/`);
}

export async function openBuyingRound(id: string): Promise<BuyingRound> {
  const res = await axios.post(`${INNER_CIRCLE_BASE}/buying-rounds/${id}/open/`);
  return res.data as BuyingRound;
}

export async function closeBuyingRound(id: string, data?: CloseBuyingRoundInput): Promise<BuyingRound & { tally: BuyingRoundTally }> {
  const res = await axios.post(`${INNER_CIRCLE_BASE}/buying-rounds/${id}/close/`, data ?? {});
  return res.data as BuyingRound & { tally: BuyingRoundTally };
}

export async function inviteBuyingRoundMembers(id: string): Promise<BuyingRoundInviteResult> {
  const res = await axios.post(`${INNER_CIRCLE_BASE}/buying-rounds/${id}/invite/`);
  return res.data as BuyingRoundInviteResult;
}

export async function fetchBuyingRoundInvites(id: string): Promise<VoteInvite[]> {
  const res = await axios.get(`${INNER_CIRCLE_BASE}/buying-rounds/${id}/invites/`);
  return res.data as VoteInvite[];
}

export async function fetchBuyingRoundResults(id: string): Promise<BuyingRoundTally> {
  const res = await axios.get(`${INNER_CIRCLE_BASE}/buying-rounds/${id}/results/`);
  return res.data as BuyingRoundTally;
}

// ---------------------------------------------------------------------------
// Public Style Vote (token-authenticated, customer-facing)
// ---------------------------------------------------------------------------

export type PublicVoteState = 'open' | 'completed' | 'expired';

export interface PublicVoteOption {
  option_index: number;
  label: string;
  image_url: string | null;
  description: string | null;
}

export interface PublicVoteRound {
  id: string;
  title: string;
  description: string;
  closes_at: string | null;
  options: PublicVoteOption[];
}

export interface PublicVote {
  state: PublicVoteState;
  company: PublicSurveyCompany;
  round?: PublicVoteRound;
  voted_option_index: number | null;
}

export interface PublicVoteResult {
  status: 'recorded';
  option_index: number;
}

export async function fetchPublicVote(token: string): Promise<PublicVote> {
  const res = await publicClient.get(`${INNER_CIRCLE_BASE}/public/vote/`, {
    params: { token }
  });
  return res.data as PublicVote;
}

export async function submitPublicVote(token: string, optionIndex: number): Promise<PublicVoteResult> {
  const res = await publicClient.post(`${INNER_CIRCLE_BASE}/public/vote/submit/`, { option_index: optionIndex }, { params: { token } });
  return res.data as PublicVoteResult;
}

// ---------------------------------------------------------------------------
// Tier benefits + cross-store membership (authenticated)
// ---------------------------------------------------------------------------

export interface TierBenefit {
  id: string;
  tier: CustomerTier;
  label: string;
  storewide_discount_pct: string;
  perks_description: string;
  is_active: boolean;
}

export interface TierBenefitInput {
  tier: CustomerTier;
  label: string;
  storewide_discount_pct: string;
  perks_description: string;
  is_active: boolean;
}

export interface MembershipStore {
  company_id: string;
  company_name: string;
  tier: string;
  tier_label: string;
  storewide_discount_pct: string;
}

export interface MembershipLookupResult {
  member: {
    email: string;
    stores: MembershipStore[];
  } | null;
}

export async function fetchTierBenefits(): Promise<TierBenefit[]> {
  const res = await axios.get(`${INNER_CIRCLE_BASE}/benefits/`);
  return res.data as TierBenefit[];
}

export async function saveTierBenefits(benefits: TierBenefitInput[]): Promise<TierBenefit[]> {
  const res = await axios.put(`${INNER_CIRCLE_BASE}/benefits/`, benefits);
  return res.data as TierBenefit[];
}

export async function lookupMembership(email: string): Promise<MembershipLookupResult> {
  const res = await axios.get(`${INNER_CIRCLE_BASE}/membership/lookup/`, { params: { email } });
  return res.data as MembershipLookupResult;
}

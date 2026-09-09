import axiosServices from 'utils/axios';

// Stripe Connect endpoints are mounted at /api/stripe/ — OUTSIDE the /api/v1
// axios baseURL (see backend allyvia/urls.py). Build absolute URLs from the
// configured origin (crm.ts / innerCircle.api.ts precedent): axios ignores
// baseURL for absolute URLs while the auth interceptors still apply.
const API_ORIGIN = new URL(import.meta.env.VITE_APP_API_URL || 'http://localhost:8000/api/v1').origin;
const STRIPE_BASE = `${API_ORIGIN}/api/stripe`;

// Mirrors stripe_integration/serializers.py OnboardingStatusResponse.
// `requirements` mirrors services.onboarding_status()'s requirements block —
// Stripe requirement keys like 'individual.id_number', plus disabled_reason
// and the epoch-seconds current_deadline.
export interface StripeRequirements {
  currently_due: string[];
  past_due: string[];
  eventually_due: string[];
  pending_verification: string[];
  disabled_reason: string | null;
  current_deadline: number | null;
}

export interface StripeConnectionStatus {
  connected: boolean;
  account_id: string;
  state: 'not_started' | 'pending' | 'enabled_with_requirements' | 'complete';
  charges_enabled: boolean;
  payouts_enabled: boolean;
  action_required: boolean;
  requirements: StripeRequirements;
  onboarded_at: string | null;
}

export interface StripeOnboardingLink {
  url: string;
  expires_at: number;
  account_id: string;
}

// --- Terminal + POS card payments (mirrors stripe_integration/serializers.py) ---

export interface StripeConnectionToken {
  secret: string;
  location?: string | null;
}

export interface StripeReaderInfo {
  id: string;
  stripe_reader_id: string;
  label: string;
  device_type: string;
  serial_number: string;
  status: string; // 'online' | 'offline' as reported by Stripe
  location_id: string | null;
  last_seen_at: string | null;
}

export interface PosPaymentIntent {
  payment_intent_id: string;
  client_secret: string | null;
  status: string;
  amount: number; // minor units
  currency: string;
  sale_id: string;
  reader_id: string | null;
}

export interface PosPaymentStatus {
  sale_id: string;
  sale_status: 'draft' | 'completed' | 'voided' | 'partially_refunded' | 'refunded';
  payment_intent_id: string;
  status: string; // PaymentIntent status mirror ('succeeded', 'requires_payment_method', …)
  amount: number; // minor units
  currency: string;
  failure_code?: string;
  failure_message?: string;
}

// Mirrors stripe_integration/serializers.py RefundResponse.
// `state` is OUR workflow state, `status` mirrors Stripe's. They differ on
// purpose: a card refund is 'pending_settlement' here while Stripe still says
// 'pending', and settlement only becomes true on the webhook. Promise
// settlement off `state`, never off this call returning 200.
export interface PosRefundResult {
  refund_id: string | null;
  state: string;
  method: string;
  status: string;
  amount: number;
  currency: string;
  sale_id: string;
  sale_status: string;
  refunded_amount: string;
  created: boolean;
  warnings: string[];
}

const stripeApi = {
  // NOTE: sits behind an admin gate server-side (_AdminCompanyMixin) — a
  // non-admin role gets 403. Callers must degrade (chip → 'unknown'), never block.
  getConnectionStatus: async (companyId: string): Promise<StripeConnectionStatus> => {
    const response = await axiosServices.get(`${STRIPE_BASE}/status`, { params: { company_id: companyId } });
    return response.data;
  },

  // Single-use hosted-onboarding Account Link; every call mints a fresh URL.
  createOnboardingLink: async (companyId: string): Promise<StripeOnboardingLink> => {
    const response = await axiosServices.post(`${STRIPE_BASE}/onboarding-link`, { company_id: companyId });
    return response.data;
  },

  // Short-lived secret the Terminal SDK exchanges to talk to Stripe as this
  // store. Minted per request server-side; any role at the company may call it.
  createConnectionToken: async (companyId: string): Promise<StripeConnectionToken> => {
    const response = await axiosServices.post(`${STRIPE_BASE}/connection-token`, { company_id: companyId });
    return response.data;
  },

  // The store's Terminal readers (the server refreshes its mirror from Stripe).
  listReaders: async (companyId: string): Promise<StripeReaderInfo[]> => {
    const response = await axiosServices.get(`${STRIPE_BASE}/readers`, { params: { company_id: companyId } });
    return response.data?.readers ?? [];
  },

  // Create (idempotently) the card-present PaymentIntent for a draft POS sale.
  // `amount` (major units) is the card leg of a split sale; omit for the full total.
  createPosPaymentIntent: async (params: { companyId: string; saleId: string; amount?: number }): Promise<PosPaymentIntent> => {
    const body: Record<string, unknown> = { company_id: params.companyId, sale_id: params.saleId };
    if (params.amount != null) body.amount = params.amount.toFixed(2);
    const response = await axiosServices.post(`${STRIPE_BASE}/pos/payment-intent`, body);
    return response.data;
  },

  // Poll where the sale's card payment stands. The backend live-checks Stripe
  // and finalizes the sale on success, so this is safe to gate the receipt on.
  getPosPaymentStatus: async (companyId: string, saleId: string): Promise<PosPaymentStatus> => {
    const response = await axiosServices.get(`${STRIPE_BASE}/pos/payment-status`, {
      params: { company_id: companyId, sale_id: saleId }
    });
    return response.data;
  },

  // Refund a POS sale. Omit `amount` for everything still refundable — the
  // server computes that, so a full refund after a partial one cannot
  // re-refund what already went back.
  //
  // `method` defaults to 'card' server-side and is deliberately not inferred:
  // an order with no card charge is REFUSED rather than quietly turned into
  // store credit, because those are different promises to the customer.
  refundPosSale: async (params: {
    companyId: string;
    saleId: string;
    amount?: number;
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    method?: 'card' | 'store_credit' | 'cash';
  }): Promise<PosRefundResult> => {
    const body: Record<string, unknown> = { company_id: params.companyId, sale_id: params.saleId };
    if (params.amount != null) body.amount = params.amount.toFixed(2);
    if (params.reason) body.reason = params.reason;
    if (params.method) body.method = params.method;
    const response = await axiosServices.post(`${STRIPE_BASE}/pos/refund`, body);
    return response.data;
  }
};

export default stripeApi;

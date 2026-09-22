import axiosServices from 'utils/axios';

// Re-exported below as part of this endpoint's contract; imported here too
// because a `export { type X } from` re-export does not bind X locally.
import type { PosRefundLineSelection } from './refundDispositions';
import type { RefundPolicy, RefundPolicyRules, RefundPolicyWriteResult } from './refundPolicy';

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

// Mirrors stripe_integration/serializers.py DisconnectResponse.
//
// Disconnect is an UNLINK, not a deletion: the Stripe account keeps existing
// and the owner keeps their Stripe dashboard, balance and payment history.
// `purged` counts the account-scoped mirror rows Allyvia dropped so the next
// onboarding starts clean. `status` is the freshly recomputed connection
// status — render from it rather than firing another GET /status, which would
// race this write.
export interface StripeDisconnectPurge {
  catalog_mappings: number;
  terminal_locations: number;
  readers_removed: number;
  readers_kept_for_history: number;
}

export interface StripeDisconnectResult {
  disconnected: boolean;
  account_id: string;
  warnings: string[];
  purged: StripeDisconnectPurge;
  status: StripeConnectionStatus;
}

// The 409 body when live work would be orphaned by the unlink.
export interface StripeDisconnectBlocker {
  kind: 'payments_in_flight' | 'refunds_unsent' | string;
  count: number;
  detail: string;
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
  /** Withheld under the return policy, minor units. `amount` is already net of it. */
  restocking_fee_minor?: number;
  store_credit?: {
    code: string;
    amount_minor: number;
    remaining_minor: number;
    expires_at: string | null;
  };
  warnings: string[];
}

export interface StoreCreditLookup {
  code: string;
  state: 'active' | 'redeemed' | 'void';
  currency: string;
  remaining_minor: number;
  remaining: string;
  amount_minor: number;
  customer_name: string | null;
  expires_at: string | null;
}

// The disposition taxonomy lives in its own axios-free module so the pure
// refund-maths modules can import it in a unit test; re-exported here because
// it is part of this endpoint's contract.
export {
  DEFAULT_REFUND_DISPOSITION,
  REFUND_DISPOSITIONS,
  REFUND_DISPOSITION_LABELS,
  type PosRefundLineSelection,
  type RefundDisposition
} from './refundDispositions';

// The return-policy wire shape lives in its own axios-free module for the same
// reason; re-exported here because it is this endpoint's contract.
export {
  DEFAULT_REFUND_POLICY_RULES,
  REFUND_POLICY_RULE_FIELDS,
  type RefundPolicy,
  type RefundPolicyRules,
  type RefundPolicyWriteResult
} from './refundPolicy';

// Mirrors stripe_integration/serializers.py RefundListItem — one row of
// `GET pos/refunds`, and the per-refund shape inside a sale's summary.
export interface PosRefundListItem {
  id: string;
  refund_id: string | null;
  state: string;
  method: string;
  status: string;
  amount: number; // minor units
  currency: string;
  sale_id: string | null;
  sale_receipt_number: string | null;
  initiated_by_id: string | null;
  initiated_by_email: string;
  line_items: Record<string, unknown>[];
  created_at: string;
  updated_at: string;
}

// One workflow transition. `actor` is already a label server-side — an email,
// or a system name like 'webhook:refund.failed' — never an id to resolve.
export interface PosRefundEvent {
  sequence: number;
  from_state: string;
  to_state: string;
  actor: string;
  created_at: string;
}

/** A refund plus its event trail — only the summary endpoint carries `events`. */
export interface PosRefundWithEvents extends PosRefundListItem {
  events: PosRefundEvent[];
}

/** What is left on one line of a sale. `refundable` is the stepper's ceiling. */
export interface PosRefundSummaryLine {
  line_id: string;
  name: string;
  sku: string;
  quantity: number;
  returned_quantity: number;
  refundable: number;
  unit_price: string;
  line_total: string;
}

// Mirrors StripeRefundSummaryView — one receipt's whole return history plus
// what is still returnable, in one round trip because they are always asked
// together.
export interface PosSaleRefundSummary {
  sale_id: string;
  receipt_number: string;
  sale_status: string;
  refunded_amount: string;
  refunds: PosRefundWithEvents[];
  lines: PosRefundSummaryLine[];
}

export interface PosRefundListResponse {
  refunds: PosRefundListItem[];
  count: number;
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

  // Unlink the store from its Stripe account. The account itself survives at
  // Stripe — the owner keeps their dashboard, balance and history — so this is
  // reversible in the sense that matters: they can connect again (and will get
  // a genuinely new account, not the old one replayed).
  //
  // `confirm` is required by the server on purpose; there is no way to call
  // this without meaning to. Throws with a 409 whose body carries `blockers`
  // (StripeDisconnectBlocker[]) when payments or refunds are still in flight.
  disconnect: async (companyId: string): Promise<StripeDisconnectResult> => {
    const response = await axiosServices.post(`${STRIPE_BASE}/disconnect`, { company_id: companyId, confirm: true });
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

  // Claim a physical reader onto this store's Terminal Location. The
  // registration_code comes off the reader's own screen (Settings → Generate
  // pairing code on a WisePOS E/S700); in test mode Stripe accepts the literal
  // 'simulated-wpe'.
  //
  // Admin-only server-side, and note the asymmetry with listReaders above:
  // company_id goes in the BODY on a POST and in the query string on a GET.
  // That is this module's convention, not an oversight.
  registerReader: async (companyId: string, payload: { registration_code: string; label?: string }): Promise<StripeReaderInfo> => {
    const body: Record<string, unknown> = { company_id: companyId, registration_code: payload.registration_code };
    if (payload.label) body.label = payload.label;
    const response = await axiosServices.post(`${STRIPE_BASE}/readers`, body);
    return response.data;
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
  },

  // Return specific lines of a sale; the server computes the amount from them,
  // so there is deliberately no `amount` here — a client that both picked the
  // lines and named the total could disagree with itself.
  //
  // `accepting_location_id` is where the goods were physically handed over,
  // which is not necessarily where they were sold: the policy's
  // allow_cross_location rule is judged on it, and it defaults server-side to
  // the sale's own location when omitted.
  refundPosSaleLines: async (params: {
    companyId: string;
    saleId: string;
    lines: PosRefundLineSelection[];
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    method?: 'card' | 'store_credit' | 'cash';
    acceptingLocationId?: string;
  }): Promise<PosRefundResult> => {
    const body: Record<string, unknown> = {
      company_id: params.companyId,
      sale_id: params.saleId,
      // `disposition` wins over the legacy `restock` boolean server-side, so
      // we send only the former and never both.
      lines: params.lines.map((line) => ({
        line_id: line.line_id,
        quantity: line.quantity,
        disposition: line.disposition
      }))
    };
    if (params.reason) body.reason = params.reason;
    if (params.method) body.method = params.method;
    if (params.acceptingLocationId) body.accepting_location_id = params.acceptingLocationId;
    const response = await axiosServices.post(`${STRIPE_BASE}/pos/refund/line-items`, body);
    return response.data;
  },

  // The store's refunds, newest first. `state` is comma-separated server-side;
  // pass the array and we join it.
  listRefunds: async (params: { companyId: string; state?: string[]; limit?: number }): Promise<PosRefundListResponse> => {
    const query: Record<string, unknown> = { company_id: params.companyId };
    if (params.state?.length) query.state = params.state.join(',');
    if (params.limit != null) query.limit = params.limit;
    const response = await axiosServices.get(`${STRIPE_BASE}/pos/refunds`, { params: query });
    return response.data;
  },

  // Approve a refund parked in `pending_approval`. Needs `pos.refund.approve`
  // AND a different user from the one who rang it: the server answers 403 with
  // code 'same_identity' when the same person tries both halves.
  //
  // Keyed by REFUND id, unlike saleRefundSummary below, which is keyed by SALE id.
  approveRefund: async (params: { companyId: string; refundId: string; note?: string }): Promise<PosRefundResult> => {
    const body: Record<string, unknown> = { company_id: params.companyId };
    if (params.note) body.note = params.note;
    const response = await axiosServices.post(`${STRIPE_BASE}/pos/refund/${params.refundId}/approve`, body);
    return response.data;
  },

  // Withdraw a refund that has not reached Stripe. The initiator may cancel
  // their own; anyone with `pos.refund.approve` may refuse someone else's.
  // Reserved units are released and every disposition movement is reversed.
  cancelRefund: async (params: { companyId: string; refundId: string; reason?: string }): Promise<PosRefundResult> => {
    const body: Record<string, unknown> = { company_id: params.companyId };
    if (params.reason) body.reason = params.reason;
    const response = await axiosServices.post(`${STRIPE_BASE}/pos/refund/${params.refundId}/cancel`, body);
    return response.data;
  },

  // One receipt's return history and what is still returnable on it.
  //
  // Keyed by SALE id (its approve/cancel neighbours are keyed by refund id).
  // A sale belonging to another company answers 404, not 403, so this cannot
  // be used to probe which sale ids exist elsewhere — callers must render a
  // 404 as "not found for your store", never as "you lack permission".
  saleRefundSummary: async (companyId: string, saleId: string): Promise<PosSaleRefundSummary> => {
    const response = await axiosServices.get(`${STRIPE_BASE}/pos/refund/${saleId}/summary`, {
      params: { company_id: companyId }
    });
    return response.data;
  },

  // The store's return rules, or null when none are set (ALL-69).
  //
  // Absence is meaningful: no policy means every return is allowed, and the
  // server says so with a 404 carrying code 'no_policy'. That one 404 is
  // resolved to null here so the settings card can render "no policy set"
  // rather than an error — every OTHER failure still throws, because a network
  // error rendered as "no policy" would invite an admin to create one over
  // rules they cannot see.
  //
  // Admin-gated server-side (resolve_company's default require_admin).
  getRefundPolicy: async (companyId: string): Promise<RefundPolicy | null> => {
    try {
      const response = await axiosServices.get(`${STRIPE_BASE}/pos/refund-policy`, { params: { company_id: companyId } });
      return response.data;
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { code?: string } } })?.response;
      if (res?.status === 404 && res.data?.code === 'no_policy') return null;
      throw err;
    }
  },

  lookupStoreCredit: async (params: { companyId: string; code: string }): Promise<StoreCreditLookup> => {
    const code = params.code.trim().toUpperCase();
    const response = await axiosServices.get(`${STRIPE_BASE}/pos/store-credit/${encodeURIComponent(code)}`, {
      params: { company_id: params.companyId }
    });
    return response.data;
  },

  // Create (201) or update (200) the store's return rules.
  //
  // Takes the WHOLE rule set on purpose: the serializer defaults every field
  // the body omits, so a partial PUT would silently reset rules the admin
  // never touched. `version` is read-only and bumps server-side only when a
  // rule actually changed; `changed` in the response says which.
  putRefundPolicy: async (companyId: string, rules: RefundPolicyRules): Promise<RefundPolicyWriteResult> => {
    const response = await axiosServices.put(`${STRIPE_BASE}/pos/refund-policy`, { company_id: companyId, ...rules });
    return response.data;
  }
};

export default stripeApi;

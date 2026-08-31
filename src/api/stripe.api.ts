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
  }
};

export default stripeApi;

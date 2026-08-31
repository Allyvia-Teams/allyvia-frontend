import axiosServices from 'utils/axios';
import { buildFeedbackPayload, clampSnoozeDays } from './agentFeedback';
import type { FeedbackInput } from './agentFeedback';

export type { FeedbackInput, FeedbackPayload, FeedbackReasonCode, FeedbackSentiment } from './agentFeedback';

export interface PendingRecommendation {
  id: string;
  recommendation_id: string;
  generated_at: string;
  expires_at: string;
  displayed_at: string | null;
  dismissed_at: string | null;
  recommendation_text: string;
  urgency_score: number;
  impact_score: number;
  confidence_score: number;
  predicted_impact_dollars: string | null;
  signal_sources: Record<string, unknown>;
  // --- ALL-17 feedback loop ---
  // Lifecycle as the server sees it. Widened with `string` because the backend
  // owns this vocabulary and may grow it; the UI branches on the states it
  // knows and treats anything else as pending rather than rendering nothing.
  status?: RecommendationStatus;
  // Coarse category (reorder, staffing, supplier…). Used to group the savings
  // breakdown; free-form for the same reason as `status`.
  rec_type?: string | null;
  // Set when the merchant deferred the card. A value in the PAST means the
  // snooze has lapsed and the card is back — see isBackFromSnooze.
  snoozed_until?: string | null;
}

export type RecommendationStatus = 'pending' | 'accepted' | 'dismissed' | 'snoozed' | string;

// Deterministic, non-LLM facts (duplicate bills, large overdue payables) —
// see agent/graph.py's _compute_alerts. Independent of the two-slot
// recommendation narrative and its score/dollar thresholds.
export interface AgentAlert {
  type: 'duplicate_bill' | 'overdue_payable' | string;
  title: string;
  detail: string;
  source_signal: string;
  vendor: string;
  date: string;
  amount: number;
  key: string;
}

// A recommendation the merchant has been shown on 3+ of the last 5 days without
// acting on it. Reported as a standing digest rather than re-spending one of the
// two recommendation slots on it every run — see agent/graph.py's
// _chronic_items. `days_outstanding` is measured from the item's first
// appearance ever, not from the detection window, so the UI can escalate as it
// ages the same way it does for alerts.
export interface AgentOngoingItem {
  type: 'overstock' | 'reorder' | 'supplier' | 'staffing' | 'other' | string;
  target_skus: string[];
  text: string;
  days_outstanding: number;
  first_surfaced_at: string;
}

export interface PendingRecommendationsResponse {
  recommendations: PendingRecommendation[];
  alerts: AgentAlert[];
  ongoing: AgentOngoingItem[];
}

// The verified outcome the weekly ask is anchored to, when there is one.
// Present means the loop has measured a real dollar result the merchant can be
// reminded of before being asked to rate anything.
export interface FeedbackAnchor {
  rec_id: string;
  dollar_value: number;
  metric: string;
  window: string;
}

export interface FeedbackDue {
  due: boolean;
  // null when nothing has been verified yet — the banner falls back to the
  // plain weekly question.
  anchor?: FeedbackAnchor | null;
}

// Realized savings, measured 14-90 days after a merchant acts. `window` is the
// period the total covers ("ytd"); it is never annualized or projected, here or
// anywhere downstream.
export interface SavingsResponse {
  realized_total_dollars: number;
  by_type: Record<string, number>;
  window: string;
  recommendation_count: number;
}

// The feedback endpoint is idempotent per (pending, sentiment): tapping the
// same thumb twice answers "unchanged" rather than double-counting.
export interface FeedbackSubmitResponse {
  status: 'recorded' | 'unchanged' | string;
}

export interface SnoozeResponse {
  status?: string;
  snoozed_until?: string;
}

export interface GenerateRecommendationSurfaced {
  surfaced: true;
  recommendation_text: string;
  urgency_score: number;
  impact_score: number;
  confidence_score: number;
  predicted_impact_dollars: number | null;
  threshold_cleared: boolean;
  pending_id: string | null;
}

export interface GenerateRecommendationNotSurfaced {
  surfaced: false;
  reason: string;
}

export interface GenerateRecommendationAlreadyGenerated extends PendingRecommendation {
  already_generated: true;
}

export type GenerateRecommendationResponse =
  | GenerateRecommendationSurfaced
  | GenerateRecommendationNotSurfaced
  | GenerateRecommendationAlreadyGenerated;

class PendingRecommendationsAPI {
  static async list(): Promise<PendingRecommendationsResponse> {
    const response = await axiosServices.get('/agent/recommendations/pending/');
    return response.data;
  }

  static async dismiss(id: string): Promise<void> {
    await axiosServices.post(`/agent/recommendations/${id}/dismiss/`);
  }

  /**
   * Record a thumbs up/down on one recommendation.
   *
   * Idempotent per (pending, sentiment) server-side, so callers may re-post
   * freely — a repeat tap comes back {status: "unchanged"}. A "down" also
   * dismisses the card server-side; a subsequent "up" un-dismisses it, which is
   * why the UI keeps a declined card on screen rather than removing it outright.
   */
  static async submitFeedback(id: string, input: FeedbackInput): Promise<FeedbackSubmitResponse> {
    const response = await axiosServices.post(`/agent/recommendations/${id}/feedback/`, buildFeedbackPayload(input));
    return response.data;
  }

  /** Defer a recommendation for 1-30 days. Days are clamped, not validated —
   *  see clampSnoozeDays. */
  static async snooze(id: string, days: number): Promise<SnoozeResponse> {
    const response = await axiosServices.post(`/agent/recommendations/${id}/snooze/`, { days: clampSnoozeDays(days) });
    return response.data;
  }

  static async generate(force?: boolean): Promise<GenerateRecommendationResponse> {
    // Observed agent runs take 84–120s. 180s gives the client margin over that
    // while staying under the server ceiling (Cloud Run 300s / gunicorn 330s).
    // If it still aborts, onError falls back to polling the pending list.
    const response = await axiosServices.post('/agent/recommendations/generate/', force ? { force: true } : {}, { timeout: 180000 });
    return response.data;
  }
}

class FeedbackAPI {
  static async isDue(): Promise<FeedbackDue> {
    const response = await axiosServices.get('/agent/feedback/');
    return response.data;
  }

  static async submit(rating: number): Promise<void> {
    await axiosServices.post('/agent/feedback/', { rating });
  }
}

class SavingsAPI {
  static async getSavings(): Promise<SavingsResponse> {
    const response = await axiosServices.get('/agent/savings/');
    return response.data;
  }
}

export class AgentAPI {
  static readonly Recommendations = PendingRecommendationsAPI;
  static readonly Feedback = FeedbackAPI;
  static readonly Savings = SavingsAPI;
}

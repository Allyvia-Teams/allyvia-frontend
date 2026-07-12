import axiosServices from 'utils/axios';

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
}

export interface FeedbackDue {
  due: boolean;
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
  static async list(): Promise<PendingRecommendation[]> {
    const response = await axiosServices.get('/agent/recommendations/pending/');
    return response.data;
  }

  static async dismiss(id: string): Promise<void> {
    await axiosServices.post(`/agent/recommendations/${id}/dismiss/`);
  }

  static async generate(force?: boolean): Promise<GenerateRecommendationResponse> {
    // 120s to match the LB backend timeout and gunicorn --timeout, so a slow
    // agent run completes rather than aborting the client mid-request.
    const response = await axiosServices.post('/agent/recommendations/generate/', force ? { force: true } : {}, { timeout: 120000 });
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

export class AgentAPI {
  static readonly Recommendations = PendingRecommendationsAPI;
  static readonly Feedback = FeedbackAPI;
}

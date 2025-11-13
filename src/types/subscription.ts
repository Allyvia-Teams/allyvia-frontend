// ==============================|| SUBSCRIPTION TYPES ||============================== //

export interface CreateCheckoutSessionRequest {
  price_id: string; // Required: Stripe Price ID or Product ID
  billing_cycle?: string; // Optional: Default "12" (months)
  plan_name?: string; // Optional: Default ""
  trial_period_days?: number; // Optional: Default 30
}

export interface CreateCheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
}

export interface CurrentPlan {
  plan_name: string;
  status: string; // e.g., "TRIALING"
  trial_end_date?: string; // Formatted date string
  can_cancel?: boolean; // Whether subscription can be canceled
}

export interface SubscriptionDetails {
  subscription_id: string;
  start_date: string; // Formatted date string
  cancel_at: string | null; // Formatted date string or null
  renewal_date: string | null; // Formatted date string or null
  subscription_end_date: string | null; // Formatted date string or null
  trial_end_date?: string | null; // Formatted date string or null (can be in subscription_details)
}

import type { AvailableModule } from 'types/role';

export interface SubscriptionStatusResponse {
  status: 'Active' | 'Inactive';
  subscription_id: string | null;
  subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled' | null;
  subscription_plan: string | null;
  trial_end_date: string | null; // Formatted date string or null
  current_plan?: CurrentPlan; // Nested current plan info
  subscription_details?: SubscriptionDetails; // Nested subscription details
  company_id?: string; // Company UUID
  // available_modules can be either string[] (legacy) or AvailableModule[] (new)
  available_modules?: string[] | AvailableModule[]; // Module keys or objects available in this subscription (from backend)
  subscription_start_date?: string | null; // ISO 8601 format (for backward compatibility)
  subscription_end_date?: string | null; // ISO 8601 format (for backward compatibility)
  subscription_cancel_at?: string | null; // ISO 8601 format (for backward compatibility)
  message?: string; // Only if no subscription
}

export interface CancelSubscriptionResponse {
  success: boolean;
  message: string;
  cancel_at: number; // Unix timestamp
}

export interface UpdateSubscriptionRequest {
  price_id?: string; // Optional: New price ID to change plan
  cancel_at_period_end?: boolean; // Optional: Boolean to resume canceled subscription
}

export interface UpdateSubscriptionResponse {
  success: boolean;
  message: string;
  subscription_id: string;
  status: string;
  cancel_at_period_end: boolean;
}

export interface TestSubscribeResponse {
  success: boolean;
}

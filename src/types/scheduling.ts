// Scheduling engine types — mirror backend scheduling/serializers.py

export interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_items: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface StaffRole {
  id: number;
  name: string;
  hourly_rate_default: string | null;
  is_active: boolean;
  created_at: string;
}

export interface RoleAssignment {
  id: number;
  employee: string;
  employee_name: string;
  staff_role: number;
  staff_role_name: string;
  proficiency: number;
  is_primary: boolean;
}

export type FlexRule = 'fixed' | 'scale_with_demand';

export interface TemplateBlock {
  id: number;
  template: number;
  day_of_week: number; // 0=Monday .. 6=Sunday
  start_time: string; // HH:MM:SS
  end_time: string;
  staff_role: number;
  staff_role_name: string;
  min_staff: number;
  max_staff: number;
  flex_rule: FlexRule;
}

export interface ScheduleTemplate {
  id: number;
  name: string;
  location_id: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  blocks?: TemplateBlock[];
}

export type AvailabilityPreference = 'preferred' | 'available' | 'if_needed';

export interface AvailabilitySlot {
  id: number;
  employee: string;
  employee_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  preference: AvailabilityPreference;
}

export interface AvailabilityException {
  id: number;
  employee: string;
  employee_name: string;
  date: string;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string;
}

export interface ForecastRow {
  date: string;
  hour: number;
  location_id: string;
  predicted_sales: string;
  predicted_transactions: number;
  confidence: number;
  drivers: Record<string, any>;
  model_version: string;
}

export type RecommendationStatus = 'draft' | 'presented' | 'approved' | 'partially_approved' | 'dismissed';

export interface RecommendedShift {
  id: number;
  employee: string | null;
  employee_name: string | null;
  staff_role: number;
  staff_role_name: string;
  date: string;
  start_time: string;
  end_time: string;
  block: number | null;
  assignment_score: number | null;
  hourly_cost: string | null;
  created_shift: number | null;
}

export interface ScheduleWarning {
  type: string;
  date?: string;
  role?: string;
  window?: string;
  confidence?: number;
  employee_id?: string;
}

export interface DayExplanation {
  date: string;
  headline: string;
  detail: string;
}

export interface Narrative {
  summary: string;
  day_explanations: DayExplanation[];
  savings_story: string;
  cautions: string[];
}

export interface StageADecision {
  block_id: number;
  day_of_week: number;
  role: string;
  window: string;
  flex_rule: FlexRule;
  block_demand: number;
  p20: number;
  p80: number;
  demand_ratio: number;
  confidence: number;
  min_staff: number;
  max_staff: number;
  headcount: number;
}

export interface ScheduleRecommendation {
  id: number;
  week_start: string;
  template: number;
  status: RecommendationStatus;
  projected_labor_cost: string;
  projected_sales: string;
  projected_labor_pct: number | null;
  baseline_labor_cost: string;
  projected_savings: string;
  warning_count: number;
  created_at: string;
  // Detail-only fields
  warnings?: ScheduleWarning[];
  narrative?: Narrative | null;
  stage_a?: StageADecision[];
  actuals?: Record<string, number | string | null> | null;
  shifts?: RecommendedShift[];
}

export interface ShiftCandidate {
  employee: string;
  name: string;
  rate: number;
  requires_overtime: boolean;
  is_current: boolean;
}

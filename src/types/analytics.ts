// Updated to match actual backend field names
export interface AnalyticsSummary {
  total_revenue: number; // Backend: total_amount from QBInvoice (status='paid')
  payments_count: number; // Backend: count of QBPayment records
  avg_ticket: number; // Backend: average total_amount from QBInvoice
  expenses: number; // Backend: sum of QBBill.amount + QBPurchase.amount
  net: number; // Backend: total_revenue - expenses
  inventory_value: number; // Backend: sum of quantity_on_hand * unit_price from InventoryItem
  currency: string; // Backend: 'USD' (default) or from company settings
}

export interface RevenueSeriesPoint {
  date: string; // Backend: date field from QBInvoice
  amount: number; // Backend: total_amount from QBInvoice
}

export interface ExpenseBreakdownItem {
  category: string; // Backend: derived from account_name or vendor_name
  amount: number; // Backend: amount from QBBill/QBPurchase
}

export interface PaymentSplitItem {
  provider: string; // Backend: 'quickbooks' or 'square'
  amount: number; // Backend: amount from QBPayment or 0 for Square
}

export interface TopItem {
  item_id: string; // Backend: id from InventoryItem
  name: string; // Backend: name from InventoryItem
  qty: number; // Backend: quantity_on_hand from InventoryItem
  amount: number; // Backend: quantity_on_hand * unit_price (stock_value)
}

export interface LowStockItem {
  item_id: string; // Backend: id from InventoryItem
  name: string; // Backend: name from InventoryItem
  on_hand: number; // Backend: quantity_on_hand from InventoryItem
  reorder_point: number; // Backend: reorder_point from InventoryItem
}

export interface TimeUtilizationPoint {
  week_start: string; // Backend: week_start date (YYYY-MM-DD)
  hours: number; // Backend: sum of duration_seconds / 3600
}

// Employee Analytics
export interface EmployeeSummary {
  total_hours: number;
  active_employees: number;
  avg_hours_per_employee: number;
  current_on_shift: number; // Added from API documentation
}

export interface EmployeeTimeUtilizationPoint {
  date: string; // Changed from week_start to date to match API
  hours: number; // Changed from string to number to match API
}

export interface TopEmployee {
  employee_id: string;
  employee_name: string; // Changed from name to employee_name to match API
  hours: number;
}

export interface EmployeeTimeBreakdown {
  employee_id: string;
  employee_name: string;
  hours: number;
}

export interface DailyEmployeeData {
  employee_id: string;
  employee_name: string;
  hours: number;
  // Optional real shift times (ISO strings) - backend may provide
  start_time?: string | null;
  end_time?: string | null;
}

export interface DailyBreakdown {
  day: string; // "Monday", "Tuesday", etc.
  date: string; // "2025-09-17"
  employees: DailyEmployeeData[];
}

export interface EmployeeDailyResponse {
  daily_breakdown: DailyBreakdown[];
  isLoading?: boolean;
}

// Employee additional KPIs (from consolidated employee analytics)
export interface EmployeeKpis {
  open_entries: number;
  total_shifts: number;
  avg_shift_length_hours: number;
  median_shift_length_hours: number;
  longest_shift_hours: number;
  days_worked_unique: number;
  current_on_shift: number;
}

// Employee heatmap (weekday x hour)
export interface EmployeeHeatmapCell {
  weekday: string; // "Mon", "Tue", etc.
  hour: number; // 0-23 for hour bucket, or 900/930/1000/1030 for half-hour
  hours: number;
}

export interface EmployeeHeatmapResponse {
  matrix: EmployeeHeatmapCell[];
  isLoading?: boolean;
}

// Employee Details (Timeline + Heatmap combined)
export interface EmployeeDetailsResponse {
  employee_id?: string;
  employee_name?: string;
  timeline_data: {
    daily_breakdown: DailyBreakdown[];
  };
  heatmap_data: {
    matrix: EmployeeHeatmapCell[];
  };
  summary: {
    total_hours: number;
    days_worked: number;
    avg_hours_per_day: number;
  };
}

// Shift length histogram
export interface ShiftLengthBin {
  range: string; // e.g., "0-2h", "2-4h"
  count: number;
}

export interface ShiftLengthResponse {
  bins: ShiftLengthBin[];
}

// Overtime trend
export interface OvertimePoint {
  week?: string;
  month?: string;
  ot_hours: number;
}

export interface OvertimeResponse {
  series: OvertimePoint[];
}

export interface EmployeeOverviewResponse {
  summary: EmployeeSummary;
  time_utilization: EmployeeTimeUtilizationPoint[];
  isLoading?: boolean;
}

export interface EmployeeAllResponse extends EmployeeOverviewResponse {
  top_employees: TopEmployee[];
  employee_time_breakdown: EmployeeTimeBreakdown[];
}

export interface AnalyticsParams {
  // Date filters (support both legacy and new keys)
  from_date?: string; // legacy support
  to_date?: string; // legacy support
  start_date?: string; // legacy support
  end_date?: string; // legacy support
  from?: string; // preferred
  to?: string; // preferred
  // Common optional filters
  employee_id?: string; // single employee (timeline)
  employee_ids?: string; // csv
  status?: 'active' | 'all';
  group_by?: 'day' | 'week' | 'month';
  rule?: 'daily8' | 'weekly40';
  provider?: string; // Backend expects 'provider' parameter
  location_id?: string; // Backend expects 'location_id' parameter
}

// New Inventory Analytics Types
export interface InventorySummary {
  total_items: number;
  total_inventory_value: number;
  total_cost_value: number;
  average_profit_margin: number;
  low_stock_count: number;
  out_of_stock_count: number;
  active_items: number;
  inactive_items: number;
  taxable_items: number;
  non_taxable_items: number;
  currency: string;
}

export interface InventoryCategory {
  category: string;
  item_count: number;
  total_quantity: number;
  total_value: number;
  average_price: number;
  low_stock_count: number;
}

export interface InventoryLocation {
  location: string;
  item_count: number;
  total_quantity: number;
  total_value: number;
  bin_locations_count: number;
}

export interface InventoryType {
  item_type: string;
  item_count: number;
  total_quantity: number;
  total_value: number;
  average_price: number;
}

export interface InventoryAlert {
  alert_type: string;
  severity: 'critical' | 'warning' | 'info';
  item_id: string;
  item_name: string;
  sku: string;
  current_value: number;
  threshold_value?: number;
  message: string;
}

export interface InventoryAlerts {
  low_stock_alerts: InventoryAlert[];
  out_of_stock_alerts: InventoryAlert[];
  high_value_alerts: InventoryAlert[];
  zero_price_alerts: InventoryAlert[];
  missing_data_alerts: InventoryAlert[];
  total_alerts_count: number;
  critical_alerts_count: number;
  warning_alerts_count: number;
  info_alerts_count: number;
  // Legacy support
  alert_counts?: {
    critical: number;
    warning: number;
    info: number;
    total: number;
  };
}

// Inventory Overview endpoint types
export interface InventoryTrendsDonut {
  labels: string[];
  values: number[];
}

export interface InventoryTrendsCategoryRow {
  category: string;
  total_quantity: number;
  total_value: number;
  item_count: number;
  percentage: number;
}

export interface InventoryTrendsOverview {
  donut: InventoryTrendsDonut;
  categories: InventoryTrendsCategoryRow[];
  isLocal?: boolean;
  total_items?: number;
  total_value?: number;
}

export interface InventoryOverviewResponse {
  summary: InventorySummary;
  trends: InventoryTrendsOverview;
  alerts: InventoryAlerts;
}

export interface InventoryAllResponse {
  summary: InventorySummary;
  categories: InventoryCategory[];
  locations: InventoryLocation[];
  types: InventoryType[];
  low_stock: LowStockItem[];
  top_items: TopItem[];
  alerts: InventoryAlerts;
  trends: InventoryTrendsOverview;
}

// CRM Analytics Types
export interface CRMAnalyticsParams {
  start_date?: string;
  end_date?: string;
  from_date?: string; // Legacy
  to_date?: string; // Legacy
  from?: string; // Legacy
  to?: string; // Legacy
  company_id?: string;
  owner_ids?: string[];
  stage_ids?: string[];
  priority_ids?: string[];
  source_ids?: string[];
  min_value?: number;
  max_value?: number;
  min_probability?: number;
  max_probability?: number;
  group_by?: 'day' | 'week' | 'month';
  date_type?: 'created' | 'updated' | 'closed';
}

export interface CRMAnalyticsKPIs {
  open_pipeline_value: string; // Decimal as string
  weighted_pipeline: string; // Decimal as string
  new_leads: number;
  sqls: number;
  deals_won: number;
  win_rate_pct: number;
  revenue_won: string; // Decimal as string
  avg_deal_size: string; // Decimal as string
  velocity_days: number;
  lead_to_sql_pct: number;
  sql_to_win_pct: number;
  activities_completed: number;
  overdue_tasks: number;
}

export interface CRMAnalyticsForecastPoint {
  week: string; // YYYY-MM-DD
  weighted: string; // Decimal as string
  won: string; // Decimal as string
}

export interface CRMAnalyticsOverviewResponse {
  kpis: CRMAnalyticsKPIs;
  series: {
    forecast_weighted: CRMAnalyticsForecastPoint[];
    pipeline_by_stage: CRMAnalyticsPipelineStage[];
  };
  isLoading?: boolean;
}

export interface CRMAnalyticsPipelineStage {
  stage: string;
  count: number;
  value: string; // Decimal as string
  median_age_days: number;
}

export interface CRMAnalyticsPipelineResponse {
  stages: CRMAnalyticsPipelineStage[];
  isLoading?: boolean;
}

export interface CRMAnalyticsConversionStep {
  name: string;
  count: number;
}

export interface CRMAnalyticsConversionResponse {
  stages: CRMAnalyticsConversionStep[];
  isLoading?: boolean;
}

export interface CRMAnalyticsSource {
  source: string;
  leads: number;
  deals: number;
  won: number;
  conversion_rate: number;
  revenue: number;
}

export interface CRMAnalyticsSourcesResponse {
  sources: CRMAnalyticsSource[];
  isLoading?: boolean;
}

export interface CRMAnalyticsActivityPoint {
  period: string;
  call: number;
  email: number;
  meeting: number;
  demo: number;
  proposal: number;
  other: number;
}

export interface CRMAnalyticsActivitiesResponse {
  buckets: CRMAnalyticsActivityPoint[];
  isLoading?: boolean;
}

export interface CRMAnalyticsDealAgingCell {
  stage: string;
  age_bucket: string;
  count: number;
  value: number;
}

export interface CRMAnalyticsDealAgingResponse {
  matrix: CRMAnalyticsDealAgingCell[];
  isLoading?: boolean;
}

export interface CRMAnalyticsRep {
  owner: string;
  won_revenue: number;
  pipeline_value: number;
  deals_count: number;
  avg_deal_size: number;
  velocity: number;
}

export interface CRMAnalyticsRepsResponse {
  reps: CRMAnalyticsRep[];
  isLoading?: boolean;
}

export interface CRMAnalyticsStalledDeal {
  id: string;
  name: string;
  stage: string;
  value: number;
  days_no_activity: number;
  owner: string;
  last_activity: string;
}

export interface CRMAnalyticsStalledResponse {
  deals: CRMAnalyticsStalledDeal[];
  isLoading?: boolean;
}

// CRM Rep Performance (new endpoint)
export interface CRMRepPerformanceParams {
  company_id: string;
  start: string; // ISO8601 datetime
  end: string; // ISO8601 datetime
  owners?: string; // CSV
  min_value?: number;
  max_value?: number;
  tz?: string; // IANA timezone
}

export interface CRMRepPerformanceMeta {
  company_id: string;
  range: { start: string; end: string; timezone: string };
  filters: { owners: string[]; min_value: number | null; max_value: number | null };
  generated_at: string;
}

export interface CRMRepPerformanceLeaderboardRow {
  owner: string;
  won_deals: number;
  lost_deals: number;
  total_closed: number;
  win_rate_pct: number;
  won_revenue: string; // decimal string
  avg_sales_cycle_days: number;
  activities: number;
  completed_tasks: number;
  notes_created: number;
  missing_lead_count: number;
}

export interface CRMRepPerformanceWonLost {
  owner: string;
  won: number;
  lost: number;
}
export interface CRMRepPerformanceRevenue {
  owner: string;
  revenue: string;
}
export interface CRMRepPerformanceActivityPoint {
  date: string; // YYYY-MM-DD
  owner: string;
  activities: number;
  completed_tasks: number;
  notes_created: number;
}

export interface CRMRepPerformanceResponse {
  meta: CRMRepPerformanceMeta;
  owners: string[];
  leaderboard: CRMRepPerformanceLeaderboardRow[];
  charts: {
    won_lost_by_owner: CRMRepPerformanceWonLost[];
    revenue_by_owner: CRMRepPerformanceRevenue[];
    activity_timeseries: CRMRepPerformanceActivityPoint[];
  };
  isLoading?: boolean;
}

export interface CompanyProfile {
  company_name: string;
  industry: string;
  business_type: string;
  estimated_size: string;
  estimated_annual_revenue: string;
  location_hint: string;
  business_model: string;
  customer_base_description: string;
  vendor_base_description: string;
  product_service_description: string[];
  seasonality_notes: string;
  confidence_score: number;
  updated_at: string;
}

export interface VendorBreakdown {
  vendor_name: string;
  total_spend: number;
  percentage: number;
  bill_count: number;
}

export interface VendorRecommendation {
  vendor_name: string;
  reason: string;
  action: string;
}

export interface FinancialImpact {
  potential_savings_description: string;
  cost_benefit_points: string[];
  timeline: string;
}

export interface LLMInsights {
  summary: string;
  risk_points: string[];
  root_causes: string[];
  recommendations: VendorRecommendation[];
  financial_impact: FinancialImpact;
  industry_benchmarks: string[];
  immediate_actions: string[];
  urgency_reason: string;
}

export interface SupplierRiskAnalysis {
  urgency: 'URGENT' | 'WARNING' | 'INFO';
  has_data?: boolean;
  total_spend: number;
  days_analyzed: number;
  vendor_count: number;
  top_vendor_percentage: number;
  vendor_breakdown: VendorBreakdown[];
  llm_insights?: LLMInsights;
  company_context: {
    industry: string;
    business_type: string;
    size: string;
  };
}

export interface SlowMovingItem {
  item_name: string;
  sku: string;
  quantity_on_hand: number;
  cost_price: number;
  unit_price: number;
  sales_velocity: number;
  days_on_hand: number;
  capital_tied: number;
  units_sold_in_period: number;
}

export interface OverstockFinancialImpact {
  potential_savings: string;
  cost_benefit_points: string[];
  timeline: string;
}

export interface OverstockLLMInsights {
  summary: string;
  root_causes: string[];
  recommendations: string[];
  financial_impact: OverstockFinancialImpact;
  immediate_actions: string[];
  urgency_reason: string;
}

export interface OverstockAnalysis {
  urgency: 'URGENT' | 'WARNING' | 'INFO';
  total_items_analyzed: number;
  slow_moving_count: number;
  total_capital_tied: number;
  analysis_days: number;
  slow_moving_items: SlowMovingItem[];
  llm_insights: OverstockLLMInsights;
  generated_at: string;
  updated_at: string;
}

export interface SalesDayPattern {
  day: string;
  day_num: number;
  median_units: number;
  mean_units: number;
  std_dev: number;
  cv: number;
  sample_count: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface ForecastItemBreakdown {
  item_name: string;
  quantity: number;
  current_stock: number;
  stock_needed: number;
  item_type: 'Inventory' | 'Service' | 'NonInventory';
  growth_vs_last_week: number | null;
  growth_vs_last_month: number | null;
  growth_vs_all_time: number | null;
  confidence: string;
}

export interface ForecastDay {
  date: string;
  day: string;
  expected_units: number;
  lower_bound: number;
  upper_bound: number;
  stock_recommendation: number;
  confidence_pct: number;
  buffer_pct: number;
  method?: string;
  item_breakdown?: ForecastItemBreakdown[];
  inventory_items?: ForecastItemBreakdown[];
  service_items?: ForecastItemBreakdown[];
}

export interface DailyBreakdownPoint {
  date: string;
  units: number;
  revenue: number;
}

export interface SalesTrendsAnalysis {
  status: 'SUCCESS' | 'NO_DATA' | 'INSUFFICIENT_DATA';
  urgency: 'URGENT' | 'WARNING' | 'INFO';
  meta?: {
    view_period_days: number;
    total_days_available: number;
    forecast_method: string;
  };
  metrics?: {
    baseline_units: number;
    baseline_revenue: number;
    total_revenue: number;
    growth_percentage: number;
    peak_day: string;
    trend_r_squared: number;
    confidence_pct: number;
  };
  patterns?: {
    sales_by_day: SalesDayPattern[];
    next_week_forecast: ForecastDay[];
    stockout_risks: any[];
    revenue_gaps: any[];
    pattern_changes: any[];
    forecast_metadata: object;
  };
  daily_breakdown?: DailyBreakdownPoint[];
  llm_insights?: {
    summary: string;
    week_outlook: string[];
    inventory_watch: string[];
    quick_tip: string;
    confidence_note: string;
  };
  data_quality: object;
  message?: string;
  generated_at: string;
  updated_at: string;
}

export interface SpendingPatternInsight {
  urgency: 'URGENT' | 'WARNING' | 'INFO';
  anomalies_detected: number;
  spending_spikes: Array<{
    date: string;
    amount: number;
    percentage_above_avg: number;
  }>;
}

export interface ForecastInsight {
  urgency: 'URGENT' | 'WARNING' | 'INFO';
  upcoming_events: Array<{
    event_type: string;
    date: string;
    demand_impact: number;
  }>;
  recommended_actions: string[];
}

export interface CashFlowInsight {
  urgency: 'URGENT' | 'WARNING' | 'INFO';
  current_runway_days: number;
  burn_rate: number;
  upcoming_obligations: Array<{
    description: string;
    amount: number;
    due_date: string;
  }>;
}

// Weather Forecast Types
export interface WeatherLocation {
  city: string;
  state?: string;
  country: string;
  pos: {
    lat: number;
    long: number;
  };
}

export interface HourlyRecommendations {
  inventory: string[];
  staffing: string[];
  sales_opportunities: string[];
  risk_mitigation: string[];
}

export interface HourlyBlock {
  time_block: string;
  hours: string;
  weather_condition: string;
  weather_summary: string;
  temp_max: number;
  temp_min: number;
  operational_impact: 'low' | 'medium' | 'high';
  recommendations: HourlyRecommendations;
}

export interface CriticalAlert {
  date: string;
  time_block: string;
  alert_type: string;
  urgency: 'URGENT' | 'WARNING' | 'INFO';
  impact: string;
}

export interface WeatherInfo {
  temp_high: number;
  temp_low: number;
  dominant_condition: string;
  max_precip_prob: number;
  business_impact: string;
}

export interface DailyInsight {
  date: string;
  day_of_week: string;
  day_summary: string;
  weather_info: WeatherInfo;
  hourly_blocks: HourlyBlock[];
  daily_priorities: string[];
  critical_alerts: CriticalAlert[];
}

export interface ConfidenceScore {
  overall_score: number;
  level: 'high' | 'medium' | 'low';
  data_quality_score: number;
  insights_quality_score: number;
  model_confidence_score: number;
  reasoning: string;
  limitations: string[];
  reliability_notes: string;
  user_description?: string;
}

export interface ActionPriority {
  level: 'critical' | 'high' | 'medium' | 'low';
  requires_immediate_action: boolean;
  high_impact_periods: number;
  days_until_critical: number | null;
  critical_periods: Array<{
    day: number;
    date: string;
    impact: string;
  }>;
}

export interface WeekPriority {
  title: string;
  text: string;
}

export interface WeatherInsight {
  action_priority: ActionPriority;
  confidence: ConfidenceScore;
  forecast_data: any;
  forecast_generated_at: string;
  forecast_days: number;
  forecast_start_date: string | null;
  forecast_end_date: string | null;
  location: WeatherLocation;
  insights: {
    overview: string;
    critical_alerts: CriticalAlert[];
    daily_insights: DailyInsight[];
    week_priorities: WeekPriority[];
  };
  generated_at: string;
  updated_at: string;
}

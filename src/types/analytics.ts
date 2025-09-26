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
  alert_counts: {
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
  open_pipeline_value: number;
  weighted_pipeline: number;
  new_leads: number;
  sqls: number;
  deals_won: number;
  win_rate_pct: number;
  revenue_won: number;
  avg_deal_size: number;
  velocity_days: number;
  lead_to_sql_pct: number;
  sql_to_win_pct: number;
  activities_completed: number;
  overdue_tasks: number;
  // Prior period deltas
  open_pipeline_value_delta?: number;
  weighted_pipeline_delta?: number;
  new_leads_delta?: number;
  sqls_delta?: number;
  deals_won_delta?: number;
  win_rate_pct_delta?: number;
  revenue_won_delta?: number;
  avg_deal_size_delta?: number;
  velocity_days_delta?: number;
  lead_to_sql_pct_delta?: number;
  sql_to_win_pct_delta?: number;
  activities_completed_delta?: number;
  overdue_tasks_delta?: number;
}

export interface CRMAnalyticsForecastPoint {
  week: string;
  weighted: number;
  won: number;
}

export interface CRMAnalyticsOverviewResponse {
  kpis: CRMAnalyticsKPIs;
  series: {
    forecast_weighted: CRMAnalyticsForecastPoint[];
    pipeline_by_stage: CRMAnalyticsPipelineStage[];
  };
}

export interface CRMAnalyticsPipelineStage {
  stage: string;
  count: number;
  value: number;
  median_age_days: number;
}

export interface CRMAnalyticsPipelineResponse {
  stages: CRMAnalyticsPipelineStage[];
}

export interface CRMAnalyticsConversionStep {
  name: string;
  count: number;
}

export interface CRMAnalyticsConversionResponse {
  stages: CRMAnalyticsConversionStep[];
}

export interface CRMAnalyticsSource {
  source: string;
  leads: number;
  deals: number;
  won: number;
  revenue: number;
}

export interface CRMAnalyticsSourcesResponse {
  sources: CRMAnalyticsSource[];
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
}

export interface CRMAnalyticsDealAgingCell {
  stage: string;
  age_bucket: string;
  count: number;
  value: number;
}

export interface CRMAnalyticsDealAgingResponse {
  matrix: CRMAnalyticsDealAgingCell[];
}

export interface CRMAnalyticsRep {
  owner: string;
  won_revenue: number;
  win_rate_pct: number;
  velocity_days: number;
  activities: number;
}

export interface CRMAnalyticsRepsResponse {
  reps: CRMAnalyticsRep[];
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
}

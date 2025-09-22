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

export interface AnalyticsParams {
  from_date?: string; // Backend expects 'from' parameter
  to_date?: string; // Backend expects 'to' parameter
  provider?: string; // Backend expects 'provider' parameter
  location_id?: string; // Backend expects 'location_id' parameter
}

export type BillTreatment = 'operating_expense' | 'inventory' | 'fixed_asset' | 'prepaid' | 'deposit' | 'liability' | 'transfer';
export interface BillLine {
  description: string;
  category: string;
  treatment: BillTreatment;
  amount: string;
}
export interface BillPayment {
  id: string;
  kind: 'external' | 'stripe' | 'credit';
  amount: string;
  status: string;
  paid_date: string | null;
  returned_date: string | null;
  scheduled_date: string | null;
  reference: string;
  actor_email: string;
}
export interface VendorBill {
  id: string;
  vendor_id: number;
  vendor_name: string;
  invoice_number: string;
  bill_date: string;
  due_date: string;
  currency: string;
  amount: string;
  credited: string;
  paid: string;
  reserved: string;
  remaining: string;
  status: string;
  overdue: boolean;
  lines: BillLine[];
  memo: string;
  payments?: BillPayment[];
  documents?: { id: string; filename: string; content_type: string }[];
  audit?: { action: string; actor_email: string; created_at: string; detail: Record<string, unknown> }[];
}
export interface VendorBillInput {
  vendor_id: number;
  invoice_number: string;
  bill_date: string;
  due_date: string;
  lines: BillLine[];
  memo: string;
}
export interface BillPayState {
  payments_enabled: boolean;
  funding_source: string;
  currency: string;
  available_balance: string | null;
  fee: string | null;
  estimated_arrival: string | null;
  reason: string;
}

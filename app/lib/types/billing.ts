/**
 * Billing types and interfaces
 * Usage tracking, invoices, and invoice items
 */

export type UsageType = 'package' | 'self_service'
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled'
export type BillingType = 'self_service' | 'admin'

export interface UsageTracking {
  id: string
  user_id: string
  batch_id?: string
  agent_id?: string
  usage_type: UsageType
  package_id?: string
  model: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  api_cost: number
  billing_amount: number
  covered_by_credits: boolean
  created_at: string
}

export interface Invoice {
  id: string
  user_id: string
  invoice_number: string
  billing_type: BillingType
  period_start: string
  period_end: string
  subtotal: number
  tax: number
  total: number
  status: InvoiceStatus
  stripe_invoice_id?: string
  stripe_payment_intent_id?: string
  due_date?: string
  paid_at?: string
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  total: number
  usage_tracking_ids: string[]
  created_at: string
}

export interface InvoiceCreate {
  billing_type: BillingType
  period_start: string
  period_end: string
  subtotal: number
  tax?: number
  total: number
  due_date?: string
}

export interface UsageSummary {
  period_start: string
  period_end: string
  total_tokens: number
  total_api_cost: number
  total_billing_amount: number
  usage_by_agent: Record<string, {
    tokens: number
    api_cost: number
    billing_amount: number
  }>
  usage_by_model: Record<string, {
    tokens: number
    api_cost: number
    billing_amount: number
  }>
}

export interface CreditInfo {
  included_credits: number
  used_credits: number
  rolled_over_credits: number
  remaining_credits: number
  overage_amount: number
}


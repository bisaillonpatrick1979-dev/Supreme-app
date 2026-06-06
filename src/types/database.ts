// Auto-generated types from Supabase schema
// Run: supabase gen types typescript --local > src/types/database.ts

export type UserRole = 'admin' | 'employee' | 'subcontractor'
export type EmployeeType = 'salaried' | 'hourly'
export type ProjectStatus = 'lead' | 'quoted' | 'contracted' | 'in_progress' | 'completed' | 'cancelled'
export type InvoiceStatus = 'draft' | 'pending' | 'approved' | 'paid' | 'overdue' | 'cancelled'
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked'
export type PunchType = 'in' | 'out' | 'break_start' | 'break_end'
export type PaymentMethod = 'stripe' | 'cash' | 'cheque' | 'e_transfer' | 'financing'
export type ClientType = 'residential' | 'commercial' | 'industrial'
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'lost' | 'converted'
export type MaterialCategory = 'siding' | 'roofing' | 'insulation' | 'trim' | 'fasteners' | 'other'

export interface User {
  id: string
  email: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  user_id: string | null
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  employee_type: EmployeeType
  pin_hash: string | null
  hourly_rate: number | null
  salary_annual: number | null
  sin_encrypted: string | null
  address: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  hire_date: string
  termination_date: string | null
  avatar_url: string | null
  is_active: boolean
  vacation_days_per_year: number
  vacation_days_used: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Subcontractor {
  id: string
  user_id: string | null
  company_name: string
  contact_name: string
  email: string | null
  phone: string | null
  specialty: string[]
  neq_number: string | null
  insurance_expiry: string | null
  rbq_number: string | null
  rate_type: string
  default_rate: number | null
  address: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  gst_number: string | null
  qst_number: string | null
  payment_terms: number
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  client_type: ClientType
  company_name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  phone_alt: string | null
  address: string
  city: string
  province: string | null
  postal_code: string | null
  lat: number | null
  lng: number | null
  notes: string | null
  lead_status: LeadStatus | null
  lead_source: string | null
  preferred_contact: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CatalogItem {
  id: string
  name: string
  description: string | null
  category: MaterialCategory
  sku: string | null
  unit: string
  price_supplier: number | null
  price_client: number
  price_subcontractor: number | null
  brand: string | null
  color: string | null
  thickness: string | null
  warranty_years: number | null
  is_active: boolean
  image_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  client_id: string
  project_number: string
  name: string
  description: string | null
  status: ProjectStatus
  type: string[]
  address: string
  city: string
  province: string | null
  postal_code: string | null
  lat: number | null
  lng: number | null
  start_date: string | null
  end_date: string | null
  estimated_value: number | null
  contract_value: number | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined fields
  client?: Client
  tasks?: ProjectTask[]
  employees?: Employee[]
  photos?: ProjectPhoto[]
}

export interface ProjectTask {
  id: string
  project_id: string
  title: string
  description: string | null
  status: TaskStatus
  order_index: number
  assigned_to: string | null
  due_date: string | null
  completed_at: string | null
  completed_by: string | null
  is_blocking: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ProjectPhoto {
  id: string
  project_id: string
  gcs_path: string
  gcs_url: string
  caption: string | null
  photo_type: string
  taken_by: string | null
  taken_at: string
  created_at: string
}

export interface Quote {
  id: string
  project_id: string
  client_id: string
  quote_number: string
  status: QuoteStatus
  issue_date: string
  expiry_date: string | null
  subtotal: number
  tax_gst: number
  tax_qst: number
  total: number
  notes: string | null
  terms: string | null
  created_by: string | null
  sent_at: string | null
  accepted_at: string | null
  created_at: string
  updated_at: string
  line_items?: QuoteLineItem[]
  project?: Project
  client?: Client
}

export interface QuoteLineItem {
  id: string
  quote_id: string
  catalog_item_id: string | null
  description: string
  quantity: number
  unit: string
  unit_price: number
  total: number
  order_index: number
  created_at: string
}

export interface Invoice {
  id: string
  project_id: string
  client_id: string
  invoice_number: string
  status: InvoiceStatus
  issue_date: string
  due_date: string | null
  subtotal: number
  tax_gst: number
  tax_qst: number
  total: number
  paid_amount: number
  payment_method: PaymentMethod | null
  stripe_payment_link: string | null
  stripe_payment_intent: string | null
  notes: string | null
  pdf_url: string | null
  created_by: string | null
  paid_at: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
  line_items?: InvoiceLineItem[]
  project?: Project
  client?: Client
}

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  catalog_item_id: string | null
  description: string
  quantity: number
  unit: string
  unit_price: number
  total: number
  order_index: number
  created_at: string
}

export interface PunchRecord {
  id: string
  employee_id: string
  project_id: string | null
  punch_type: PunchType
  punched_at: string
  lat: number | null
  lng: number | null
  accuracy: number | null
  address: string | null
  is_manual: boolean
  manual_reason: string | null
  approved_by: string | null
  notes: string | null
  created_at: string
}

export interface WorkSession {
  id: string
  employee_id: string
  project_id: string | null
  punch_in_id: string
  punch_out_id: string | null
  date: string
  hours_regular: number
  hours_overtime: number
  hours_total: number
  gross_pay: number
  is_approved: boolean
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface InventoryItem {
  id: string
  catalog_item_id: string | null
  name: string
  sku: string | null
  category: MaterialCategory | null
  quantity_on_hand: number
  quantity_reserved: number
  quantity_available: number
  unit: string
  reorder_point: number | null
  storage_location: string | null
  last_counted_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  type: string
  is_read: boolean
  action_url: string | null
  created_at: string
}

export interface STInvoice {
  id: string
  project_id: string
  subcontractor_id: string
  invoice_number: string
  status: InvoiceStatus
  amount: number
  issue_date: string
  due_date: string | null
  approved_by: string | null
  approved_at: string | null
  paid_at: string | null
  pdf_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
  subcontractor?: Subcontractor
  project?: Project
}

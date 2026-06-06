-- ========================================
-- HailiteManager - Initial Database Schema
-- Supabase PostgreSQL
-- ========================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('admin', 'employee', 'subcontractor');
CREATE TYPE employee_type AS ENUM ('salaried', 'hourly');
CREATE TYPE project_status AS ENUM ('lead', 'quoted', 'contracted', 'in_progress', 'completed', 'cancelled');
CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'approved', 'paid', 'overdue', 'cancelled');
CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked');
CREATE TYPE punch_type AS ENUM ('in', 'out', 'break_start', 'break_end');
CREATE TYPE payment_method AS ENUM ('stripe', 'cash', 'cheque', 'e_transfer', 'financing');
CREATE TYPE client_type AS ENUM ('residential', 'commercial', 'industrial');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'lost', 'converted');
CREATE TYPE material_category AS ENUM ('siding', 'roofing', 'insulation', 'trim', 'fasteners', 'other');

-- ─── USERS ───────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  role user_role NOT NULL DEFAULT 'employee',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── EMPLOYEES ───────────────────────────────────────────────────────────────

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  employee_type employee_type NOT NULL DEFAULT 'hourly',
  pin_hash TEXT,
  hourly_rate DECIMAL(10,2),
  salary_annual DECIMAL(12,2),
  sin_encrypted TEXT,
  address TEXT,
  city TEXT,
  province TEXT DEFAULT 'QC',
  postal_code TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  termination_date DATE,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  vacation_days_per_year INTEGER DEFAULT 10,
  vacation_days_used DECIMAL(4,1) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SUBCONTRACTORS ──────────────────────────────────────────────────────────

CREATE TABLE subcontractors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  specialty TEXT[],
  neq_number TEXT,
  insurance_expiry DATE,
  rbq_number TEXT,
  rate_type TEXT DEFAULT 'project',
  default_rate DECIMAL(10,2),
  address TEXT,
  city TEXT,
  province TEXT DEFAULT 'QC',
  postal_code TEXT,
  gst_number TEXT,
  qst_number TEXT,
  payment_terms INTEGER DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CLIENTS ─────────────────────────────────────────────────────────────────

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_type client_type NOT NULL DEFAULT 'residential',
  company_name TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  phone_alt TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT DEFAULT 'QC',
  postal_code TEXT,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  notes TEXT,
  lead_status lead_status DEFAULT 'new',
  lead_source TEXT,
  preferred_contact TEXT DEFAULT 'phone',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CATALOG ─────────────────────────────────────────────────────────────────

CREATE TABLE catalog_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category material_category NOT NULL,
  sku TEXT UNIQUE,
  unit TEXT NOT NULL DEFAULT 'sqft',
  price_supplier DECIMAL(10,2),
  price_client DECIMAL(10,2) NOT NULL,
  price_subcontractor DECIMAL(10,2),
  brand TEXT,
  color TEXT,
  thickness TEXT,
  warranty_years INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PROJECTS / CHANTIERS ────────────────────────────────────────────────────

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  project_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status project_status NOT NULL DEFAULT 'lead',
  type TEXT[],
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT DEFAULT 'QC',
  postal_code TEXT,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  start_date DATE,
  end_date DATE,
  estimated_value DECIMAL(12,2),
  contract_value DECIMAL(12,2),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Project sequence for project numbers
CREATE SEQUENCE project_number_seq START 1000;

-- ─── PROJECT TASKS ───────────────────────────────────────────────────────────

CREATE TABLE project_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'pending',
  order_index INTEGER NOT NULL DEFAULT 0,
  assigned_to UUID REFERENCES employees(id),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  is_blocking BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PROJECT TEAM ─────────────────────────────────────────────────────────────

CREATE TABLE project_employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, employee_id)
);

CREATE TABLE project_subcontractors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  scope TEXT,
  agreed_amount DECIMAL(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, subcontractor_id)
);

-- ─── PROJECT PHOTOS ───────────────────────────────────────────────────────────

CREATE TABLE project_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  gcs_path TEXT NOT NULL,
  gcs_url TEXT NOT NULL,
  caption TEXT,
  photo_type TEXT DEFAULT 'progress',
  taken_by UUID REFERENCES users(id),
  taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── QUOTES ──────────────────────────────────────────────────────────────────

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  quote_number TEXT UNIQUE NOT NULL,
  status quote_status NOT NULL DEFAULT 'draft',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_gst DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_qst DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  terms TEXT,
  created_by UUID REFERENCES users(id),
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE quote_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  catalog_item_id UUID REFERENCES catalog_items(id),
  description TEXT NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  unit TEXT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CONTRACTS ───────────────────────────────────────────────────────────────

CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID REFERENCES quotes(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  contract_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  signed_at TIMESTAMPTZ,
  client_signature_url TEXT,
  admin_signature_url TEXT,
  terms TEXT,
  pdf_url TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INVOICES ────────────────────────────────────────────────────────────────

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  invoice_number TEXT UNIQUE NOT NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_gst DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_qst DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method payment_method,
  stripe_payment_link TEXT,
  stripe_payment_intent TEXT,
  notes TEXT,
  pdf_url TEXT,
  created_by UUID REFERENCES users(id),
  paid_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  catalog_item_id UUID REFERENCES catalog_items(id),
  description TEXT NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  unit TEXT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SUBCONTRACTOR INVOICES ───────────────────────────────────────────────────

CREATE TABLE st_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL,
  status invoice_status NOT NULL DEFAULT 'pending',
  amount DECIMAL(12,2) NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PUNCH CLOCK ─────────────────────────────────────────────────────────────

CREATE TABLE punch_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  punch_type punch_type NOT NULL,
  punched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  accuracy DECIMAL(8,2),
  address TEXT,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  manual_reason TEXT,
  approved_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── WORK SESSIONS (computed from punch pairs) ───────────────────────────────

CREATE TABLE work_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  punch_in_id UUID NOT NULL REFERENCES punch_records(id),
  punch_out_id UUID REFERENCES punch_records(id),
  date DATE NOT NULL,
  hours_regular DECIMAL(5,2) NOT NULL DEFAULT 0,
  hours_overtime DECIMAL(5,2) NOT NULL DEFAULT 0,
  hours_total DECIMAL(5,2) NOT NULL DEFAULT 0,
  gross_pay DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PAYROLL PERIODS ─────────────────────────────────────────────────────────

CREATE TABLE payroll_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  is_processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payroll_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  hours_regular DECIMAL(6,2) NOT NULL DEFAULT 0,
  hours_overtime DECIMAL(6,2) NOT NULL DEFAULT 0,
  gross_pay DECIMAL(10,2) NOT NULL DEFAULT 0,
  deduction_federal_tax DECIMAL(10,2) DEFAULT 0,
  deduction_provincial_tax DECIMAL(10,2) DEFAULT 0,
  deduction_ei DECIMAL(10,2) DEFAULT 0,
  deduction_rrsp DECIMAL(10,2) DEFAULT 0,
  deduction_other DECIMAL(10,2) DEFAULT 0,
  net_pay DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INVENTORY ───────────────────────────────────────────────────────────────

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  catalog_item_id UUID REFERENCES catalog_items(id),
  name TEXT NOT NULL,
  sku TEXT,
  category material_category,
  quantity_on_hand DECIMAL(10,3) NOT NULL DEFAULT 0,
  quantity_reserved DECIMAL(10,3) NOT NULL DEFAULT 0,
  quantity_available DECIMAL(10,3) GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  unit TEXT NOT NULL DEFAULT 'sqft',
  reorder_point DECIMAL(10,3) DEFAULT 0,
  storage_location TEXT,
  last_counted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── FUNCTIONS & TRIGGERS ────────────────────────────────────────────────────

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_subcontractors_updated_at BEFORE UPDATE ON subcontractors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_project_tasks_updated_at BEFORE UPDATE ON project_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_catalog_items_updated_at BEFORE UPDATE ON catalog_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_work_sessions_updated_at BEFORE UPDATE ON work_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate project number
CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_number IS NULL OR NEW.project_number = '' THEN
    NEW.project_number = 'PRJ-' || LPAD(nextval('project_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_number BEFORE INSERT ON projects FOR EACH ROW EXECUTE FUNCTION generate_project_number();

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE st_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE punch_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY admin_all ON users FOR ALL USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

-- Employees can read their own data
CREATE POLICY employee_read_own ON employees FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

-- Employees can read their own punch records
CREATE POLICY employee_punch_own ON punch_records FOR SELECT USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

-- Notifications: users see their own
CREATE POLICY notification_own ON notifications FOR ALL USING (user_id = auth.uid());

-- ─── INDEXES ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_is_active ON employees(is_active);
CREATE INDEX idx_punch_records_employee_id ON punch_records(employee_id);
CREATE INDEX idx_punch_records_punched_at ON punch_records(punched_at DESC);
CREATE INDEX idx_work_sessions_employee_date ON work_sessions(employee_id, date DESC);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_quotes_project_id ON quotes(project_id);
CREATE INDEX idx_clients_lead_status ON clients(lead_status);
CREATE INDEX idx_notifications_user_id_read ON notifications(user_id, is_read);

-- ─── SEED DATA ────────────────────────────────────────────────────────────────

-- Default admin user (update in Supabase Auth dashboard)
INSERT INTO users (id, email, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@hailite.com', 'admin');

-- Default catalog items
INSERT INTO catalog_items (name, description, category, unit, price_supplier, price_client, price_subcontractor, brand) VALUES
  ('Vinyl Siding - Standard', 'Residential vinyl siding 0.042" thickness', 'siding', 'sqft', 2.50, 6.50, 4.50, 'CertainTeed'),
  ('Vinyl Siding - Premium', 'Premium vinyl siding 0.046" thickness', 'siding', 'sqft', 3.25, 8.50, 5.75, 'James Hardie'),
  ('Vinyl Siding - Luxury', 'Luxury insulated vinyl siding', 'siding', 'sqft', 4.75, 11.00, 7.50, 'Kaycan'),
  ('Asphalt Shingles - 30yr', '30-year architectural shingles', 'roofing', 'sqft', 1.85, 5.50, 3.75, 'GAF'),
  ('Asphalt Shingles - 50yr', '50-year premium architectural shingles', 'roofing', 'sqft', 2.75, 7.50, 5.25, 'Owens Corning'),
  ('Metal Roofing - Standing Seam', 'Standing seam metal roofing system', 'roofing', 'sqft', 6.50, 16.00, 11.00, 'Metal Sales'),
  ('Ice & Water Shield', 'Underlayment for critical areas', 'roofing', 'sqft', 0.65, 2.00, 1.25, 'Grace'),
  ('House Wrap', 'Breather membrane / house wrap', 'insulation', 'sqft', 0.35, 1.25, 0.75, 'Tyvek'),
  ('Rigid Insulation 2"', '2" EPS rigid insulation board', 'insulation', 'sqft', 0.95, 2.75, 1.85, 'Nudura'),
  ('J-Channel', 'Vinyl J-channel trim', 'trim', 'lft', 0.85, 2.50, 1.65, 'Generic');

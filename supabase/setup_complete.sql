-- ============================================================
-- HailiteManager — SETUP COMPLET (une seule exécution)
-- Copiez TOUT ce fichier dans Supabase SQL Editor → Run
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'employee', 'subcontractor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE employee_type AS ENUM ('salaried', 'hourly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('lead', 'quoted', 'contracted', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'approved', 'paid', 'overdue', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE punch_type AS ENUM ('in', 'out', 'break_start', 'break_end');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('stripe', 'cash', 'cheque', 'e_transfer', 'financing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE client_type AS ENUM ('residential', 'commercial', 'industrial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'lost', 'converted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE material_category AS ENUM ('siding', 'roofing', 'insulation', 'trim', 'fasteners', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── TABLES ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  role user_role NOT NULL DEFAULT 'employee',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
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

CREATE TABLE IF NOT EXISTS subcontractors (
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

CREATE TABLE IF NOT EXISTS clients (
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

CREATE TABLE IF NOT EXISTS catalog_items (
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

CREATE SEQUENCE IF NOT EXISTS project_number_seq START 1000;

CREATE TABLE IF NOT EXISTS projects (
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

CREATE TABLE IF NOT EXISTS project_tasks (
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

CREATE TABLE IF NOT EXISTS project_employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, employee_id)
);

CREATE TABLE IF NOT EXISTS project_subcontractors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  scope TEXT,
  agreed_amount DECIMAL(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, subcontractor_id)
);

CREATE TABLE IF NOT EXISTS project_photos (
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

CREATE TABLE IF NOT EXISTS quotes (
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

CREATE TABLE IF NOT EXISTS quote_line_items (
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

CREATE TABLE IF NOT EXISTS invoices (
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

CREATE TABLE IF NOT EXISTS invoice_line_items (
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

CREATE TABLE IF NOT EXISTS st_invoices (
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

CREATE TABLE IF NOT EXISTS punch_records (
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

CREATE TABLE IF NOT EXISTS work_sessions (
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

CREATE TABLE IF NOT EXISTS inventory_items (
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

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── FUNCTIONS & TRIGGERS ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_number IS NULL OR NEW.project_number = '' THEN
    NEW.project_number = 'PRJ-' || LPAD(nextval('project_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_subcontractors_updated_at BEFORE UPDATE ON subcontractors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_project_tasks_updated_at BEFORE UPDATE ON project_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_catalog_items_updated_at BEFORE UPDATE ON catalog_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_work_sessions_updated_at BEFORE UPDATE ON work_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_projects_number BEFORE INSERT ON projects FOR EACH ROW EXECUTE FUNCTION generate_project_number();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Policies (DROP before CREATE to avoid conflicts)
DROP POLICY IF EXISTS admin_all ON users;
DROP POLICY IF EXISTS employee_read_own ON employees;
DROP POLICY IF EXISTS employee_punch_own ON punch_records;
DROP POLICY IF EXISTS notification_own ON notifications;
DROP POLICY IF EXISTS "Admins can manage settings" ON company_settings;

-- Admin full access to all tables
CREATE POLICY admin_users ON users FOR ALL USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY admin_employees ON employees FOR ALL USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY admin_clients ON clients FOR ALL USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY admin_projects ON projects FOR ALL USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY admin_project_tasks ON project_tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY admin_project_photos ON project_photos FOR ALL USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY admin_quotes ON quotes FOR ALL USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY admin_invoices ON invoices FOR ALL USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY admin_st_invoices ON st_invoices FOR ALL USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY admin_punch ON punch_records FOR ALL USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY admin_work_sessions ON work_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY admin_catalog ON catalog_items FOR ALL USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY admin_inventory ON inventory_items FOR ALL USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY admin_subcontractors ON subcontractors FOR ALL USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY admin_settings ON company_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

-- Employee policies
CREATE POLICY employee_read_own ON employees FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY employee_punch_read ON punch_records FOR SELECT USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY employee_sessions_read ON work_sessions FOR SELECT USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY notification_own ON notifications FOR ALL USING (user_id = auth.uid());

-- ─── INDEXES ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_punch_records_employee_id ON punch_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_punch_records_punched_at ON punch_records(punched_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_sessions_employee_date ON work_sessions(employee_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_quotes_project_id ON quotes(project_id);
CREATE INDEX IF NOT EXISTS idx_clients_lead_status ON clients(lead_status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON notifications(user_id, is_read);

-- ─── DONNÉES DE BASE ─────────────────────────────────────────────────────────

-- Utilisateur admin (votre compte Supabase Auth)
INSERT INTO users (id, email, role, is_active)
VALUES ('5fab3e5a-f2a4-46e1-8cc1-4ccf0627e577', 'hailiteexteriors@gmail.com', 'admin', true)
ON CONFLICT (id) DO UPDATE SET role = 'admin', is_active = true;

-- Paramètres entreprise
INSERT INTO company_settings (key, value) VALUES
  ('company_name', 'Hailite Xteriors Inc.'),
  ('company_address', ''),
  ('company_city', ''),
  ('company_province', 'QC'),
  ('company_postal', ''),
  ('company_phone', ''),
  ('company_email', 'hailiteexteriors@gmail.com'),
  ('company_gst_number', ''),
  ('company_qst_number', ''),
  ('company_rbq_number', ''),
  ('default_payment_terms', '30'),
  ('invoice_notes_default', 'Merci de votre confiance. Paiement dû dans les délais convenus.'),
  ('gst_rate', '0.05'),
  ('qst_rate', '0.09975')
ON CONFLICT (key) DO NOTHING;

-- Catalogue de matériaux de départ
INSERT INTO catalog_items (name, description, category, unit, price_supplier, price_client, price_subcontractor, brand) VALUES
  ('Vinyl Siding - Standard', 'Revêtement vinyl résidentiel 0.042"', 'siding', 'pi²', 2.50, 6.50, 4.50, 'CertainTeed'),
  ('Vinyl Siding - Premium', 'Revêtement vinyl premium 0.046"', 'siding', 'pi²', 3.25, 8.50, 5.75, 'James Hardie'),
  ('Vinyl Siding - Luxe', 'Revêtement vinyl isolé luxe', 'siding', 'pi²', 4.75, 11.00, 7.50, 'Kaycan'),
  ('Bardeaux asphalte 30 ans', 'Bardeaux architecturaux 30 ans', 'roofing', 'pi²', 1.85, 5.50, 3.75, 'GAF'),
  ('Bardeaux asphalte 50 ans', 'Bardeaux architecturaux premium 50 ans', 'roofing', 'pi²', 2.75, 7.50, 5.25, 'Owens Corning'),
  ('Tôle debout-sur-joint', 'Toiture métallique debout-sur-joint', 'roofing', 'pi²', 6.50, 16.00, 11.00, 'Metal Sales'),
  ('Membrane glace-eau', 'Sous-couche membrane critique', 'roofing', 'pi²', 0.65, 2.00, 1.25, 'Grace'),
  ('Pare-air Tyvek', 'Membrane respirante / pare-air', 'insulation', 'pi²', 0.35, 1.25, 0.75, 'Tyvek'),
  ('Isolant rigide 2"', 'Panneau EPS 2" isolant rigide', 'insulation', 'pi²', 0.95, 2.75, 1.85, 'Nudura'),
  ('Moulure J', 'Moulure J vinyle', 'trim', 'pi.l.', 0.85, 2.50, 1.65, 'Générique')
ON CONFLICT DO NOTHING;

-- ─── VÉRIFICATION ────────────────────────────────────────────────────────────

SELECT 'Setup terminé ✓' AS statut,
       (SELECT COUNT(*) FROM users) AS nb_users,
       (SELECT COUNT(*) FROM catalog_items) AS nb_catalogue,
       (SELECT COUNT(*) FROM company_settings) AS nb_settings;

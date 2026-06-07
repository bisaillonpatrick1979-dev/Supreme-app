-- Company settings table for admin-configurable values
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings"
  ON company_settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Seed defaults
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

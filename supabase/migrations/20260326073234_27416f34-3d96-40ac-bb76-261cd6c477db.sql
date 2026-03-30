
-- Feature 1: Add project_id to disturbances
ALTER TABLE public.disturbances ADD COLUMN project_id uuid;

-- Feature 2: Create project_invoices table for partial billing
CREATE TABLE public.project_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  hours numeric NOT NULL,
  reason text NOT NULL DEFAULT '',
  invoiced_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage project_invoices" ON public.project_invoices
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'administrator'))
  WITH CHECK (has_role(auth.uid(), 'administrator'));

CREATE POLICY "Authenticated can view project_invoices" ON public.project_invoices
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

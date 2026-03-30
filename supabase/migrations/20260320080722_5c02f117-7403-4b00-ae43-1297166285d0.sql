CREATE TABLE public.za_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  hours numeric NOT NULL,
  reason text NOT NULL,
  adjusted_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.za_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all za_adjustments"
ON public.za_adjustments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'administrator'));

CREATE POLICY "Admins can insert za_adjustments"
ON public.za_adjustments FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'administrator'));

CREATE POLICY "Admins can delete za_adjustments"
ON public.za_adjustments FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'administrator'));
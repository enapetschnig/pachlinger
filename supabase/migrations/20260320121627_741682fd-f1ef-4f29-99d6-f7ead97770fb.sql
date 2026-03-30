CREATE TABLE public.vacation_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  days numeric NOT NULL,
  reason text NOT NULL,
  adjusted_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vacation_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all vacation_adjustments"
  ON public.vacation_adjustments FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'administrator'));

CREATE POLICY "Admins can insert vacation_adjustments"
  ON public.vacation_adjustments FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'administrator'));

CREATE POLICY "Admins can delete vacation_adjustments"
  ON public.vacation_adjustments FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'administrator'));

CREATE POLICY "Users can view own za_adjustments"
ON public.za_adjustments FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own vacation_adjustments"
ON public.vacation_adjustments FOR SELECT TO authenticated
USING (auth.uid() = user_id);

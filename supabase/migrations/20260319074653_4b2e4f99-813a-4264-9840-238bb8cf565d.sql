CREATE POLICY "Admins can update all time entries"
ON public.time_entries
FOR UPDATE
TO public
USING (public.has_role(auth.uid(), 'administrator'))
WITH CHECK (public.has_role(auth.uid(), 'administrator'));
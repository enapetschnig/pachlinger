CREATE POLICY "Admins can delete all time entries"
ON public.time_entries
FOR DELETE
TO public
USING (has_role(auth.uid(), 'administrator'::app_role));
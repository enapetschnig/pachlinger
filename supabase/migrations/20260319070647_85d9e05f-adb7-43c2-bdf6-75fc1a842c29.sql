CREATE TABLE IF NOT EXISTS public.time_entry_disturbances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  disturbance_id UUID NOT NULL REFERENCES public.disturbances(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (time_entry_id, disturbance_id)
);

ALTER TABLE public.time_entry_disturbances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own time entry disturbance links"
ON public.time_entry_disturbances
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.time_entries
    WHERE time_entries.id = time_entry_disturbances.time_entry_id
      AND time_entries.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'administrator')
);

CREATE POLICY "Users can insert own time entry disturbance links"
ON public.time_entry_disturbances
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.time_entries
    WHERE time_entries.id = time_entry_disturbances.time_entry_id
      AND time_entries.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'administrator')
);

CREATE POLICY "Users can delete own time entry disturbance links"
ON public.time_entry_disturbances
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.time_entries
    WHERE time_entries.id = time_entry_disturbances.time_entry_id
      AND time_entries.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'administrator')
);
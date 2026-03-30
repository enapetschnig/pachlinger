
CREATE OR REPLACE FUNCTION public.create_sick_note_notification(p_title text, p_message text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message)
  SELECT ur.user_id, 'document', p_title, p_message
  FROM public.user_roles ur
  WHERE ur.role = 'administrator';
END;
$$;

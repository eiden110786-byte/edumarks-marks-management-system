
-- Add approval_status column to profiles
ALTER TABLE public.profiles ADD COLUMN approval_status text NOT NULL DEFAULT 'approved';

-- Create a function to check approval status (used by auth flow)
CREATE OR REPLACE FUNCTION public.get_approval_status(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT approval_status FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

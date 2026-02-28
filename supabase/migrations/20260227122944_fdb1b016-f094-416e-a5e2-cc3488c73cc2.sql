
-- Insert admin role for existing user
INSERT INTO public.user_roles (user_id, role)
VALUES ('b1813836-1261-48d8-997e-0cabce3d0e1e', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create a function to handle role assignment on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if a role was passed via raw_app_meta_data (set by admin signup flow)
  -- For the signup flow from ManageUsers, we use raw_user_meta_data
  IF NEW.raw_user_meta_data->>'requested_role' IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'requested_role')::app_role);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for role assignment
CREATE OR REPLACE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Also ensure the handle_new_user trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

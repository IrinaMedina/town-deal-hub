-- Remove the dangerous INSERT policy that allows users to assign themselves any role
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

-- Create a more restrictive comment explaining the security rationale
COMMENT ON TABLE public.user_roles IS 'User roles are assigned ONLY via the handle_new_user trigger during registration. Direct INSERT is not allowed to prevent privilege escalation.';
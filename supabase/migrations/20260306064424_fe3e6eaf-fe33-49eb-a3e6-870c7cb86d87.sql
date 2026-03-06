
-- Add status column to businesses for approval workflow
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Update the public-facing SELECT policy: only show approved businesses to the public
DROP POLICY IF EXISTS "Anyone can view businesses" ON public.businesses;
DROP POLICY IF EXISTS "Anyone can view approved businesses" ON public.businesses;
CREATE POLICY "Anyone can view approved businesses" ON public.businesses
  FOR SELECT
  USING (
    status = 'approved'
    OR auth.uid() = created_by
    OR public.has_role(auth.uid(), 'ADMIN'::app_role)
  );

-- Admin can update any business (for approval/rejection)
CREATE POLICY "Admins can update any business" ON public.businesses
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role));

-- Admin can delete any business
CREATE POLICY "Admins can delete any business" ON public.businesses
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role));

-- Admin can view all profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'ADMIN'::app_role));

-- Admin can view all user roles
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'ADMIN'::app_role));

-- Admin can view all messages for moderation
CREATE POLICY "Admins can view all messages" ON public.messages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role));

-- Grant anon SELECT so the public policy works for non-logged users
GRANT SELECT ON public.businesses TO anon;

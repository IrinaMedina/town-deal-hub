-- Create function to handle new user creation after email confirmation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name text;
  user_town text;
  user_role app_role;
BEGIN
  -- Get user metadata
  user_name := NEW.raw_user_meta_data->>'name';
  user_town := NEW.raw_user_meta_data->>'town';
  user_role := (NEW.raw_user_meta_data->>'role')::app_role;
  
  -- Only create profile if metadata exists (registration flow)
  IF user_name IS NOT NULL AND user_town IS NOT NULL THEN
    -- Create profile
    INSERT INTO public.profiles (user_id, name, town)
    VALUES (NEW.id, user_name, user_town)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  -- Create user role if provided
  IF user_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- If subscriber, create default subscription
    IF user_role = 'SUSCRIPTOR' AND user_town IS NOT NULL THEN
      INSERT INTO public.subscriptions (user_id, town, categories)
      VALUES (NEW.id, user_town, '{}')
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for new user creation
-- This runs when a user is first created (even before email confirmation)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add unique constraints if not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_key'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_key'
  ) THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;
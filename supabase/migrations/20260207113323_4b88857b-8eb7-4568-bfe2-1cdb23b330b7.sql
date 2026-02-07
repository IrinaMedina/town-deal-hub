-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('PUBLICADOR', 'SUSCRIPTOR');

-- Create enum for offer categories
CREATE TYPE public.offer_category AS ENUM ('OUTLET_ROPA', 'OUTLET_TECNO', 'OUTLET_HOGAR', 'OUTLET_ZAPATOS', 'OUTLET_BELLEZA', 'OTROS');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  town TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create offers table
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category offer_category NOT NULL,
  town TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  store_name TEXT NOT NULL,
  contact TEXT NOT NULL,
  image_url TEXT,
  expires_at DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  town TEXT NOT NULL,
  categories offer_category[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

-- Security definer function to check if user has role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own role"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Offers policies
CREATE POLICY "Anyone authenticated can view offers"
ON public.offers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Publicadores can insert their own offers"
ON public.offers FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by 
  AND public.has_role(auth.uid(), 'PUBLICADOR')
);

CREATE POLICY "Publicadores can update their own offers"
ON public.offers FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by 
  AND public.has_role(auth.uid(), 'PUBLICADOR')
);

CREATE POLICY "Publicadores can delete their own offers"
ON public.offers FOR DELETE
TO authenticated
USING (
  auth.uid() = created_by 
  AND public.has_role(auth.uid(), 'PUBLICADOR')
);

-- Subscriptions policies
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
ON public.subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
ON public.subscriptions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create storage bucket for offer images
INSERT INTO storage.buckets (id, name, public) VALUES ('offer-images', 'offer-images', true);

-- Storage policies for offer images
CREATE POLICY "Anyone can view offer images"
ON storage.objects FOR SELECT
USING (bucket_id = 'offer-images');

CREATE POLICY "Publicadores can upload offer images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'offer-images' 
  AND public.has_role(auth.uid(), 'PUBLICADOR')
);

CREATE POLICY "Publicadores can update their offer images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'offer-images' 
  AND public.has_role(auth.uid(), 'PUBLICADOR')
);

CREATE POLICY "Publicadores can delete their offer images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'offer-images' 
  AND public.has_role(auth.uid(), 'PUBLICADOR')
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for subscriptions updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
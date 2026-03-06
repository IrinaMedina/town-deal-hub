
-- Create business_category enum
DO $$ BEGIN
  CREATE TYPE public.business_category AS ENUM (
    'GESTORIA', 'ABOGADOS', 'FONTANERIA', 'ELECTRICIDAD',
    'DENTISTA', 'MEDICO', 'INFORMATICA', 'PRL',
    'AUTOESCUELA', 'PELUQUERIA_MUJER', 'PELUQUERIA_HOMBRE',
    'VETERINARIA', 'INMOBILIARIA', 'RESTAURACION', 'OTROS_SERVICIOS'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create businesses table
CREATE TABLE public.businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  category business_category NOT NULL,
  description TEXT,
  town TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  social_media JSONB DEFAULT '{}'::jsonb,
  schedule TEXT,
  logo_url TEXT,
  rating_avg NUMERIC(2,1) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create business_images table
CREATE TABLE public.business_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create business_reviews table
CREATE TABLE public.business_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for businesses
CREATE POLICY "Anyone authenticated can view businesses" ON public.businesses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Empresas can insert their own business" ON public.businesses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND has_role(auth.uid(), 'EMPRESA'::app_role));

CREATE POLICY "Empresas can update their own business" ON public.businesses
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by AND has_role(auth.uid(), 'EMPRESA'::app_role));

CREATE POLICY "Empresas can delete their own business" ON public.businesses
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by AND has_role(auth.uid(), 'EMPRESA'::app_role));

-- RLS Policies for business_images
CREATE POLICY "Anyone authenticated can view business images" ON public.business_images
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Business owners can manage images" ON public.business_images
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.businesses WHERE id = business_id AND created_by = auth.uid()
  ));

CREATE POLICY "Business owners can update images" ON public.business_images
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses WHERE id = business_id AND created_by = auth.uid()
  ));

CREATE POLICY "Business owners can delete images" ON public.business_images
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses WHERE id = business_id AND created_by = auth.uid()
  ));

-- RLS Policies for business_reviews
CREATE POLICY "Anyone authenticated can view reviews" ON public.business_reviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create reviews" ON public.business_reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update their own reviews" ON public.business_reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete their own reviews" ON public.business_reviews
  FOR DELETE TO authenticated
  USING (auth.uid() = reviewer_id);

-- Updated_at trigger for businesses
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update handle_new_user to support EMPRESA role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_name text;
  user_town text;
  user_role app_role;
BEGIN
  user_name := NEW.raw_user_meta_data->>'name';
  user_town := NEW.raw_user_meta_data->>'town';
  user_role := (NEW.raw_user_meta_data->>'role')::app_role;
  
  IF user_name IS NOT NULL AND user_town IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, name, town)
    VALUES (NEW.id, user_name, user_town)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  IF user_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role)
    ON CONFLICT (user_id) DO NOTHING;
    
    IF user_role = 'SUSCRIPTOR' AND user_town IS NOT NULL THEN
      INSERT INTO public.subscriptions (user_id, town, categories)
      VALUES (NEW.id, user_town, '{}')
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Storage bucket for business images
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-images', 'business-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for business-images
CREATE POLICY "Anyone can view business images" ON storage.objects
  FOR SELECT USING (bucket_id = 'business-images');

CREATE POLICY "Empresas can upload business images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'business-images');

CREATE POLICY "Empresas can delete their business images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'business-images' AND (storage.foldername(name))[1] = auth.uid()::text);

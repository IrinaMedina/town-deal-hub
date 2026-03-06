
-- Allow public (anonymous) access to view businesses
DROP POLICY IF EXISTS "Anyone authenticated can view businesses" ON public.businesses;
CREATE POLICY "Anyone can view businesses" ON public.businesses
  FOR SELECT
  USING (true);

-- Allow public access to view business images
DROP POLICY IF EXISTS "Anyone authenticated can view business images" ON public.business_images;
CREATE POLICY "Anyone can view business images" ON public.business_images
  FOR SELECT
  USING (true);

-- Allow public access to view business reviews
DROP POLICY IF EXISTS "Anyone authenticated can view reviews" ON public.business_reviews;
CREATE POLICY "Anyone can view reviews" ON public.business_reviews
  FOR SELECT
  USING (true);

-- Grant anon role SELECT on these tables
GRANT SELECT ON public.businesses TO anon;
GRANT SELECT ON public.business_images TO anon;
GRANT SELECT ON public.business_reviews TO anon;

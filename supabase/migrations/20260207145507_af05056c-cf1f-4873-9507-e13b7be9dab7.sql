-- Add size field for clothing and shoes offers
ALTER TABLE public.offers ADD COLUMN size text;

-- Add comment for clarity
COMMENT ON COLUMN public.offers.size IS 'Size for clothing (OUTLET_ROPA) and shoes (OUTLET_ZAPATOS) offers';
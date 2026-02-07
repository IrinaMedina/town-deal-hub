-- Create ratings table for subscribers to rate publishers after confirmed reservations
CREATE TABLE public.ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  publisher_id uuid NOT NULL,
  subscriber_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(reservation_id) -- One rating per reservation
);

-- Add index for faster lookups by publisher
CREATE INDEX idx_ratings_publisher_id ON public.ratings(publisher_id);
CREATE INDEX idx_ratings_subscriber_id ON public.ratings(subscriber_id);

-- Enable RLS
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Subscribers can create ratings for their own confirmed reservations
CREATE POLICY "Subscribers can create ratings for confirmed reservations"
  ON public.ratings
  FOR INSERT
  WITH CHECK (
    auth.uid() = subscriber_id
    AND EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = reservation_id
        AND r.subscriber_id = auth.uid()
        AND r.status = 'confirmed'
    )
  );

-- Subscribers can view their own ratings
CREATE POLICY "Subscribers can view their own ratings"
  ON public.ratings
  FOR SELECT
  USING (auth.uid() = subscriber_id);

-- Publishers can view ratings about them
CREATE POLICY "Publishers can view their ratings"
  ON public.ratings
  FOR SELECT
  USING (auth.uid() = publisher_id);

-- Anyone authenticated can view ratings (for public display)
CREATE POLICY "Authenticated users can view all ratings"
  ON public.ratings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Subscribers can update their own ratings
CREATE POLICY "Subscribers can update their own ratings"
  ON public.ratings
  FOR UPDATE
  USING (auth.uid() = subscriber_id);

-- Comment for clarity
COMMENT ON TABLE public.ratings IS 'Subscriber ratings for publishers, one per confirmed reservation';
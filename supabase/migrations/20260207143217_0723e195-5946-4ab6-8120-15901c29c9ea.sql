-- Create reservations table
CREATE TABLE public.reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL,
  subscriber_name TEXT NOT NULL,
  subscriber_email TEXT NOT NULL,
  subscriber_phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Subscribers can create reservations
CREATE POLICY "Subscribers can create reservations"
ON public.reservations
FOR INSERT
WITH CHECK (auth.uid() = subscriber_id);

-- Subscribers can view their own reservations
CREATE POLICY "Subscribers can view their own reservations"
ON public.reservations
FOR SELECT
USING (auth.uid() = subscriber_id);

-- Publishers can view reservations for their offers
CREATE POLICY "Publishers can view reservations for their offers"
ON public.reservations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.offers
    WHERE offers.id = reservations.offer_id
    AND offers.created_by = auth.uid()
  )
);

-- Publishers can update reservation status for their offers
CREATE POLICY "Publishers can update reservation status"
ON public.reservations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.offers
    WHERE offers.id = reservations.offer_id
    AND offers.created_by = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_reservations_updated_at
BEFORE UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_reservations_offer_id ON public.reservations(offer_id);
CREATE INDEX idx_reservations_subscriber_id ON public.reservations(subscriber_id);
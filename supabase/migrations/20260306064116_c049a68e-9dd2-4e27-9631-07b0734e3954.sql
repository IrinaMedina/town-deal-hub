
-- 1. Create messages table for internal chat
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text NOT NULL,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for fast conversation lookups
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id, read);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Senders can insert messages
CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Participants can view their messages
CREATE POLICY "Users can view their messages" ON public.messages
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Receivers can mark as read
CREATE POLICY "Receivers can update read status" ON public.messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 2. Add trial period to businesses
ALTER TABLE public.businesses ADD COLUMN trial_ends_at timestamptz DEFAULT (now() + interval '30 days');

-- 3. Allow EMPRESA role to also manage offers
DROP POLICY IF EXISTS "Publicadores can insert their own offers" ON public.offers;
CREATE POLICY "Publishers can insert their own offers" ON public.offers
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by 
    AND (has_role(auth.uid(), 'PUBLICADOR'::app_role) OR has_role(auth.uid(), 'EMPRESA'::app_role))
  );

DROP POLICY IF EXISTS "Publicadores can update their own offers" ON public.offers;
CREATE POLICY "Publishers can update their own offers" ON public.offers
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by 
    AND (has_role(auth.uid(), 'PUBLICADOR'::app_role) OR has_role(auth.uid(), 'EMPRESA'::app_role))
  );

DROP POLICY IF EXISTS "Publicadores can delete their own offers" ON public.offers;
CREATE POLICY "Publishers can delete their own offers" ON public.offers
  FOR DELETE TO authenticated
  USING (
    auth.uid() = created_by 
    AND (has_role(auth.uid(), 'PUBLICADOR'::app_role) OR has_role(auth.uid(), 'EMPRESA'::app_role))
  );

-- Grant anon select on messages (not needed, but grant profiles read for chat names)
GRANT SELECT ON public.messages TO authenticated;

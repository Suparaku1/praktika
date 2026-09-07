
-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "authenticated can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- CONVERSATIONS
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a UUID NOT NULL,
  participant_b UUID NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT participants_distinct CHECK (participant_a <> participant_b),
  CONSTRAINT participants_ordered CHECK (participant_a < participant_b),
  UNIQUE (participant_a, participant_b, job_id, contract_id)
);
CREATE INDEX idx_conversations_a ON public.conversations(participant_a, last_message_at DESC);
CREATE INDEX idx_conversations_b ON public.conversations(participant_b, last_message_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants view conversation" ON public.conversations
  FOR SELECT TO authenticated
  USING (auth.uid() IN (participant_a, participant_b));
CREATE POLICY "participants create conversation" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (participant_a, participant_b));
CREATE POLICY "participants update conversation" ON public.conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (participant_a, participant_b));

-- MESSAGES
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants view messages" ON public.messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND auth.uid() IN (c.participant_a, c.participant_b)
  ));
CREATE POLICY "participants send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND auth.uid() IN (c.participant_a, c.participant_b)
    )
  );
CREATE POLICY "recipients mark read" ON public.messages
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND auth.uid() IN (c.participant_a, c.participant_b)
  ));

-- Trigger: update conversation last_message_at on new message
CREATE OR REPLACE FUNCTION public.bump_conversation_last_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bump_conversation
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_last_message();

-- Helper: get or create conversation with ordered participants
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  _other_user UUID,
  _job_id UUID DEFAULT NULL,
  _contract_id UUID DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _me UUID := auth.uid();
  _a UUID;
  _b UUID;
  _id UUID;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _me = _other_user THEN RAISE EXCEPTION 'Cannot chat with self'; END IF;

  IF _me < _other_user THEN _a := _me; _b := _other_user;
  ELSE _a := _other_user; _b := _me;
  END IF;

  SELECT id INTO _id FROM public.conversations
  WHERE participant_a = _a AND participant_b = _b
    AND _job_id IS NOT DISTINCT FROM job_id
    AND _contract_id IS NOT DISTINCT FROM contract_id
  LIMIT 1;

  IF _id IS NULL THEN
    INSERT INTO public.conversations (participant_a, participant_b, job_id, contract_id)
    VALUES (_a, _b, _job_id, _contract_id)
    RETURNING id INTO _id;
  END IF;

  RETURN _id;
END;
$$;

-- Realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

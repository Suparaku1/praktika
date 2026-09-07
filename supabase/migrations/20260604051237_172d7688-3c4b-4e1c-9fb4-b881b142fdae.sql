
-- Contract status enum
CREATE TYPE public.contract_status AS ENUM (
  'draft', 'sent', 'signed_student', 'signed_business', 'active', 'completed', 'cancelled'
);

-- Contracts table
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  student_id UUID NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  hours_per_week INT,
  compensation NUMERIC(10,2),
  compensation_currency TEXT DEFAULT 'ALL',
  location TEXT,
  status public.contract_status NOT NULL DEFAULT 'draft',
  student_signed_at TIMESTAMPTZ,
  student_signature_name TEXT,
  student_signature_ip TEXT,
  business_signed_at TIMESTAMPTZ,
  business_signature_name TEXT,
  business_signature_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Businesses manage their contracts
CREATE POLICY "Businesses manage own contracts"
ON public.contracts FOR ALL TO authenticated
USING (business_id = auth.uid())
WITH CHECK (business_id = auth.uid() AND public.has_role(auth.uid(), 'business'));

-- Students view their contracts
CREATE POLICY "Students view own contracts"
ON public.contracts FOR SELECT TO authenticated
USING (student_id = auth.uid());

-- Students update only to sign (limited via app; full update gate)
CREATE POLICY "Students sign own contracts"
ON public.contracts FOR UPDATE TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

-- Teachers and admins view all
CREATE POLICY "Teachers and admins view contracts"
ON public.contracts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_contracts_business ON public.contracts(business_id);
CREATE INDEX idx_contracts_student ON public.contracts(student_id);
CREATE INDEX idx_contracts_status ON public.contracts(status);

-- Audit log
CREATE TABLE public.contract_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.contract_events TO authenticated;
GRANT ALL ON public.contract_events TO service_role;

ALTER TABLE public.contract_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties insert contract events"
ON public.contract_events FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_id
      AND (c.business_id = auth.uid() OR c.student_id = auth.uid())
  )
);

CREATE POLICY "Parties view contract events"
ON public.contract_events FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_id
      AND (c.business_id = auth.uid() OR c.student_id = auth.uid())
  ) OR public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'super_admin')
);

CREATE INDEX idx_contract_events_contract ON public.contract_events(contract_id);

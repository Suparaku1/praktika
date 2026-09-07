
-- 1) classes (without the cross-table policy yet)
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  name TEXT NOT NULL,
  school_name TEXT,
  professional_program TEXT,
  academic_year TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own classes"
ON public.classes FOR ALL TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid() AND public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Admins view all classes"
ON public.classes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER classes_updated_at BEFORE UPDATE ON public.classes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX idx_classes_teacher ON public.classes(teacher_id);

-- 2) class_students
CREATE TABLE public.class_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  added_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);
GRANT SELECT, INSERT, DELETE ON public.class_students TO authenticated;
GRANT ALL ON public.class_students TO service_role;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage members of own classes"
ON public.class_students FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()))
WITH CHECK (
  added_by = auth.uid() AND
  EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid())
);

CREATE POLICY "Students view own class memberships"
ON public.class_students FOR SELECT TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Admins view all memberships"
ON public.class_students FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_class_students_class ON public.class_students(class_id);
CREATE INDEX idx_class_students_student ON public.class_students(student_id);

-- 3) Now add the cross-table policy on classes
CREATE POLICY "Students view classes they are in"
ON public.classes FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.class_students cs
  WHERE cs.class_id = id AND cs.student_id = auth.uid()
));

-- 4) practice_evaluations
CREATE TABLE public.practice_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  student_id UUID NOT NULL,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  period_start DATE,
  period_end DATE,
  attendance_percent INT CHECK (attendance_percent BETWEEN 0 AND 100),
  score INT CHECK (score BETWEEN 1 AND 10),
  strengths TEXT,
  improvements TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_evaluations TO authenticated;
GRANT ALL ON public.practice_evaluations TO service_role;
ALTER TABLE public.practice_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own evaluations"
ON public.practice_evaluations FOR ALL TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid() AND public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Students view own evaluations"
ON public.practice_evaluations FOR SELECT TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Businesses view evaluations on their contracts"
ON public.practice_evaluations FOR SELECT TO authenticated
USING (
  contract_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_id AND c.business_id = auth.uid()
  )
);

CREATE POLICY "Admins view all evaluations"
ON public.practice_evaluations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER practice_evaluations_updated_at BEFORE UPDATE ON public.practice_evaluations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_eval_student ON public.practice_evaluations(student_id);
CREATE INDEX idx_eval_teacher ON public.practice_evaluations(teacher_id);
CREATE INDEX idx_eval_contract ON public.practice_evaluations(contract_id);

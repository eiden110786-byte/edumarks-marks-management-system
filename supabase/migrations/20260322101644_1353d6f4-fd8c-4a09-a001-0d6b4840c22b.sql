
-- Add roll_number and avatar_url to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS roll_number text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT '';

-- Assignments uploaded by teachers
CREATE TABLE public.assignment_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  due_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.assignment_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage assignment_uploads" ON public.assignment_uploads FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can manage own uploads" ON public.assignment_uploads FOR ALL USING (has_role(auth.uid(), 'teacher') AND teacher_id = auth.uid());
CREATE POLICY "Students can view assignment_uploads" ON public.assignment_uploads FOR SELECT USING (has_role(auth.uid(), 'student'));

-- Student submissions
CREATE TABLE public.assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignment_uploads(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  status text NOT NULL DEFAULT 'Pending',
  marks numeric DEFAULT NULL,
  feedback text DEFAULT '',
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone
);

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage submissions" ON public.assignment_submissions FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can insert own submissions" ON public.assignment_submissions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can view own submissions" ON public.assignment_submissions FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Teachers can view submissions for their assignments" ON public.assignment_submissions FOR SELECT USING (
  has_role(auth.uid(), 'teacher') AND EXISTS (
    SELECT 1 FROM public.assignment_uploads au WHERE au.id = assignment_submissions.assignment_id AND au.teacher_id = auth.uid()
  )
);
CREATE POLICY "Teachers can update submissions for their assignments" ON public.assignment_submissions FOR UPDATE USING (
  has_role(auth.uid(), 'teacher') AND EXISTS (
    SELECT 1 FROM public.assignment_uploads au WHERE au.id = assignment_submissions.assignment_id AND au.teacher_id = auth.uid()
  )
);

-- Attendance
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'Present',
  marked_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_id, batch_id, date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage attendance" ON public.attendance FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can manage attendance" ON public.attendance FOR ALL USING (has_role(auth.uid(), 'teacher') AND marked_by = auth.uid());
CREATE POLICY "Students can view own attendance" ON public.attendance FOR SELECT USING (auth.uid() = student_id);

-- Fee Payments
CREATE TABLE public.fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  challan_id text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  semester integer NOT NULL DEFAULT 1,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  proof_url text DEFAULT '',
  status text NOT NULL DEFAULT 'Pending',
  verified_by uuid,
  verified_at timestamp with time zone,
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fee_payments" ON public.fee_payments FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can insert own payments" ON public.fee_payments FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can view own payments" ON public.fee_payments FOR SELECT USING (auth.uid() = student_id);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-pictures', 'profile-pictures', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('assignments', 'assignments', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('submissions', 'submissions', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', true);

-- Storage RLS policies
CREATE POLICY "Anyone can view profile pictures" ON storage.objects FOR SELECT USING (bucket_id = 'profile-pictures');
CREATE POLICY "Authenticated users can upload profile pictures" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profile-pictures' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile pictures" ON storage.objects FOR UPDATE USING (bucket_id = 'profile-pictures' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete own profile pictures" ON storage.objects FOR DELETE USING (bucket_id = 'profile-pictures' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated can view assignments" ON storage.objects FOR SELECT USING (bucket_id = 'assignments' AND auth.role() = 'authenticated');
CREATE POLICY "Teachers can upload assignments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'assignments' AND auth.role() = 'authenticated');
CREATE POLICY "Teachers can delete assignments" ON storage.objects FOR DELETE USING (bucket_id = 'assignments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated can view submissions" ON storage.objects FOR SELECT USING (bucket_id = 'submissions' AND auth.role() = 'authenticated');
CREATE POLICY "Students can upload submissions" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'submissions' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated can view payment proofs" ON storage.objects FOR SELECT USING (bucket_id = 'payment-proofs' AND auth.role() = 'authenticated');
CREATE POLICY "Students can upload payment proofs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment-proofs' AND auth.role() = 'authenticated');

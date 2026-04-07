CREATE POLICY "Public can view batches"
ON public.batches
FOR SELECT
TO anon
USING (true);
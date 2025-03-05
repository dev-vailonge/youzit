-- Drop the existing policy
DROP POLICY IF EXISTS "Allow admin to read waiting list" ON public.waiting_list;

-- Create new policy to allow public read access
CREATE POLICY "Allow public to read waiting list"
    ON public.waiting_list
    FOR SELECT
    TO public
    USING (true); 
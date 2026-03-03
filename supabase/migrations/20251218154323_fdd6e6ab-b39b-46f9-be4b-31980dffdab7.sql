-- Add owner_id column to restaurants to track who created it
ALTER TABLE public.restaurants ADD COLUMN owner_id uuid REFERENCES auth.users(id);

-- Create policy allowing the owner to view their restaurant during signup
CREATE POLICY "Owner can view their restaurant"
ON public.restaurants FOR SELECT
USING (owner_id = auth.uid());

-- Update existing insert policy to set owner_id
DROP POLICY IF EXISTS "Anyone can insert restaurant on signup" ON public.restaurants;

CREATE POLICY "Users can insert their own restaurant on signup"
ON public.restaurants FOR INSERT
WITH CHECK (owner_id = auth.uid());
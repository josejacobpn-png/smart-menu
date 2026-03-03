-- Add send_to_kitchen column to categories table
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS send_to_kitchen BOOLEAN DEFAULT true;

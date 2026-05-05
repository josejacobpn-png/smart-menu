-- Add auto_print_tickets to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS auto_print_tickets BOOLEAN DEFAULT false;

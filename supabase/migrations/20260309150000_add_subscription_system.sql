-- Migration: Add Subscription System to Restaurants
-- Description: Adds trial and subscription tracking columns and trigger

-- Add columns to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP WITH TIME ZONE;

-- Create function to set initial trial
CREATE OR REPLACE FUNCTION public.handle_new_restaurant_trial()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Set trial to 3 days from now
    NEW.trial_ends_at := now() + interval '3 days';
    RETURN NEW;
END;
$$;

-- Create trigger for new restaurants
DROP TRIGGER IF EXISTS tr_set_restaurant_trial ON public.restaurants;
CREATE TRIGGER tr_set_restaurant_trial
BEFORE INSERT ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_restaurant_trial();

-- Update existing restaurants to have a 3-day trial from now (if null)
UPDATE public.restaurants 
SET trial_ends_at = now() + interval '3 days' 
WHERE trial_ends_at IS NULL AND subscription_ends_at IS NULL;

-- 1. Create employees table
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id),
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'waiter', -- waiter, manager, cook, etc.
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add RLS policies for employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view employees of their restaurant" ON public.employees
    FOR SELECT USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can insert employees for their restaurant" ON public.employees
    FOR INSERT WITH CHECK (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can update employees of their restaurant" ON public.employees
    FOR UPDATE USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can delete employees of their restaurant" ON public.employees
    FOR DELETE USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

-- 3. Add employee_id to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id);

-- 4. Update order policies to allow seeing orders if you are the employee? 
-- (Usually orders are viewed by restaurant_id so existing policies should suffice)

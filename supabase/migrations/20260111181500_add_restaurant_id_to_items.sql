-- 6. Add restaurant_id to order_items for better Realtime/RLS support
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);

-- Backfill data
UPDATE public.order_items
SET restaurant_id = orders.restaurant_id
FROM public.orders
WHERE order_items.order_id = orders.id
AND order_items.restaurant_id IS NULL;

-- Make it required (optional, but good practice)
-- ALTER TABLE public.order_items ALTER COLUMN restaurant_id SET NOT NULL;

-- Policy Update (Simplifies RLS)
DROP POLICY IF EXISTS "Users can view order items" ON public.order_items;
CREATE POLICY "Users can view order items" ON public.order_items
    FOR SELECT USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

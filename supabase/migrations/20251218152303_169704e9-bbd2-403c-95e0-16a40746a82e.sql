
-- Fix search_path for handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Fix search_path for update_order_total function
CREATE OR REPLACE FUNCTION public.update_order_total()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.orders
    SET subtotal = (
        SELECT COALESCE(SUM(total_price), 0)
        FROM public.order_items
        WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    ),
    total = (
        SELECT COALESCE(SUM(total_price), 0)
        FROM public.order_items
        WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    ) - COALESCE(orders.discount, 0)
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    RETURN NEW;
END;
$$;

-- Function to calculate the next order number for a specific restaurant
CREATE OR REPLACE FUNCTION public.set_next_order_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Lock the table for this restaurant to prevent race conditions
    -- (This isn't strictly creating a lock object, but by selecting for update or just relying on single transaction visibility if isolation is high enough. 
    -- However, simple MAX + 1 is susceptible to race conditions under high concurrency without locking. 
    -- For this scale, a simple advisory lock or just optimistic locking might be enough, but let's try to be robust).
    
    -- We can lock the restaurant row to serialize order creation for this restaurant
    PERFORM id FROM public.restaurants WHERE id = NEW.restaurant_id FOR UPDATE;

    SELECT COALESCE(MAX(order_number), 0) + 1
    INTO next_number
    FROM public.orders
    WHERE restaurant_id = NEW.restaurant_id;

    NEW.order_number := next_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before inserting a new order
DROP TRIGGER IF EXISTS set_order_number_trigger ON public.orders;
CREATE TRIGGER set_order_number_trigger
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_next_order_number();

-- Optional: If you want to stop the global serial from being used as default, you could alter the column, 
-- but it's safer to leave it compatible for now. The trigger overrides it anyway.

-- Add stock control columns to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;

-- Function to decrease stock when an order is created
CREATE OR REPLACE FUNCTION public.decrease_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Update stock only for items that have track_stock = true
    UPDATE public.products
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id
      AND track_stock = true;
      
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to execute the function after an order item is inserted
DROP TRIGGER IF EXISTS decrease_stock_trigger ON public.order_items;
CREATE TRIGGER decrease_stock_trigger
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.decrease_stock_on_order();

-- Optional: Function/Trigger to handle order cancellation (restore stock) could be added later
-- For now, focused on simple deduction on sale.

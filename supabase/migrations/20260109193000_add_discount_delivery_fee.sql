-- Add discount and delivery_fee columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0;

-- Update process_payment function to handle discount and delivery fee
CREATE OR REPLACE FUNCTION public.process_payment(
    p_order_id UUID,
    p_payment_method payment_method,
    p_received_amount DECIMAL(10,2),
    p_discount DECIMAL(10,2) DEFAULT 0,
    p_delivery_fee DECIMAL(10,2) DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_restaurant_id UUID;
    v_user_id UUID;
    v_payment_id UUID;
    v_change_amount DECIMAL(10,2);
    v_final_total DECIMAL(10,2);
    v_subtotal DECIMAL(10,2);
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    -- Get order details
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    -- Check if order is already paid
    IF v_order.status = 'completed' THEN
        RAISE EXCEPTION 'Order is already completed';
    END IF;

    -- Get restaurant_id
    v_restaurant_id := v_order.restaurant_id;

    -- Calculate Totals
    -- Assume current total or subtotal represents the items sum
    v_subtotal := COALESCE(v_order.subtotal, v_order.total); 
    
    -- Recalculate Final Total
    v_final_total := v_subtotal - p_discount + p_delivery_fee;
    
    -- Ensure non-negative total
    IF v_final_total < 0 THEN
        v_final_total := 0;
    END IF;

    -- Validate payment amount (if cash)
    IF p_payment_method = 'cash' THEN
        IF p_received_amount < v_final_total THEN
            RAISE EXCEPTION 'Received amount is less than total';
        END IF;
        v_change_amount := p_received_amount - v_final_total;
    ELSE
        -- For non-cash methods, received amount is assumed equal to total
        p_received_amount := v_final_total;
        v_change_amount := 0;
    END IF;

    -- Update Order with new financial details
    UPDATE public.orders
    SET 
        status = 'completed',
        discount = p_discount,
        delivery_fee = p_delivery_fee,
        subtotal = v_subtotal,
        total = v_final_total
    WHERE id = p_order_id;

    -- Insert Payment Record
    INSERT INTO public.payments (
        order_id,
        restaurant_id,
        amount,
        payment_method,
        received_amount,
        change_amount,
        created_by
    ) VALUES (
        p_order_id,
        v_restaurant_id,
        v_final_total,
        p_payment_method,
        p_received_amount,
        v_change_amount,
        v_user_id
    ) RETURNING id INTO v_payment_id;

    -- Free Table (if applicable)
    IF v_order.order_type = 'table' AND v_order.table_id IS NOT NULL THEN
        UPDATE public.restaurant_tables
        SET status = 'free'
        WHERE id = v_order.table_id;
    END IF;

    RETURN v_payment_id;
END;
$$;

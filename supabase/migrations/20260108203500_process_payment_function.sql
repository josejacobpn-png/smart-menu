-- Secure function to process payments
CREATE OR REPLACE FUNCTION public.process_payment(
    p_order_id UUID,
    p_payment_method payment_method,
    p_received_amount DECIMAL(10,2)
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the function creator (postgres)
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_restaurant_id UUID;
    v_user_id UUID;
    v_payment_id UUID;
    v_change_amount DECIMAL(10,2);
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

    -- Get restaurant_id from order to ensure consistency
    v_restaurant_id := v_order.restaurant_id;

    -- Validate payment amount (if cash)
    IF p_payment_method = 'cash' THEN
        IF p_received_amount < v_order.total THEN
            RAISE EXCEPTION 'Received amount is less than total';
        END IF;
        v_change_amount := p_received_amount - v_order.total;
    ELSE
        -- For non-cash methods, received amount is assumed equal to total
        p_received_amount := v_order.total;
        v_change_amount := 0;
    END IF;

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
        v_order.total,
        p_payment_method,
        p_received_amount,
        v_change_amount,
        v_user_id
    ) RETURNING id INTO v_payment_id;

    -- Update Order Status
    UPDATE public.orders
    SET status = 'completed'
    WHERE id = p_order_id;

    -- Free Table (if applicable)
    IF v_order.order_type = 'table' AND v_order.table_id IS NOT NULL THEN
        UPDATE public.restaurant_tables
        SET status = 'free'
        WHERE id = v_order.table_id;
    END IF;

    RETURN v_payment_id;
END;
$$;

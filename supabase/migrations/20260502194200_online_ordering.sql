-- Enable public read access for online menu
DROP POLICY IF EXISTS "Anyone can view restaurants" ON public.restaurants;
CREATE POLICY "Anyone can view restaurants" ON public.restaurants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);

-- Function to safely create an online order without requiring authentication
CREATE OR REPLACE FUNCTION public.create_online_order(
    p_restaurant_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_delivery_address TEXT,
    p_order_type TEXT, -- 'delivery' or 'counter'
    p_total DECIMAL,
    p_items JSONB -- Array of { product_id, quantity, unit_price, total_price, notes }
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
BEGIN
    -- Validate order type
    IF p_order_type NOT IN ('delivery', 'counter') THEN
        RAISE EXCEPTION 'Invalid order type. Must be delivery or counter.';
    END IF;

    -- Insert order
    INSERT INTO public.orders (
        restaurant_id, 
        order_type, 
        status, 
        customer_name, 
        customer_phone, 
        delivery_address, 
        total,
        subtotal
    ) VALUES (
        p_restaurant_id, 
        p_order_type::public.order_type, 
        'open'::public.order_status, 
        p_customer_name, 
        p_customer_phone, 
        p_delivery_address, 
        p_total,
        p_total
    ) RETURNING id INTO v_order_id;

    -- Insert items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.order_items (
            order_id, 
            restaurant_id,
            product_id, 
            product_name,
            quantity, 
            unit_price, 
            total_price, 
            notes
        ) VALUES (
            v_order_id, 
            p_restaurant_id,
            (v_item->>'product_id')::UUID, 
            v_item->>'product_name',
            (v_item->>'quantity')::INTEGER, 
            (v_item->>'unit_price')::DECIMAL, 
            (v_item->>'total_price')::DECIMAL, 
            v_item->>'notes'
        );
    END LOOP;

    RETURN v_order_id;
END;
$$;

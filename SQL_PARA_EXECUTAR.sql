-- 1. Adicionar colunas de desconto e taxa de entrega na tabela de pedidos
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0;

-- 2. Atualizar a função de processamento de pagamento
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

-- 3. Corrigir numeração sequencial de pedidos por restaurante
-- Função para calcular o próximo número de pedido
CREATE OR REPLACE FUNCTION public.set_next_order_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Bloqueia o registro do restaurante para evitar condições de corrida (concorrência)
    PERFORM id FROM public.restaurants WHERE id = NEW.restaurant_id FOR UPDATE;

    -- Pega o maior número de pedido atual deste restaurante e soma 1
    SELECT COALESCE(MAX(order_number), 0) + 1
    INTO next_number
    FROM public.orders
    WHERE restaurant_id = NEW.restaurant_id;

    NEW.order_number := next_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para executar a função antes de cada inserção na tabela orders
DROP TRIGGER IF EXISTS set_order_number_trigger ON public.orders;
CREATE TRIGGER set_order_number_trigger
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_next_order_number();

-- 4. Adicionar Controle de Estoque Simples
-- Adicionar colunas na tabela de produtos
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;

-- Função para diminuir estoque ao criar item do pedido
CREATE OR REPLACE FUNCTION public.decrease_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualiza estoque apenas se o produto tiver controle ativado
    UPDATE public.products
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id
      AND track_stock = true;
      
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger executada após inserir item do pedido
DROP TRIGGER IF EXISTS decrease_stock_trigger ON public.order_items;
CREATE TRIGGER decrease_stock_trigger
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.decrease_stock_on_order();

-- 5. Controle de Impressão na Cozinha (Categorias)
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS send_to_kitchen BOOLEAN DEFAULT true;

-- 6. Melhoria na Sincronização em Tempo Real (Cozinha)
-- Adiciona restaurant_id para permitir filtros seguros no Realtime
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);

-- Preencher dados existentes (Backfill)
UPDATE public.order_items
SET restaurant_id = orders.restaurant_id
FROM public.orders
WHERE order_items.order_id = orders.id
AND order_items.restaurant_id IS NULL;

-- Atualizar Política de Segurança (RLS) para usar a nova coluna
DROP POLICY IF EXISTS "Users can view order items" ON public.order_items;
CREATE POLICY "Users can view order items" ON public.order_items
    FOR SELECT USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

-- 7. ATIVAR REALTIME (CRÍTICO - EXECUTE ISSO)
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

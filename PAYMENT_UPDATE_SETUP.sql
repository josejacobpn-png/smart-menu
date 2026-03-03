DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('cash', 'credit_card', 'debit_card', 'pix');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS couvert decimal(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_fee decimal(10,2) DEFAULT 0;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method payment_method;

DROP FUNCTION IF EXISTS process_payment(uuid, text, decimal, decimal, decimal);
DROP FUNCTION IF EXISTS process_payment(uuid, text, decimal, decimal, decimal, decimal, decimal);
DROP FUNCTION IF EXISTS process_payment(uuid, payment_method, decimal, decimal, decimal);

CREATE OR REPLACE FUNCTION process_payment(
  p_order_id uuid,
  p_payment_method text,
  p_received_amount decimal,
  p_discount decimal DEFAULT 0,
  p_delivery_fee decimal DEFAULT 0,
  p_couvert decimal DEFAULT 0,
  p_service_fee decimal DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total decimal;
  v_subtotal decimal;
  v_restaurant_id uuid;
BEGIN
  SELECT subtotal, restaurant_id INTO v_subtotal, v_restaurant_id
  FROM orders
  WHERE id = p_order_id;

  v_total := GREATEST(0, (v_subtotal + p_delivery_fee + p_couvert + p_service_fee) - p_discount);

  UPDATE orders
  SET 
    status = 'completed',
    discount = p_discount,
    delivery_fee = p_delivery_fee,
    couvert = p_couvert,
    service_fee = p_service_fee,
    total = v_total,
    updated_at = NOW()
  WHERE id = p_order_id;

  INSERT INTO payments (
    restaurant_id,
    order_id,
    payment_method,
    amount
  ) VALUES (
    v_restaurant_id,
    p_order_id,
    p_payment_method::payment_method,
    v_total
  );

  UPDATE restaurant_tables
  SET status = 'free'
  WHERE id = (SELECT table_id FROM orders WHERE id = p_order_id);

END;
$$;

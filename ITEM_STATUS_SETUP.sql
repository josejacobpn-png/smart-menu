ALTER TABLE order_items ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

UPDATE order_items SET status = 'ready' WHERE order_id IN (SELECT id FROM orders WHERE status IN ('ready', 'completed'));

UPDATE order_items SET status = 'preparing' WHERE order_id IN (SELECT id FROM orders WHERE status = 'preparing');

UPDATE order_items SET status = 'pending' WHERE order_id IN (SELECT id FROM orders WHERE status = 'open');

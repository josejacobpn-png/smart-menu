export type PaymentMethod = 'cash' | 'pix' | 'credit_card' | 'debit_card';

export type OrderType = 'counter' | 'table' | 'delivery';

export type OrderStatus = 'open' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  total_price: number;
  category_name?: string;
  category_send_to_kitchen?: boolean;
}

export interface Order {
  id: string;
  order_number: number;
  order_type: OrderType;
  status: OrderStatus;
  customer_name: string | null;
  total: number;
  created_at: string;
  table_id?: string;
  table_number?: number;
  items: OrderItem[];
  subtotal?: number;
  discount?: number;
  delivery_fee?: number;
  couvert?: number;
  service_fee?: number;
  notes?: string | null;
  delivery_address?: string | null;
}

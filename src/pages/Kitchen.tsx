import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ChefHat, Clock, CheckCircle, Play, Bell } from 'lucide-react';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  notes: string | null;
  category_name?: string;
  category_send_to_kitchen?: boolean;
  status: 'pending' | 'preparing' | 'ready' | 'cancelled';
}

interface Order {
  id: string;
  order_number: number;
  order_type: 'counter' | 'table' | 'delivery';
  status: string;
  customer_name: string | null;
  created_at: string;
  notes: string | null;
  items: OrderItem[];
}

export default function Kitchen() {
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevOrderCountRef = useRef(0);

  useEffect(() => {
    // Create audio element for notification
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 0.5;

    return () => {
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (restaurant?.id) {
      fetchOrders();

      // Subscribe to realtime updates
      const channel = supabase
        .channel('kitchen-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `restaurant_id=eq.${restaurant.id}`,
          },
          () => {
            fetchOrders();
          }
        )
        .subscribe();

      // Also subscribe to order_items to catch new items added to existing orders
      const itemsChannel = supabase
        .channel('kitchen-order-items')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'order_items',
            filter: `restaurant_id=eq.${restaurant.id}`,
          },
          () => {
            fetchOrders();
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(itemsChannel);
      };
    }
  }, [restaurant?.id]);

  const fetchOrders = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant!.id)
        .in('status', ['open', 'preparing', 'ready'])
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch items for each order
      const ordersWithItems: Order[] = [];

      for (const order of ordersData || []) {
        const { data: items } = await supabase
          .from('order_items')
          .select(`
            id, 
            product_name, 
            quantity, 
            notes,
            status,
            product:products (
              category:categories (
                name,
                send_to_kitchen
              )
            )
          `)
          .eq('order_id', order.id);

        const itemsData = items as Array<{
          id: string;
          product_name: string;
          quantity: number;
          notes: string | null;
          status: string;
          product?: {
            category?: {
              name: string;
              send_to_kitchen: boolean;
            }
          }
        }> | null;

        const mappedItems: OrderItem[] = itemsData?.map((item) => ({
          id: item.id,
          product_name: item.product_name,
          quantity: item.quantity,
          notes: item.notes,
          status: (item.status as any) || 'pending',
          category_name: item.product?.category?.name,
          category_send_to_kitchen: item.product?.category?.send_to_kitchen
        })) || [];

        // Filter items: Remove items marked as not for kitchen
        const kitchenItems = mappedItems.filter((item) => {
          // If explicitly false, exclude. Otherwise (true or null/undefined), include.
          // The database default is TRUE, so we can be permissive.
          return item.category_send_to_kitchen !== false;
        });

        // Only include order if it has kitchen items
        if (kitchenItems.length > 0) {
          ordersWithItems.push({
            ...order,
            items: kitchenItems,
          });
        }
      }

      // Play sound for new orders
      const newOrderCount = ordersWithItems.filter(o => o.status === 'open').length;
      if (newOrderCount > prevOrderCountRef.current && audioRef.current) {
        audioRef.current.play().catch(() => { });
      }
      prevOrderCountRef.current = newOrderCount;

      setOrders(ordersWithItems);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: 'preparing' | 'ready') => {
    // This function is kept for backward compatibility or falling back to full order update
    // But primarily we will update items now.
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Also update all pending items if moving to preparing
      if (newStatus === 'preparing') {
        await supabase
          .from('order_items')
          .update({ status: 'preparing' })
          .eq('order_id', orderId)
          .eq('status', 'pending');
      }

      // Also update all preparing items if moving to ready
      if (newStatus === 'ready') {
        await supabase
          .from('order_items')
          .update({ status: 'ready' })
          .eq('order_id', orderId)
          .eq('status', 'preparing');
      }

      toast({
        title: newStatus === 'preparing' ? 'Pedido em preparo!' : 'Pedido pronto!'
      });
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast({ title: 'Erro ao atualizar pedido', variant: 'destructive' });
    }
  };

  const updateItemStatus = async (itemId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('order_items')
        .update({ status: newStatus })
        .eq('id', itemId);

      if (error) throw error;
      fetchOrders();
    } catch (error) {
      console.error('Error updating item:', error);
      toast({ title: 'Erro ao atualizar item', variant: 'destructive' });
    }
  };

  const getOrderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      counter: 'Balcão',
      table: 'Mesa',
      delivery: 'Delivery',
    };
    return labels[type] || type;
  };

  const getTimeDiff = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return 'agora';
    if (diff === 1) return '1 min';
    return `${diff} min`;
  };

  // Filter orders and their items based on status
  const openOrders = orders.map(o => ({
    ...o,
    items: o.items.filter(i => i.status === 'pending')
  })).filter(o => o.items.length > 0);

  const preparingOrders = orders.map(o => ({
    ...o,
    items: o.items.filter(i => i.status === 'preparing')
  })).filter(o => o.items.length > 0);

  // For ready column, we might show orders where all items are ready, OR simply recent ready items?
  // User request: "other items that were ready return to join the new item"
  // Implies that columns should split items.
  // Actually, typically 'Ready' column shows the *Order* that is fully ready? 
  // OR should we handle partial readiness?
  // Let's stick to the current structure: Columns are by ORDER status, but we only show RELEVANT items in them.
  // Wait, if an order has 1 pending and 1 preparing item, where does it go?
  // It should probably appear in BOTH columns, showing only relevant items.

  // Let's refine the lists:
  // An order appears in "New" if it has pending items.
  // An order appears in "Preparing" if it has preparing items.
  // An order appears in "Ready" if it is fully ready (status='ready') OR simply listed there.

  // Note: The previous logic filtered `orders` by `order.status`.
  // If we split by item status, we can have the same order in multiple columns.

  // Let's try this logic:
  // New Column: Orders with at least one 'pending' item. Show only pending items.
  // Preparing Column: Orders with at least one 'preparing' item. Show only preparing items.
  // Ready Column: Orders with status 'ready' (all items done).

  const readyOrders = orders.filter(o => o.status === 'ready');

  const OrderCard = ({ order, showStartButton, showReadyButton }: {
    order: Order;
    showStartButton?: boolean;
    showReadyButton?: boolean;
  }) => {
    const timeDiff = getTimeDiff(order.created_at);
    const isLate = parseInt(timeDiff) > 15;

    return (
      <Card className={`card-hover ${order.status === 'open' ? 'animate-pulse-soft border-primary' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
                <span className="font-bold text-primary-foreground text-lg">
                  #{order.order_number}
                </span>
              </div>
              <div>
                <CardTitle className="text-base">{getOrderTypeLabel(order.order_type)}</CardTitle>
                {order.customer_name && (
                  <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={isLate ? 'destructive' : 'secondary'}
                className="flex items-center gap-1"
              >
                <Clock className="h-3 w-3" />
                {timeDiff}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Items */}
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className={`flex items-start gap-2 p-2 rounded-lg ${item.status === 'ready' ? 'bg-success/10' : 'bg-muted'
                }`}>
                <div className="flex items-center gap-2">
                  {/* Individual Item Actions */}
                  {showStartButton && item.status === 'pending' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateItemStatus(item.id, 'preparing');
                      }}
                      title="Iniciar item"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  {showReadyButton && item.status === 'preparing' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-success"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateItemStatus(item.id, 'ready');
                      }}
                      title="Item pronto"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <Badge variant="outline" className="font-bold">
                  {item.quantity}x
                </Badge>
                <div className="flex-1">
                  <p className={`font-medium ${item.status === 'ready' ? 'line-through text-muted-foreground' : ''}`}>
                    {item.product_name}
                  </p>
                  {item.notes && (
                    <p className="text-sm text-warning">⚠️ {item.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {order.notes && (
            <div className="p-2 bg-warning/10 rounded-lg">
              <p className="text-sm text-warning">📝 {order.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {showStartButton && (
              <Button
                className="flex-1 gradient-primary btn-bounce"
                onClick={() => updateOrderStatus(order.id, 'preparing')}
              >
                <Play className="h-4 w-4 mr-2" />
                Iniciar Preparo
              </Button>
            )}
            {showReadyButton && (
              <Button
                className="flex-1 bg-success hover:bg-success/90 btn-bounce"
                onClick={() => updateOrderStatus(order.id, 'ready')}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Pronto
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
            <ChefHat className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Cozinha</h1>
            <p className="text-muted-foreground">Pedidos em tempo real</p>
          </div>
        </div>
        {openOrders.length > 0 && (
          <Badge className="bg-primary text-primary-foreground animate-bounce-soft text-lg px-4 py-2">
            <Bell className="h-4 w-4 mr-2" />
            {openOrders.length} novo{openOrders.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Orders Columns */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* New Orders */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-info animate-pulse" />
            <h2 className="font-semibold text-lg">Novos Pedidos</h2>
            <Badge variant="secondary">{openOrders.length}</Badge>
          </div>
          <div className="space-y-4">
            {openOrders.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p>Nenhum pedido novo</p>
                </CardContent>
              </Card>
            ) : (
              openOrders.map((order) => (
                <OrderCard key={order.id} order={order} showStartButton />
              ))
            )}
          </div>
        </div>

        {/* Preparing */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <h2 className="font-semibold text-lg">Em Preparo</h2>
            <Badge variant="secondary">{preparingOrders.length}</Badge>
          </div>
          <div className="space-y-4">
            {preparingOrders.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p>Nenhum pedido em preparo</p>
                </CardContent>
              </Card>
            ) : (
              preparingOrders.map((order) => (
                <OrderCard key={order.id} order={order} showReadyButton />
              ))
            )}
          </div>
        </div>

        {/* Ready */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-success" />
            <h2 className="font-semibold text-lg">Prontos</h2>
            <Badge variant="secondary">{readyOrders.length}</Badge>
          </div>
          <div className="space-y-4">
            {readyOrders.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p>Nenhum pedido pronto</p>
                </CardContent>
              </Card>
            ) : (
              readyOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

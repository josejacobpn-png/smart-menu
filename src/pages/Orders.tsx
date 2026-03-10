import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, ShoppingBag, Clock, ChefHat, CheckCircle } from 'lucide-react';

type OrderStatus = 'open' | 'preparing' | 'ready' | 'completed' | 'cancelled';

interface Order {
  id: string;
  order_number: number;
  order_type: 'counter' | 'table' | 'delivery';
  status: OrderStatus;
  customer_name: string | null;
  total: number;
  created_at: string;
  table_id: string | null;
  employees?: { name: string } | null;
}

export default function Orders() {
  const { restaurant } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (restaurant?.id) {
      fetchOrders();

      // Subscribe to realtime updates
      const channel = supabase
        .channel('orders-changes')
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

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [restaurant?.id]);

  const fetchOrders = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('orders')
        .select('*, employees(name)')
        .eq('restaurant_id', restaurant!.id)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as any) || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusInfo = (status: OrderStatus) => {
    const info: Record<OrderStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
      open: { label: 'Aberto', color: 'bg-info text-info-foreground', icon: Clock },
      preparing: { label: 'Em preparo', color: 'bg-warning text-warning-foreground', icon: ChefHat },
      ready: { label: 'Pronto', color: 'bg-success text-success-foreground', icon: CheckCircle },
      completed: { label: 'Finalizado', color: 'bg-muted text-muted-foreground', icon: CheckCircle },
      cancelled: { label: 'Cancelado', color: 'bg-destructive text-destructive-foreground', icon: Clock },
    };
    return info[status];
  };

  const getOrderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      counter: 'Balcão',
      table: 'Mesa',
      delivery: 'Delivery',
    };
    return labels[type] || type;
  };

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(o => o.status === statusFilter);

  const statusCounts = {
    all: orders.length,
    open: orders.filter(o => o.status === 'open').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    completed: orders.filter(o => o.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground">Gerencie os pedidos do dia</p>
        </div>
        <Button
          size="lg"
          className="gradient-primary btn-bounce shadow-glow"
          onClick={() => navigate('/orders/new')}
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Pedido
        </Button>
      </div>

      {/* Status Filter */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="flex-wrap h-auto p-1">
          <TabsTrigger value="all" className="gap-2">
            Todos
            <Badge variant="secondary">{statusCounts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="open" className="gap-2">
            Abertos
            <Badge variant="secondary">{statusCounts.open}</Badge>
          </TabsTrigger>
          <TabsTrigger value="preparing" className="gap-2">
            Em preparo
            <Badge variant="secondary">{statusCounts.preparing}</Badge>
          </TabsTrigger>
          <TabsTrigger value="ready" className="gap-2">
            Prontos
            <Badge variant="secondary">{statusCounts.ready}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            Finalizados
            <Badge variant="secondary">{statusCounts.completed}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum pedido encontrado</p>
            <Button
              variant="link"
              className="mt-2"
              onClick={() => navigate('/orders/new')}
            >
              Criar primeiro pedido
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredOrders.map((order) => {
            const statusInfo = getStatusInfo(order.status);
            const StatusIcon = statusInfo.icon;

            return (
              <Card
                key={order.id}
                className="card-hover cursor-pointer"
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
                        <span className="font-bold text-primary-foreground">
                          #{order.order_number}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold">{getOrderTypeLabel(order.order_type)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {order.customer_name && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {order.customer_name}
                    </p>
                  )}

                  {order.employees?.name && (
                    <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary/50" />
                      {order.employees.name}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">{formatCurrency(Number(order.total))}</span>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusInfo.label}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

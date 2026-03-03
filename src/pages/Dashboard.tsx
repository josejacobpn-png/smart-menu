import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  ShoppingBag, 
  Clock, 
  TrendingUp,
  Plus,
  ChefHat,
  CreditCard
} from 'lucide-react';

interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  pendingOrders: number;
  averageTicket: number;
}

export default function Dashboard() {
  const { restaurant, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalOrders: 0,
    pendingOrders: 0,
    averageTicket: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (restaurant?.id) {
      fetchDashboardData();
    }
  }, [restaurant?.id]);

  const fetchDashboardData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch today's orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant!.id)
        .gte('created_at', today.toISOString());

      if (error) throw error;

      const completedOrders = orders?.filter(o => o.status === 'completed') || [];
      const pendingOrders = orders?.filter(o => ['open', 'preparing', 'ready'].includes(o.status)) || [];
      
      const totalSales = completedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const averageTicket = completedOrders.length > 0 ? totalSales / completedOrders.length : 0;

      setStats({
        totalSales,
        totalOrders: orders?.length || 0,
        pendingOrders: pendingOrders.length,
        averageTicket,
      });

      // Fetch recent orders
      const { data: recent } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant!.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentOrders(recent || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: 'Aberto',
      preparing: 'Em preparo',
      ready: 'Pronto',
      completed: 'Finalizado',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-info text-info-foreground',
      preparing: 'bg-warning text-warning-foreground',
      ready: 'bg-success text-success-foreground',
      completed: 'bg-muted text-muted-foreground',
      cancelled: 'bg-destructive text-destructive-foreground',
    };
    return colors[status] || 'bg-muted';
  };

  const statCards = [
    { 
      title: 'Vendas do Dia', 
      value: formatCurrency(stats.totalSales), 
      icon: DollarSign,
      color: 'gradient-primary',
      textColor: 'text-primary-foreground',
    },
    { 
      title: 'Total de Pedidos', 
      value: stats.totalOrders.toString(), 
      icon: ShoppingBag,
      color: 'bg-info',
      textColor: 'text-info-foreground',
    },
    { 
      title: 'Pedidos Pendentes', 
      value: stats.pendingOrders.toString(), 
      icon: Clock,
      color: 'bg-warning',
      textColor: 'text-warning-foreground',
    },
    { 
      title: 'Ticket Médio', 
      value: formatCurrency(stats.averageTicket), 
      icon: TrendingUp,
      color: 'bg-success',
      textColor: 'text-success-foreground',
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              Olá, {profile?.full_name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Bem-vindo ao painel do {restaurant?.name}
            </p>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <Card key={index} className="card-hover overflow-hidden">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-xl lg:text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.color}`}>
                    <stat.icon className={`h-5 w-5 lg:h-6 lg:w-6 ${stat.textColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions & Recent Orders */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start h-14 text-left"
                onClick={() => navigate('/orders/new')}
              >
                <Plus className="h-5 w-5 mr-3 text-primary" />
                <div>
                  <p className="font-medium">Novo Pedido</p>
                  <p className="text-xs text-muted-foreground">Criar um pedido</p>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start h-14 text-left"
                onClick={() => navigate('/kitchen')}
              >
                <ChefHat className="h-5 w-5 mr-3 text-warning" />
                <div>
                  <p className="font-medium">Ver Cozinha</p>
                  <p className="text-xs text-muted-foreground">Pedidos em preparo</p>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start h-14 text-left"
                onClick={() => navigate('/cashier')}
              >
                <CreditCard className="h-5 w-5 mr-3 text-success" />
                <div>
                  <p className="font-medium">Abrir Caixa</p>
                  <p className="text-xs text-muted-foreground">Fechar pedidos</p>
                </div>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Pedidos Recentes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/orders')}>
                Ver todos
              </Button>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum pedido ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div 
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-semibold text-primary">#{order.order_number}</span>
                        </div>
                        <div>
                          <p className="font-medium">
                            {order.order_type === 'table' ? `Mesa` : 
                             order.order_type === 'counter' ? 'Balcão' : 'Delivery'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{formatCurrency(Number(order.total))}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Calendar,
  Package,
  CreditCard,
  Banknote,
  Smartphone,
  Printer
} from 'lucide-react';

interface DailyStats {
  totalSales: number;
  totalOrders: number;
  averageTicket: number;
  completedOrders: number;
  cancelledOrders: number;
}

interface PaymentStats {
  cash: number;
  pix: number;
  credit_card: number;
  debit_card: number;
}

interface ProductSales {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
}

interface FilterData {
  id: string;
  name: string;
}

export default function Reports() {
  const { restaurant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    totalSales: 0,
    totalOrders: 0,
    averageTicket: 0,
    completedOrders: 0,
    cancelledOrders: 0,
  });
  const [paymentStats, setPaymentStats] = useState<PaymentStats>({
    cash: 0,
    pix: 0,
    credit_card: 0,
    debit_card: 0,
  });
  const [topProducts, setTopProducts] = useState<ProductSales[]>([]);

  // Filters
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');

  const [employees, setEmployees] = useState<FilterData[]>([]);
  const [products, setProducts] = useState<FilterData[]>([]);

  useEffect(() => {
    if (restaurant?.id) {
      fetchFilters();
    }
  }, [restaurant?.id]);

  useEffect(() => {
    if (restaurant?.id) {
      fetchReports();
    }
  }, [restaurant?.id, startDate, endDate, selectedEmployee, selectedProduct]);

  const fetchFilters = async () => {
    const [empRes, prodRes] = await Promise.all([
      (supabase as any).from('employees').select('id, name').eq('restaurant_id', restaurant!.id),
      (supabase as any).from('products').select('id, name').eq('restaurant_id', restaurant!.id)
    ]);

    if (empRes.data) setEmployees(empRes.data as any);
    if (prodRes.data) setProducts(prodRes.data as any);
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      // 1. Build Orders Query
      let query = supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant!.id)
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`);

      if (selectedEmployee !== 'all') {
        query = query.eq('employee_id', selectedEmployee);
      }

      const { data: orders } = await query;
      let filteredOrders = orders || [];
      const orderIds = filteredOrders.map(o => o.id);

      // 2. Build Items Query (needed for Product Filter & Drill-down)
      let itemsQuery = supabase
        .from('order_items')
        .select('*, product:products(name)')
        .in('order_id', orderIds.length > 0 ? orderIds : ['00000000-0000-0000-0000-000000000000']);

      if (selectedProduct !== 'all') {
        itemsQuery = itemsQuery.eq('product_id', selectedProduct);
      }

      const { data: orderItemsRaw } = await itemsQuery;

      const orderItems = orderItemsRaw?.map(item => ({
        ...item,
        product_name: item.product?.name || item.product_name // Fallback or join result
      })) || [];

      // 3. Apply Product Filter logic
      // If product is selected, we only consider orders that HAVE this product.
      // And we strictly calculate totals based on the ITEMS of that product.
      if (selectedProduct !== 'all') {
        // Filter orders to only those present in orderItems result
        const validOrderIds = new Set(orderItems.map(i => i.order_id));
        filteredOrders = filteredOrders.filter(o => validOrderIds.has(o.id));
      }

      const completedOrders = filteredOrders.filter(o => o.status === 'completed');
      const cancelledOrders = filteredOrders.filter(o => o.status === 'cancelled');

      // Calculate Total Sales
      // If filtering by product -> Sum of item prices
      // If NOT filtering by product -> Sum of order totals
      let totalSales = 0;
      if (selectedProduct !== 'all') {
        totalSales = orderItems.reduce((acc, item) => {
          // Only count items from completed orders
          const parentOrder = completedOrders.find(o => o.id === item.order_id);
          return parentOrder ? acc + Number(item.total_price) : acc;
        }, 0);
      } else {
        totalSales = completedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      }

      setDailyStats({
        totalSales,
        totalOrders: filteredOrders.length,
        averageTicket: completedOrders.length > 0 ? totalSales / completedOrders.length : 0,
        completedOrders: completedOrders.length,
        cancelledOrders: cancelledOrders.length,
      });

      // Fetch payments (Only meaningful if NOT filtering by product, or we accept approximation)
      // When filtering by product, "Payment Method" breakdown is hard because payments are per order.
      // We will hide or show a warning for payments when product filtered. 
      // For now, let's just show payments for the filtered orders, but be aware it's the WHOLE order amount.
      const { data: payments } = await supabase
        .from('payments')
        .select('payment_method, amount')
        .eq('restaurant_id', restaurant!.id)
        .in('order_id', completedOrders.map(o => o.id)); // Only payments for visible orders

      const paymentTotals: PaymentStats = {
        cash: 0,
        pix: 0,
        credit_card: 0,
        debit_card: 0,
      };

      payments?.forEach(p => {
        if (p.payment_method in paymentTotals) {
          paymentTotals[p.payment_method as keyof PaymentStats] += Number(p.amount);
        }
      });

      setPaymentStats(paymentTotals);

      // Top Products Logic
      // If filtered by product, this will just show that product.
      const productMap = new Map<string, { quantity: number; revenue: number }>();

      // If selectedProduct is 'all', we need to fetch ALL items for the filtered orders to show top products correctly
      // But we already fetched orderItems based on the filter.
      // If selectedProduct is SET, orderItems only contains that product.
      // If selectedProduct is 'all', orderItems contains ALL items for those orders.
      // So orderItems is already the correct source!

      orderItems.forEach(item => {
        // Only count items from completed orders
        const isCompleted = completedOrders.some(o => o.id === item.order_id);
        if (!isCompleted) return;

        const existing = productMap.get(item.product_name) || { quantity: 0, revenue: 0 };
        productMap.set(item.product_name, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + Number(item.total_price),
        });
      });

      const sortedProducts = Array.from(productMap.entries())
        .map(([name, data]) => ({
          product_name: name,
          total_quantity: data.quantity,
          total_revenue: data.revenue,
        }))
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, 10);

      setTopProducts(sortedProducts);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'today': return 'Hoje';
      case 'week': return 'Últimos 7 dias';
      case 'month': return 'Último mês';
    }
  };

  const paymentMethodLabels: Record<string, { label: string; icon: React.ComponentType<any> }> = {
    cash: { label: 'Dinheiro', icon: Banknote },
    pix: { label: 'PIX', icon: Smartphone },
    credit_card: { label: 'Crédito', icon: CreditCard },
    debit_card: { label: 'Débito', icon: CreditCard },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Relatórios</h1>
            <p className="text-muted-foreground">Filtros avançados</p>
          </div>
        </div>

        <div className="no-print">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Data Inicial</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Data Final</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Funcionário</label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Produto</label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {products.map(prod => (
                    <SelectItem key={prod.id} value={prod.id}>{prod.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Faturamento</p>
                <p className="text-xl lg:text-2xl font-bold">{formatCurrency(dailyStats.totalSales)}</p>
              </div>
              <div className="p-3 gradient-primary rounded-xl">
                <DollarSign className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pedidos</p>
                <p className="text-xl lg:text-2xl font-bold">{dailyStats.totalOrders}</p>
              </div>
              <div className="p-3 bg-info rounded-xl">
                <ShoppingBag className="h-5 w-5 text-info-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-xl lg:text-2xl font-bold">{formatCurrency(dailyStats.averageTicket)}</p>
              </div>
              <div className="p-3 bg-success rounded-xl">
                <TrendingUp className="h-5 w-5 text-success-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Finalizados</p>
                <p className="text-xl lg:text-2xl font-bold">{dailyStats.completedOrders}</p>
                {dailyStats.cancelledOrders > 0 && (
                  <p className="text-xs text-destructive">{dailyStats.cancelledOrders} cancelados</p>
                )}
              </div>
              <div className="p-3 bg-muted rounded-xl">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vendas por Forma de Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(paymentStats).map(([method, amount]) => {
              const { label, icon: Icon } = paymentMethodLabels[method];
              const percentage = dailyStats.totalSales > 0
                ? (amount / dailyStats.totalSales) * 100
                : 0;

              return (
                <div key={method} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{label}</span>
                    </div>
                    <span className="font-bold">{formatCurrency(amount)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full gradient-primary rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma venda no período</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div
                    key={product.product_name}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${index === 0 ? 'bg-warning text-warning-foreground' :
                        index === 1 ? 'bg-muted-foreground/20 text-foreground' :
                          index === 2 ? 'bg-orange-400/20 text-orange-600' :
                            'bg-muted text-muted-foreground'
                        }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{product.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.total_quantity} vendidos
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-primary">
                      {formatCurrency(product.total_revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

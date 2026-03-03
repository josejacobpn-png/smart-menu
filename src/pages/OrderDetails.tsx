import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Plus, Minus, Trash2, ShoppingCart, Clock, ChefHat,
  CheckCircle, Package, XCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Printer } from 'lucide-react';
import { OrderTicket } from '@/components/cashier/OrderTicket';
import { Order as CashierOrder } from '@/types/cashier';

type OrderStatus = 'open' | 'preparing' | 'ready' | 'completed' | 'cancelled';

interface Order {
  id: string;
  order_number: number;
  order_type: 'counter' | 'table' | 'delivery';
  status: OrderStatus;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  notes: string | null;
  subtotal: number | null;
  discount: number | null;
  delivery_fee: number | null;
  couvert: number | null;
  service_fee: number | null;
  total: number | null;
  created_at: string;
  table_id: string | null;
  table_number?: number;
}

interface OrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  category_name?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
}

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const { restaurant } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAddItemsOpen, setIsAddItemsOpen] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [printingOrder, setPrintingOrder] = useState<{ order: any, type: 'kitchen' | 'bar' | 'customer' } | null>(null);

  useEffect(() => {
    if (printingOrder) {
      const timer = setTimeout(() => {
        window.print();
        setPrintingOrder(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printingOrder]);

  useEffect(() => {
    if (restaurant?.id && id) {
      fetchOrderData();
    }
  }, [restaurant?.id, id]);

  const fetchOrderData = async () => {
    try {
      const [orderRes, itemsRes, productsRes, categoriesRes] = await Promise.all([
        supabase
          .from('orders')
          .select(`
            *,
            table:restaurant_tables (
              number
            )
          `)
          .eq('id', id!)
          .eq('restaurant_id', restaurant!.id)
          .maybeSingle(),
        supabase
          .from('order_items')
          .select(`
            *,
            product:products (
              category:categories (
                name,
                send_to_kitchen
              )
            )
          `)
          .eq('order_id', id!)
          .order('created_at'),
        supabase
          .from('products')
          .select('*')
          .eq('restaurant_id', restaurant!.id)
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('categories')
          .select('*')
          .eq('restaurant_id', restaurant!.id)
          .order('sort_order'),
      ]);

      if (orderRes.error) throw orderRes.error;
      if (!orderRes.data) {
        toast({ title: 'Pedido não encontrado', variant: 'destructive' });
        navigate('/orders');
        return;
      }

      setOrder({
        ...orderRes.data,
        table_number: (orderRes.data as any).table?.number
      });

      const mappedItems: OrderItem[] = itemsRes.data?.map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        notes: item.notes,
        category_name: item.product?.category?.name,
        category_send_to_kitchen: item.product?.category?.send_to_kitchen
      })) || [];

      setOrderItems(mappedItems);
      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast({ title: 'Erro ao carregar pedido', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusInfo = (status: OrderStatus) => {
    const info: Record<OrderStatus, { label: string; color: string; icon: React.ComponentType<any> }> = {
      open: { label: 'Aberto', color: 'bg-info text-info-foreground', icon: Clock },
      preparing: { label: 'Em preparo', color: 'bg-warning text-warning-foreground', icon: ChefHat },
      ready: { label: 'Pronto', color: 'bg-success text-success-foreground', icon: CheckCircle },
      completed: { label: 'Finalizado', color: 'bg-muted text-muted-foreground', icon: Package },
      cancelled: { label: 'Cancelado', color: 'bg-destructive text-destructive-foreground', icon: XCircle },
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

  // Cart functions
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, notes: '' }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const updateItemNotes = (productId: string, notes: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, notes } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category_id === selectedCategory)
    : products;

  const addItemsToOrder = async () => {
    if (cart.length === 0) {
      toast({ title: 'Adicione itens ao carrinho', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const newItems = cart.map((item) => ({
        order_id: id!,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.product.price * item.quantity,
        notes: item.notes || null,
        restaurant_id: restaurant!.id,
      }));

      const { error } = await supabase
        .from('order_items')
        .insert(newItems);

      if (error) throw error;

      // Calculate prices
      const itemsTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const currentSubtotal = Number(order?.subtotal) || 0;
      const currentTotal = Number(order?.total) || 0;

      const newSubtotal = currentSubtotal + itemsTotal;
      const newTotal = currentTotal + itemsTotal;

      // Update order with new totals and timestamp
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          subtotal: newSubtotal,
          total: newTotal,
          updated_at: new Date().toISOString()
        })
        .eq('id', id!);

      if (updateError) throw updateError;

      toast({ title: 'Itens adicionados com sucesso!' });
      setCart([]);
      setIsAddItemsOpen(false);

      // Refresh order data
      fetchOrderData();
    } catch (error) {
      console.error('Error adding items:', error);
      toast({ title: 'Erro ao adicionar itens', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updateOrderStatus = async (newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', id!);

      if (error) throw error;

      setOrder((prev) => prev ? { ...prev, status: newStatus } : null);
      toast({ title: `Status atualizado para: ${getStatusInfo(newStatus).label}` });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    }
  };

  const removeOrderItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('order_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({ title: 'Item removido' });
      fetchOrderData();
    } catch (error) {
      console.error('Error removing item:', error);
      toast({ title: 'Erro ao remover item', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </MainLayout>
    );
  }

  if (!order) {
    return null;
  }

  const statusInfo = getStatusInfo(order.status);
  const StatusIcon = statusInfo.icon;
  const canModify = order.status === 'open' || order.status === 'preparing';

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl lg:text-3xl font-bold">
                Pedido #{order.order_number}
              </h1>
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                <StatusIcon className="h-4 w-4" />
                {statusInfo.label}
              </div>
            </div>
            <p className="text-muted-foreground">
              {getOrderTypeLabel(order.order_type)} • {new Date(order.created_at).toLocaleString('pt-BR')}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setPrintingOrder({ order: { ...order, items: orderItems }, type: 'kitchen' })}>
                Cozinha
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPrintingOrder({ order: { ...order, items: orderItems }, type: 'bar' })}>
                Bar / Copa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPrintingOrder({ order: { ...order, items: orderItems }, type: 'customer' })}>
                Cliente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Order Info & Items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Customer Info */}
            {(order.customer_name || order.customer_phone || order.delivery_address) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações do Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {order.customer_name && (
                    <p><span className="text-muted-foreground">Nome:</span> {order.customer_name}</p>
                  )}
                  {order.customer_phone && (
                    <p><span className="text-muted-foreground">Telefone:</span> {order.customer_phone}</p>
                  )}
                  {order.delivery_address && (
                    <p><span className="text-muted-foreground">Endereço:</span> {order.delivery_address}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Order Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Itens do Pedido</CardTitle>
                {canModify && (
                  <Dialog open={isAddItemsOpen} onOpenChange={setIsAddItemsOpen}>
                    <DialogTrigger asChild>
                      <Button className="gradient-primary">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Itens
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Adicionar Itens ao Pedido</DialogTitle>
                      </DialogHeader>

                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        {/* Products */}
                        <div className="space-y-4">
                          {/* Categories */}
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            <Button
                              variant={selectedCategory === null ? 'default' : 'outline'}
                              onClick={() => setSelectedCategory(null)}
                              size="sm"
                            >
                              Todos
                            </Button>
                            {categories.map((cat) => (
                              <Button
                                key={cat.id}
                                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                                onClick={() => setSelectedCategory(cat.id)}
                                size="sm"
                              >
                                {cat.name}
                              </Button>
                            ))}
                          </div>

                          {/* Products Grid */}
                          <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                            {filteredProducts.map((product) => (
                              <Card
                                key={product.id}
                                className="cursor-pointer hover:border-primary transition-colors"
                                onClick={() => addToCart(product)}
                              >
                                <CardContent className="p-3">
                                  <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                                  <p className="text-primary font-bold text-sm mt-1">
                                    {formatCurrency(product.price)}
                                  </p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>

                        {/* Cart */}
                        <div className="border rounded-lg p-4">
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            Novos Itens
                            {cart.length > 0 && <Badge>{cart.length}</Badge>}
                          </h3>

                          {cart.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">
                              Clique nos produtos para adicionar
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {cart.map((item) => (
                                <div key={item.product.id} className="border rounded p-2 space-y-2">
                                  <div className="flex items-start justify-between">
                                    <p className="font-medium text-sm">{item.product.name}</p>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-destructive"
                                      onClick={() => removeFromCart(item.product.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => updateQuantity(item.product.id, -1)}
                                      >
                                        <Minus className="h-3 w-3" />
                                      </Button>
                                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => updateQuantity(item.product.id, 1)}
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <span className="font-bold text-sm">
                                      {formatCurrency(item.product.price * item.quantity)}
                                    </span>
                                  </div>
                                  <Input
                                    placeholder="Observações"
                                    value={item.notes}
                                    onChange={(e) => updateItemNotes(item.product.id, e.target.value)}
                                    className="h-8 text-xs"
                                  />
                                </div>
                              ))}

                              <div className="border-t pt-3 mt-3">
                                <div className="flex justify-between font-bold">
                                  <span>Total:</span>
                                  <span className="text-primary">{formatCurrency(cartTotal)}</span>
                                </div>
                              </div>

                              <Button
                                className="w-full gradient-primary"
                                onClick={addItemsToOrder}
                                disabled={saving}
                              >
                                {saving ? 'Adicionando...' : 'Confirmar Itens'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {orderItems.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum item no pedido
                  </p>
                ) : (
                  <div className="space-y-3">
                    {orderItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.quantity}x</span>
                            <span>{item.product_name}</span>
                          </div>
                          {item.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Obs: {item.notes}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(item.unit_price)} cada
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold">{formatCurrency(item.total_price)}</span>
                          {canModify && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeOrderItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {order.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{order.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Summary & Actions */}
          <div className="space-y-4">
            {/* Total */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(Number(order.subtotal) || 0)}</span>
                </div>
                {Number(order.discount) > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Desconto</span>
                    <span>-{formatCurrency(Number(order.discount))}</span>
                  </div>
                )}
                {Number(order.delivery_fee) > 0 && (
                  <div className="flex justify-between">
                    <span>Taxa de Entrega</span>
                    <span>{formatCurrency(Number(order.delivery_fee))}</span>
                  </div>
                )}
                {Number(order.couvert) > 0 && (
                  <div className="flex justify-between">
                    <span>Couvert</span>
                    <span>{formatCurrency(Number(order.couvert))}</span>
                  </div>
                )}
                {Number(order.service_fee) > 0 && (
                  <div className="flex justify-between">
                    <span>Taxa de Serviço</span>
                    <span>{formatCurrency(Number(order.service_fee))}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(Number(order.total) || 0)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Status Control */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alterar Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={order.status}
                  onValueChange={(value) => updateOrderStatus(value as OrderStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Aberto</SelectItem>
                    <SelectItem value="preparing">Em preparo</SelectItem>
                    <SelectItem value="ready">Pronto</SelectItem>
                    <SelectItem value="completed">Finalizado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="space-y-2">
              {order.status === 'open' && (
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => updateOrderStatus('preparing')}
                >
                  <ChefHat className="h-4 w-4 mr-2" />
                  Enviar para Cozinha
                </Button>
              )}
              {order.status === 'preparing' && (
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => updateOrderStatus('ready')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Marcar como Pronto
                </Button>
              )}
              {order.status === 'ready' && (
                <Button
                  className="w-full gradient-primary"
                  onClick={() => navigate(`/cashier?order=${order.id}`)}
                >
                  Ir para Pagamento
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Print Component */}
      {printingOrder && (
        <OrderTicket
          order={printingOrder.order as CashierOrder}
          type={printingOrder.type}
          restaurantName={restaurant?.name}
        />
      )}
    </MainLayout>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingCart, Users } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  is_active: boolean;
  is_combo: boolean;
  track_stock?: boolean;
  stock_quantity?: number;
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

interface Table {
  id: string;
  number: number;
  status: 'free' | 'occupied';
}

interface Employee {
  id: string;
  name: string;
}

export default function NewOrder() {
  const { restaurant, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [orderType, setOrderType] = useState<'counter' | 'table' | 'delivery'>('counter');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (restaurant?.id) {
      fetchData();
    }
  }, [restaurant?.id]);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes, tablesRes, employeesRes] = await Promise.all([
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
        supabase
          .from('restaurant_tables')
          .select('*')
          .eq('restaurant_id', restaurant!.id)
          .order('number'),
        supabase
          .from('employees')
          .select('id, name')
          .eq('restaurant_id', restaurant!.id)
          .eq('active', true)
          .order('name'),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (tablesRes.error) throw tablesRes.error;
      if (employeesRes.error) throw employeesRes.error;

      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
      setTables(tablesRes.data || []);
      setEmployees(employeesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

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
      if (product.track_stock && (product.stock_quantity || 0) <= 0) {
        toast({
          title: "Atenção: Produto sem estoque!",
          description: `O produto "${product.name}" está com estoque zerado ou negativo.`,
          variant: "destructive",
        });
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category_id === selectedCategory)
    : products;

  const saveOrder = async () => {
    if (cart.length === 0) {
      toast({ title: 'Adicione itens ao pedido', variant: 'destructive' });
      return;
    }

    if (orderType === 'table' && !selectedTable) {
      toast({ title: 'Selecione uma mesa', variant: 'destructive' });
      return;
    }

    if (orderType === 'table' && !selectedEmployee) {
      toast({ title: 'Selecione um funcionário/garçom', variant: 'destructive' });
      return;
    }

    if (orderType === 'delivery' && !deliveryAddress) {
      toast({ title: 'Informe o endereço de entrega', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurant!.id,
          order_type: orderType,
          table_id: orderType === 'table' ? selectedTable : null,
          employee_id: orderType === 'table' ? selectedEmployee : null,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          delivery_address: orderType === 'delivery' ? deliveryAddress : null,
          notes: orderNotes || null,
          subtotal: cartTotal,
          total: cartTotal,
          created_by: user!.id,
          status: 'open',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map((item) => ({
        order_id: orderData.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.product.price * item.quantity,
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update table status if table order
      if (orderType === 'table' && selectedTable) {
        await supabase
          .from('restaurant_tables')
          .update({ status: 'occupied' })
          .eq('id', selectedTable);
      }

      toast({ title: 'Pedido criado com sucesso!' });
      navigate('/orders');
    } catch (error) {
      console.error('Error saving order:', error);
      toast({ title: 'Erro ao criar pedido', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-40 lg:pb-0">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Novo Pedido</h1>
          <p className="text-muted-foreground">Adicione itens ao pedido</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-4 min-w-0 overflow-hidden lg:overflow-visible">
          {/* Order Type */}
          <Card>
            <CardContent className="p-4">
              <Tabs value={orderType} onValueChange={(v) => setOrderType(v as typeof orderType)}>
                <div className="w-full overflow-hidden">
                  <TabsList className="flex w-full overflow-x-auto scrollbar-hide">
                    <TabsTrigger value="counter" className="flex-1 min-w-[80px]">Balcão</TabsTrigger>
                    <TabsTrigger value="table" className="flex-1 min-w-[80px]">Mesa</TabsTrigger>
                    <TabsTrigger value="delivery" className="flex-1 min-w-[80px]">Delivery</TabsTrigger>
                  </TabsList>
                </div>
              </Tabs>

              {orderType === 'table' && (
                <div className="mt-4">
                  <Label>Selecione a mesa</Label>
                  <Select value={selectedTable} onValueChange={setSelectedTable}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha uma mesa" />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.filter(t => t.status === 'free').map((table) => (
                        <SelectItem key={table.id} value={table.id}>
                          Mesa {table.number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {orderType === 'table' && (
                <div className="mt-4">
                  <Label>Atendente / Garçom</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o atendente" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {orderType === 'delivery' && (
                <div className="mt-4 space-y-3">
                  <div>
                    <Label>Nome do cliente</Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nome do cliente"
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <Label>Endereço de entrega</Label>
                    <Textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Endereço completo"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Categories */}
          <div className="w-full overflow-hidden">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Button
                variant={selectedCategory === null ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(null)}
                className="flex-shrink-0"
              >
                Todos
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="flex-shrink-0"
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="card-hover cursor-pointer"
                onClick={() => addToCart(product)}
              >
                <CardContent className="p-3">
                  <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
                  <p className="text-primary font-bold mt-2">
                    {formatCurrency(product.price)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Carrinho
                {cart.length > 0 && (
                  <Badge variant="secondary">{cart.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Carrinho vazio
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.product.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(item.product.price)} cada
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.product.id, -1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.product.id, 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="font-bold">
                            {formatCurrency(item.product.price * item.quantity)}
                          </p>
                        </div>

                        <Input
                          placeholder="Observações (ex: sem cebola)"
                          value={item.notes}
                          onChange={(e) => updateItemNotes(item.product.id, e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <Label>Observações do pedido</Label>
                    <Textarea
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Observações gerais"
                      className="mt-1"
                    />
                  </div>

                </div>
              )}

              <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-background border-t shadow-[0_-4px_10px_rgba(0,0,0,0.1)] z-50 lg:static lg:p-0 lg:pb-0 lg:bg-transparent lg:border-none lg:shadow-none lg:z-auto">
                <div className="flex items-center justify-between text-lg font-bold mb-3 lg:pt-4 lg:border-t">
                  <span>Total {cart.length > 0 && `(${cart.length} itens)`}</span>
                  <span className="text-primary">{formatCurrency(cartTotal)}</span>
                </div>

                <Button
                  className="w-full gradient-primary btn-bounce"
                  size="lg"
                  onClick={saveOrder}
                  disabled={saving || cart.length === 0}
                >
                  {saving ? 'Salvando...' : 'Confirmar Pedido'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

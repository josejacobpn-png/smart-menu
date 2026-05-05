import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Heart, Plus, Minus, Trash2, MapPin, Store, ArrowLeft, Loader2, CheckCircle2, UtensilsCrossed } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  sort_order: number;
}

interface Product {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
}

export default function PublicMenu() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckout, setIsCheckout] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  
  // Checkout Form State
  const [orderType, setOrderType] = useState<'delivery' | 'counter'>('delivery');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  useEffect(() => {
    fetchMenuData();
  }, [slug]);

  const fetchMenuData = async () => {
    try {
      setLoading(true);
      // 1. Fetch restaurant
      const { data: restData, error: restError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .single();
        
      if (restError || !restData) {
        throw new Error('Restaurante não encontrado');
      }
      setRestaurant(restData);

      // 2. Fetch categories
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restData.id)
        .order('sort_order', { ascending: true });
        
      if (catData) setCategories(catData);

      // 3. Fetch products
      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', restData.id)
        .eq('is_active', true);
        
      if (prodData) setProducts(prodData);

    } catch (error: any) {
      toast({
        title: "Erro ao carregar o cardápio",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, notes: '' }];
    });
    toast({
      title: "Adicionado ao carrinho",
      description: `${product.name} foi adicionado.`,
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQtd = item.quantity + delta;
        return newQtd > 0 ? { ...item, quantity: newQtd } : item;
      }
      return item;
    }));
  };

  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateNotes = (productId: string, notes: string) => {
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, notes } : item
    ));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      toast({
        title: "Endereço obrigatório",
        description: "Por favor, informe o endereço de entrega.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const orderItems = cart.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.product.price * item.quantity,
        notes: item.notes
      }));

      const { data, error } = await supabase.rpc('create_online_order', {
        p_restaurant_id: restaurant.id,
        p_customer_name: customerName,
        p_customer_phone: customerPhone,
        p_delivery_address: orderType === 'delivery' ? deliveryAddress : null,
        p_order_type: orderType,
        p_total: cartTotal,
        p_items: orderItems
      });

      if (error) throw error;

      setOrderSuccess(true);
      setCart([]);
      
    } catch (error: any) {
      toast({
        title: "Erro ao enviar pedido",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Store className="h-16 w-16 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">Restaurante não encontrado</h1>
          <p className="text-muted-foreground">Verifique se o link está correto.</p>
        </div>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center border-success/20">
          <CardContent className="pt-10 pb-8 px-6 space-y-6">
            <div className="mx-auto w-20 h-20 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Pedido Recebido!</h1>
              <p className="text-muted-foreground">
                Seu pedido foi enviado para o restaurante. 
                {orderType === 'delivery' 
                  ? " Em breve sairá para entrega." 
                  : " Vá até o balcão para retirar quando estiver pronto."}
              </p>
            </div>
            <Button 
              className="w-full gradient-primary btn-bounce" 
              onClick={() => {
                setOrderSuccess(false);
                setIsCheckout(false);
              }}
            >
              Fazer novo pedido
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isCheckout ? (
              <Button variant="ghost" size="icon" onClick={() => setIsCheckout(false)} className="rounded-full">
                <ArrowLeft className="h-5 w-5 text-[#1e1b4b]" />
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-sm">
                  <UtensilsCrossed className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-extrabold tracking-tight text-[#1e1b4b] uppercase">{restaurant.name}</h1>
              </div>
            )}
            {isCheckout && (
              <h1 className="text-xl font-bold truncate text-[#1e1b4b] uppercase">Finalizar Pedido</h1>
            )}
          </div>
          
          {!isCheckout && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-full text-gray-500 hover:text-red-500 hover:bg-red-50">
                <Heart className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                className="relative rounded-full text-gray-700 hover:bg-gray-100"
                onClick={() => setIsCheckout(true)}
              >
                <ShoppingBag className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <span className="absolute 0 right-0 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {cartItemCount > 9 ? '9+' : cartItemCount}
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 pt-6">
        {!isCheckout ? (
          /* Menu View */
          <div className="space-y-8">
            {/* Categories Grid (Top) */}
            {categories.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
                {categories.map(category => {
                  const hasProducts = products.some(p => p.category_id === category.id);
                  if (!hasProducts) return null;

                  return (
                    <Card 
                      key={`grid-${category.id}`} 
                      className="cursor-pointer bg-white hover:shadow-md transition-shadow border-gray-200 flex items-center justify-center py-6 px-2"
                      onClick={() => {
                        const el = document.getElementById(`category-${category.id}`);
                        if (el) {
                          const y = el.getBoundingClientRect().top + window.scrollY - 80;
                          window.scrollTo({ top: y, behavior: 'smooth' });
                        }
                      }}
                    >
                      <span className="font-extrabold text-[#1e1b4b] uppercase text-sm text-center tracking-wide">
                        {category.name}
                      </span>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Products by Category */}
            {categories.map(category => {
              const categoryProducts = products.filter(p => p.category_id === category.id);
              if (categoryProducts.length === 0) return null;

              return (
                <section key={category.id} id={`category-${category.id}`} className="space-y-0 bg-white">
                  {/* Category Header */}
                  <div className="bg-gray-50 py-3 px-4 w-full -mx-4 sm:mx-0 sm:w-auto">
                    <h2 className="text-lg font-bold uppercase text-[#f97316] tracking-wide">
                      {category.name}
                    </h2>
                  </div>
                  
                  <div className="flex flex-col">
                    {categoryProducts.map((product, index) => (
                      <div 
                        key={product.id} 
                        className={`flex flex-row items-center py-4 px-1 gap-4 ${
                          index !== categoryProducts.length - 1 ? 'border-b border-gray-100' : ''
                        }`}
                      >
                        {/* Product Info (Left) */}
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="font-extrabold text-[#1e1b4b] text-[15px] uppercase truncate">
                            {product.name}
                          </h3>
                          <div className="font-bold text-gray-500 text-sm mt-1">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                          </div>
                          {product.description && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-tight">
                              {product.description}
                            </p>
                          )}
                        </div>

                        {/* Product Actions & Image (Right) */}
                        <div className="flex items-center gap-3 shrink-0">
                          {product.image_url && (
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0 shadow-sm border border-gray-100">
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50"
                            >
                              <Heart className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              className="rounded-full h-8 w-8 bg-[#f97316] hover:bg-[#ea580c] text-white shadow-sm"
                              onClick={() => addToCart(product)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
            
            {products.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhum produto disponível no momento.</p>
              </div>
            )}
          </div>
        ) : (
          /* Checkout View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-4">Seu Pedido</h2>
                <div className="space-y-4">
                  {cart.map(item => (
                    <Card key={item.product.id} className="p-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between font-medium">
                            <span>{item.product.name}</span>
                            <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.product.price * item.quantity)}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.product.price)} cada
                          </p>
                          <div className="mt-3 flex items-center gap-4">
                            <div className="flex items-center gap-3 bg-muted rounded-full p-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => updateQuantity(item.product.id, -1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => updateQuantity(item.product.id, 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <Button variant="ghost" size="sm" className="text-destructive h-8 px-2" onClick={() => removeItem(item.product.id)}>
                              <Trash2 className="h-4 w-4 mr-1" /> Remover
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <Input 
                          placeholder="Observações (ex: sem cebola)" 
                          className="text-sm bg-background"
                          value={item.notes}
                          onChange={(e) => updateNotes(item.product.id, e.target.value)}
                        />
                      </div>
                    </Card>
                  ))}
                  
                  {cart.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Seu carrinho está vazio.</p>
                      <Button variant="link" onClick={() => setIsCheckout(false)} className="mt-2">
                        Voltar ao cardápio
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {cart.length > 0 && (
              <div>
                <Card className="sticky top-24 border-primary/20 shadow-glow">
                  <CardHeader className="bg-muted/50 border-b">
                    <CardTitle className="text-lg">Detalhes da Entrega</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <form onSubmit={handleSubmitOrder} className="space-y-6">
                      <div className="space-y-3">
                        <Label>Como deseja receber?</Label>
                        <RadioGroup 
                          value={orderType} 
                          onValueChange={(val: any) => setOrderType(val)}
                          className="grid grid-cols-2 gap-4"
                        >
                          <div>
                            <RadioGroupItem value="delivery" id="delivery" className="peer sr-only" />
                            <Label
                              htmlFor="delivery"
                              className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer"
                            >
                              <MapPin className="mb-2 h-6 w-6" />
                              Entrega
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem value="counter" id="counter" className="peer sr-only" />
                            <Label
                              htmlFor="counter"
                              className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer"
                            >
                              <Store className="mb-2 h-6 w-6" />
                              Retirada
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Seu Nome</Label>
                          <Input 
                            id="name" 
                            required 
                            placeholder="Como podemos te chamar?"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Telefone / WhatsApp</Label>
                          <Input 
                            id="phone" 
                            required 
                            placeholder="(00) 00000-0000"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                          />
                        </div>

                        {orderType === 'delivery' && (
                          <div className="space-y-2">
                            <Label htmlFor="address">Endereço de Entrega</Label>
                            <Textarea 
                              id="address" 
                              required 
                              placeholder="Rua, Número, Bairro, Ponto de Referência"
                              className="resize-none"
                              value={deliveryAddress}
                              onChange={(e) => setDeliveryAddress(e.target.value)}
                            />
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t space-y-4">
                        <div className="flex items-center justify-between font-bold text-xl">
                          <span>Total</span>
                          <span className="text-primary">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartTotal)}
                          </span>
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full gradient-primary btn-bounce h-12 text-lg"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            "Finalizar Pedido"
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Cart Button for mobile when not in checkout */}
      {!isCheckout && cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t md:hidden z-50">
          <Button 
            className="w-full gradient-primary shadow-glow btn-bounce h-12"
            onClick={() => setIsCheckout(true)}
          >
            <span className="flex-1 text-left font-bold">{cartItemCount} itens</span>
            <span className="flex-1 text-center flex justify-center"><ShoppingBag className="h-5 w-5" /></span>
            <span className="flex-1 text-right font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartTotal)}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}

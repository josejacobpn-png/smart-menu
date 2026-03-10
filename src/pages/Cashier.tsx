import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCashier } from '@/hooks/useCashier';
import { Order, PaymentMethod } from '@/types/cashier';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Banknote, Smartphone, DollarSign, X, Printer } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OrderTicket } from '@/components/cashier/OrderTicket';

export default function Cashier() {
  const { restaurant, hasRole } = useAuth();
  const { toast } = useToast();
  const {
    orders,
    loading,
    todaySales,
    processing,
    fetchOrders,
    processPayment,
    cancelOrder
  } = useCashier();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [discount, setDiscount] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [couvert, setCouvert] = useState('');
  const [serviceFee, setServiceFee] = useState('');
  const [printingOrder, setPrintingOrder] = useState<{ order: Order, type: 'kitchen' | 'bar' | 'customer' } | null>(null);

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
    if (restaurant?.id) {
      fetchOrders();
    }
  }, [restaurant?.id, fetchOrders]);

  const openPaymentDialog = (order: Order) => {
    setSelectedOrder(order);
    setPaymentMethod('cash');
    setReceivedAmount(order.total.toString());
    setDiscount('0');
    setDeliveryFee('0');
    setCouvert('0');
    setServiceFee('0');
    setPaymentDialogOpen(true);
  };

  const handlePayment = async () => {
    if (!selectedOrder) return;

    const discountValue = parseFloat(discount) || 0;
    const deliveryFeeValue = parseFloat(deliveryFee) || 0;
    const couvertValue = parseFloat(couvert) || 0;
    const serviceFeePercentage = parseFloat(serviceFee) || 0;
    const serviceFeeValue = (selectedOrder.total * serviceFeePercentage) / 100;

    // Calculate expected total for validation
    // We will treat selectedOrder.total as the base amount.
    const subtotal = selectedOrder.total;
    const finalTotal = Math.max(0, subtotal - discountValue + deliveryFeeValue + couvertValue + serviceFeeValue);

    const received = parseFloat(receivedAmount) || 0;

    if (paymentMethod === 'cash' && received < finalTotal) {
      toast({ title: 'Valor recebido insuficiente', variant: 'destructive' });
      return;
    }

    const success = await processPayment(
      selectedOrder.id,
      paymentMethod,
      received,
      discountValue,
      deliveryFeeValue,
      couvertValue,
      serviceFeeValue
    );

    if (success) {
      setPaymentDialogOpen(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!hasRole('admin')) {
      toast({ title: 'Apenas administradores podem cancelar pedidos', variant: 'destructive' });
      return;
    }

    if (!confirm('Tem certeza que deseja cancelar este pedido?')) return;

    await cancelOrder(orderId);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getOrderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      counter: 'Balcão',
      table: 'Mesa',
      delivery: 'Delivery',
    };
    return labels[type] || type;
  };

  const paymentMethods: { value: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'cash', label: 'Dinheiro', icon: Banknote },
    { value: 'pix', label: 'PIX', icon: Smartphone },
    { value: 'credit_card', label: 'Crédito', icon: CreditCard },
    { value: 'debit_card', label: 'Débito', icon: CreditCard },
  ];

  const currentDiscount = parseFloat(discount) || 0;
  const currentDeliveryFee = parseFloat(deliveryFee) || 0;
  const currentCouvert = parseFloat(couvert) || 0;
  const currentServiceFeePercentage = parseFloat(serviceFee) || 0;
  const currentServiceFeeValue = selectedOrder ? (selectedOrder.total * currentServiceFeePercentage / 100) : 0;

  const calculateFinalTotal = () => {
    if (!selectedOrder) return 0;
    return Math.max(0, selectedOrder.total - currentDiscount + currentDeliveryFee + currentCouvert + currentServiceFeeValue);
  };

  const finalTotal = calculateFinalTotal();

  const changeAmount = paymentMethod === 'cash' && selectedOrder
    ? Math.max(0, (parseFloat(receivedAmount) || 0) - finalTotal)
    : 0;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-success rounded-xl flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-success-foreground" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Caixa</h1>
              <p className="text-muted-foreground">Finalize os pedidos prontos</p>
            </div>
          </div>
          <Card className="bg-success/10 border-success">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-6 w-6 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Vendas do dia</p>
                  <p className="text-xl font-bold text-success">{formatCurrency(todaySales)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders */}
        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum pedido pronto para pagamento</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((order) => (
              <Card key={order.id} className="card-hover">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
                        <span className="font-bold text-primary-foreground">
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
                    <Badge className="bg-success text-success-foreground">Pronto</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span>{item.quantity}x {item.product_name}</span>
                        <span className="text-muted-foreground">{formatCurrency(item.total_price)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-3 flex items-center justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-xl font-bold text-primary">{formatCurrency(order.total)}</span>
                  </div>

                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Printer className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPrintingOrder({ order, type: 'kitchen' })}>
                          Cozinha
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPrintingOrder({ order, type: 'bar' })}>
                          Bar / Copa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPrintingOrder({ order, type: 'customer' })}>
                          Cliente
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      className="flex-1 gradient-primary btn-bounce"
                      onClick={() => openPaymentDialog(order)}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Receber
                    </Button>
                    {hasRole('admin') && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleCancelOrder(order.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pagamento - Pedido #{selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total a pagar</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(finalTotal)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Desconto</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="text-right"
                  />
                </div>
                <div>
                  <Label>Taxa de Entrega</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    className="text-right"
                  />
                </div>
                <div>
                  <Label>Couvert</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={couvert}
                    onChange={(e) => setCouvert(e.target.value)}
                    className="text-right"
                  />
                </div>
                <div>
                  <Label>Taxa Serviço (%)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={serviceFee}
                      onChange={(e) => setServiceFee(e.target.value)}
                      className="text-right pr-6"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                  </div>
                  {currentServiceFeeValue > 0 && (
                    <p className="text-xs text-muted-foreground text-right mt-1">
                      + {formatCurrency(currentServiceFeeValue)}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label>Forma de pagamento</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <Button
                        key={method.value}
                        variant={paymentMethod === method.value ? 'default' : 'outline'}
                        className={`h-16 flex-col gap-1 ${paymentMethod === method.value ? 'gradient-primary' : ''
                          }`}
                        onClick={() => setPaymentMethod(method.value)}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-sm">{method.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {paymentMethod === 'cash' && (
                <>
                  <div>
                    <Label>Valor recebido</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                      className="text-xl font-bold text-center"
                    />
                  </div>

                  {changeAmount > 0 && (
                    <div className="text-center p-3 bg-success/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Troco</p>
                      <p className="text-2xl font-bold text-success">
                        {formatCurrency(changeAmount)}
                      </p>
                    </div>
                  )}
                </>
              )}

              <Button
                className="w-full gradient-primary btn-bounce"
                size="lg"
                onClick={handlePayment}
                disabled={processing}
              >
                {processing ? 'Processando...' : 'Confirmar Pagamento'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden Print Component */}
      {printingOrder && (
        <OrderTicket
          order={printingOrder.order}
          type={printingOrder.type}
          restaurantName={restaurant?.name}
        />
      )}
    </>
  );
}

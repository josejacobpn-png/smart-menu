import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order, PaymentMethod } from '@/types/cashier';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useCashier() {
    const { restaurant, user } = useAuth();
    const { toast } = useToast();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [todaySales, setTodaySales] = useState(0);
    const [processing, setProcessing] = useState(false);

    const fetchOrders = useCallback(async () => {
        if (!restaurant?.id) return;

        try {
            setLoading(true);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Fetch ready orders
            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select(`
                    *,
                    table:restaurant_tables (
                        number
                    )
                `)
                .eq('restaurant_id', restaurant.id)
                .eq('status', 'ready')
                .gte('created_at', today.toISOString())
                .order('created_at', { ascending: true });

            if (ordersError) throw ordersError;

            // Fetch items for each order
            const ordersWithItems: Order[] = [];
            for (const order of ordersData || []) {
                const { data: items } = await supabase
                    .from('order_items')
                    .select(`
                        id, 
                        product_name, 
                        quantity, 
                        total_price,
                        product:products (
                            category:categories (
                                name,
                                send_to_kitchen
                            )
                        )
                    `)
                    .eq('order_id', order.id);

                const mappedItems = items?.map((item: any) => ({
                    id: item.id,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    total_price: item.total_price,
                    category_name: item.product?.category?.name,
                    category_send_to_kitchen: item.product?.category?.send_to_kitchen
                })) || [];

                ordersWithItems.push({
                    ...order,
                    items: mappedItems,
                    table_number: (order as any).table?.number
                });
            }

            setOrders(ordersWithItems);

            // Fetch today's completed payments
            const { data: paymentsData } = await supabase
                .from('payments')
                .select('amount')
                .eq('restaurant_id', restaurant.id)
                .gte('created_at', today.toISOString());

            const total = paymentsData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
            setTodaySales(total);

        } catch (error) {
            console.error('Error fetching data:', error);
            toast({ title: 'Erro ao carregar pedidos', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [restaurant?.id, toast]);

    const processPayment = async (
        orderId: string,
        method: PaymentMethod,
        receivedAmount: number,
        discount: number = 0,
        deliveryFee: number = 0,
        couvert: number = 0,
        serviceFee: number = 0
    ) => {
        if (!user) return;

        try {
            setProcessing(true);

            const { error } = await supabase.rpc('process_payment', {
                p_order_id: orderId,
                p_payment_method: method,
                p_received_amount: receivedAmount,
                p_discount: discount,
                p_delivery_fee: deliveryFee,
                p_couvert: couvert,
                p_service_fee: serviceFee
            });

            if (error) throw error;

            toast({ title: 'Pagamento registrado com sucesso!' });
            await fetchOrders();
            return true;
        } catch (error: any) {
            console.error('Error processing payment:', error);
            toast({
                title: 'Erro ao processar pagamento',
                description: error.message || 'Erro desconhecido',
                variant: 'destructive'
            });
            return false;
        } finally {
            setProcessing(false);
        }
    };

    const cancelOrder = async (orderId: string) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: 'cancelled' })
                .eq('id', orderId);

            if (error) throw error;

            toast({ title: 'Pedido cancelado' });
            await fetchOrders();
            return true;
        } catch (error) {
            console.error('Error cancelling order:', error);
            toast({ title: 'Erro ao cancelar pedido', variant: 'destructive' });
            return false;
        }
    };

    return {
        orders,
        loading,
        todaySales,
        processing,
        fetchOrders,
        processPayment,
        cancelOrder
    };
}

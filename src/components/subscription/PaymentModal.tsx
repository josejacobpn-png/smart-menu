import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog as UIDialog,
    DialogContent as UIDialogContent,
    DialogHeader as UIDialogHeader,
    DialogTitle as UIDialogTitle,
    DialogDescription as UIDialogDescription,
    DialogFooter as UIDialogFooter
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, Loader2, QrCode, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PaymentModal({ open, onOpenChange }: PaymentModalProps) {
    const { restaurant, refreshRestaurantData } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handlePayment = async () => {
        if (!restaurant) return;

        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-abacate-checkout', {
                body: { 
                    restaurantId: restaurant.id,
                    returnUrl: window.location.href,
                    completionUrl: `${window.location.origin}/dashboard?payment=success`
                }
            });

            if (error) throw error;
            if (data?.url) {
                // Redireciona o usuário para o checkout do Abacate Pay
                window.location.href = data.url;
            } else {
                throw new Error("URL de checkout não recebida");
            }
        } catch (error) {
            console.error("Erro ao iniciar pagamento:", error);
            toast({
                title: "Erro ao iniciar pagamento",
                description: "Não foi possível gerar a cobrança. Tente novamente mais tarde.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <UIDialog open={open} onOpenChange={onOpenChange}>
            <UIDialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl bg-white">
                <div className="max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <UIDialogHeader className="p-8 pb-4">
                        <UIDialogTitle className="flex items-center gap-4 text-3xl font-extrabold tracking-tight text-slate-900">
                            <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shadow-lg transform -rotate-2">
                                <QrCode className="h-7 w-7 text-white" />
                            </div>
                            Smart Menu Pro
                        </UIDialogTitle>
                        <UIDialogDescription className="text-slate-500 text-base leading-relaxed pt-2">
                            Assine e libere todos os recursos para seu restaurante.
                        </UIDialogDescription>
                    </UIDialogHeader>

                    <div className="p-8 pt-4 space-y-8">
                        {/* Plan Details Card */}
                        <div className="relative overflow-hidden p-6 rounded-[2rem] bg-slate-50 border-2 border-slate-100 group transition-all hover:border-primary/20">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                                <Check className="h-24 w-24 text-slate-900" />
                            </div>
                            
                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-primary/10 text-primary border-none font-bold uppercase tracking-wider px-3 py-1 text-[10px]">RECOMENDADO</Badge>
                                </div>
                                
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Plano Mensal</h3>
                                    <div className="flex items-baseline gap-1 mt-1">
                                        <span className="text-3xl font-black text-slate-900">R$ 59,90</span>
                                        <span className="text-sm font-semibold text-slate-400">/mês</span>
                                    </div>
                                </div>

                                <ul className="space-y-3 pt-2">
                                    {[
                                        "Pedidos ilimitados",
                                        "Controle de mesas e caixa",
                                        "Relatórios de vendas",
                                        "Suporte prioritário"
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-600">
                                            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                                <Check className="h-3 w-3 text-green-600 font-bold" />
                                            </div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Abacate Pay Info */}
                        <div className="flex flex-col items-center gap-4 px-6 py-4 bg-primary/5 rounded-2xl border border-primary/10">
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">Pagamento Seguro via</span>
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full shadow-sm border border-primary/10 group cursor-default">
                                    <span className="text-xs font-bold text-slate-800 tracking-tight">Abacate</span>
                                    <span className="text-xs font-black text-green-600 tracking-tighter uppercase px-1.5 py-0.5 bg-green-50 rounded">Pay</span>
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium text-center">
                                Liberação imediata após a confirmação do PIX.
                            </p>
                        </div>
                    </div>

                    <UIDialogFooter className="p-8 pt-2 flex flex-col gap-3 sm:gap-4 sm:flex-row bg-white relative z-20">
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="h-16 font-bold text-slate-400 hover:text-slate-600 order-2 sm:order-1 sm:flex-1 rounded-2xl"
                        >
                            Voltar
                        </Button>
                        <Button
                            className="h-16 gradient-primary shadow-glow font-extrabold text-lg btn-bounce order-1 sm:order-2 sm:flex-[2.5] rounded-2xl flex items-center justify-center gap-3 px-8"
                            onClick={handlePayment}
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                                <>
                                    <span>Pagar com PIX</span>
                                    <QrCode className="h-5 w-5 opacity-80" />
                                </>
                            )}
                        </Button>
                    </UIDialogFooter>
                </div>
            </UIDialogContent>
        </UIDialog>
    );
}

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
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, Loader2, QrCode } from 'lucide-react';

interface PaymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PaymentModal({ open, onOpenChange }: PaymentModalProps) {
    const { restaurant, refreshRestaurantData } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const pixKey = "00020126580014BR.GOV.BCB.PIX0114+5511999999999520400005303986540510.005802BR5913Smart Menu App6009Sao Paulo62070503***6304ABCD"; // Exemplo de chave Copia e Cola

    const handleCopy = () => {
        navigator.clipboard.writeText(pixKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({
            title: "Copiado!",
            description: "Chave PIX copiada para a área de transferência.",
        });
    };

    const handleManualConfirm = async () => {
        if (!restaurant) return;

        setLoading(true);
        try {
            const now = new Date();
            let currentEnd = restaurant.subscription_ends_at
                ? new Date(restaurant.subscription_ends_at)
                : (restaurant.trial_ends_at ? new Date(restaurant.trial_ends_at) : now);

            if (currentEnd < now) currentEnd = now;

            // Add 30 days
            const newEnd = new Date(currentEnd.getTime() + 30 * 24 * 60 * 60 * 1000);

            const { error } = await supabase
                .from('restaurants')
                .update({
                    subscription_ends_at: newEnd.toISOString()
                })
                .eq('id', restaurant.id);

            if (error) throw error;

            toast({
                title: "Sucesso!",
                description: "Assinatura renovada por mais 30 dias!",
            });

            await refreshRestaurantData();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast({
                title: "Erro",
                description: "Não foi possível confirmar o pagamento.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <UIDialog open={open} onOpenChange={onOpenChange}>
            <UIDialogContent className="sm:max-w-[425px] border-none shadow-2xl overflow-hidden p-0 gap-0">
                <UIDialogHeader className="p-6 pb-0">
                    <UIDialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center shadow-soft">
                            <QrCode className="h-5 w-5 text-white" />
                        </div>
                        Pagamento via PIX
                    </UIDialogTitle>
                    <UIDialogDescription className="text-slate-500 mt-2">
                        Scaneie o QR Code ou utilize o código PIX para ativar seu acesso.
                    </UIDialogDescription>
                </UIDialogHeader>

                <div className="p-6 space-y-6">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-orange-400 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
                        <div className="relative bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3">
                            <img
                                src="/images/pix-qrcode.png"
                                alt="QR Code PIX"
                                className="w-52 h-52 object-contain"
                                onError={(e) => {
                                    // Fallback if image fails
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement?.classList.add('bg-slate-50', 'flex-col');
                                }}
                            />
                            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                                Escaneie para pagar
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
                            Código Copia e Cola
                        </label>
                        <div className="group relative">
                            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 group-hover:border-primary/30 transition-colors">
                                <code className="text-xs flex-1 truncate font-mono text-slate-600 font-medium">
                                    {pixKey}
                                </code>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-9 w-9 hover:bg-white hover:shadow-sm rounded-lg"
                                    onClick={handleCopy}
                                >
                                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-primary" />}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[10px] font-bold text-primary">!</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            <strong className="text-primary block mb-1">Passo importante:</strong>
                            Após realizar o pagamento, você deve clicar em "Confirmar Pagamento" para liberar seu sistema.
                        </p>
                    </div>
                </div>

                <UIDialogFooter className="p-6 pt-0 flex flex-col sm:flex-row gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="sm:flex-1 h-12 text-slate-500 font-semibold"
                    >
                        Voltar
                    </Button>
                    <Button
                        className="sm:flex-1 h-12 gradient-primary shadow-glow font-bold text-base btn-bounce"
                        onClick={handleManualConfirm}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                        Confirmar Pagamento
                    </Button>
                </UIDialogFooter>
            </UIDialogContent>
        </UIDialog>
    );
}

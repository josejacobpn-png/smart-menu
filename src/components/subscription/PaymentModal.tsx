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
            <UIDialogContent className="sm:max-w-md">
                <UIDialogHeader>
                    <UIDialogTitle className="flex items-center gap-2">
                        <QrCode className="h-5 w-5 text-primary" />
                        Pagamento via PIX
                    </UIDialogTitle>
                    <UIDialogDescription>
                        Scaneie o QR Code abaixo ou utilize o código PIX Copia e Cola para ativar sua assinatura de 30 dias.
                    </UIDialogDescription>
                </UIDialogHeader>

                <div className="flex flex-col items-center justify-center space-y-4 py-4">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <img
                            src="/images/pix-qrcode.png"
                            alt="QR Code PIX"
                            className="w-48 h-48 object-contain"
                        />
                    </div>

                    <div className="w-full space-y-2">
                        <p className="text-xs font-medium text-slate-500 uppercase px-1">Código Copia e Cola</p>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <code className="text-[10px] flex-1 truncate font-mono text-slate-700">
                                {pixKey}
                            </code>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCopy}>
                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg w-full">
                        <p className="text-xs text-blue-700 leading-relaxed">
                            <strong>Importante:</strong> Após realizar o pagamento, clique no botão abaixo para ativar seu acesso instantaneamente.
                        </p>
                    </div>
                </div>

                <UIDialogFooter className="flex sm:justify-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="flex-1"
                    >
                        Cancelar
                    </Button>
                    <Button
                        className="flex-1 gradient-primary"
                        onClick={handleManualConfirm}
                        disabled={loading}
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Confirmar Pagamento
                    </Button>
                </UIDialogFooter>
            </UIDialogContent>
        </UIDialog>
    );
}

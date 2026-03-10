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
            <UIDialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl">
                <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
                    <UIDialogHeader className="p-6 pb-2">
                        <UIDialogTitle className="flex items-center gap-3 text-2xl font-bold tracking-tight">
                            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg transform -rotate-3">
                                <QrCode className="h-6 w-6 text-white" />
                            </div>
                            Pagamento PIX
                        </UIDialogTitle>
                        <UIDialogDescription className="text-slate-500 text-sm leading-relaxed pt-2">
                            Assine por 30 dias e libere todos os recursos do seu Smart Menu instantaneamente.
                        </UIDialogDescription>
                    </UIDialogHeader>

                    <div className="p-6 space-y-8">
                        {/* QR Code Section */}
                        <div className="flex flex-col items-center">
                            <div className="relative group p-1 bg-gradient-to-br from-primary/20 to-orange-500/20 rounded-[2rem] transition-transform duration-500 hover:scale-[1.02]">
                                <div className="bg-white p-6 rounded-[1.8rem] shadow-inner border border-slate-50 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-orange-400 opacity-20"></div>
                                    <img
                                        src="/images/pix-qrcode.jpg"
                                        alt="QR Code PIX"
                                        className="w-48 h-48 object-contain relative z-10 mx-auto"
                                        onError={(e) => {
                                            const target = e.currentTarget;
                                            target.style.display = 'none';
                                            const parent = target.parentElement;
                                            if (parent) {
                                                parent.innerHTML += '<div class="w-48 h-48 flex flex-col items-center justify-center text-slate-300 gap-2"><svg class="w-12 h-12" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span class="text-[10px] font-bold uppercase tracking-tighter">Imagem não carregada</span></div>';
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-full border border-slate-200 shadow-sm transition-all hover:bg-slate-200 cursor-default">
                                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Escaneie para Pagar</span>
                            </div>
                        </div>

                        {/* Copy&Paste Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                    Código Copia e Cola
                                </label>
                                {copied && <span className="text-[10px] font-bold text-green-500 animate-in fade-in slide-in-from-right-1">Copiado!</span>}
                            </div>
                            <div className="flex items-center gap-2 p-1 bg-slate-100/50 rounded-2xl border-2 border-slate-200/60 transition-all focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/5">
                                <code className="text-[11px] flex-1 truncate font-mono text-slate-600 font-bold pl-4 py-3">
                                    {pixKey}
                                </code>
                                <Button
                                    size="icon"
                                    variant="secondary"
                                    className="h-10 w-10 shrink-0 bg-white shadow-sm hover:shadow-md hover:bg-white rounded-xl active:scale-90 transition-all"
                                    onClick={handleCopy}
                                >
                                    {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-primary" />}
                                </Button>
                            </div>
                        </div>

                        {/* Alert Section */}
                        <div className="relative overflow-hidden p-5 rounded-2xl bg-amber-50/50 border border-amber-100 group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
                                <Check className="h-12 w-12 text-amber-600" />
                            </div>
                            <div className="flex gap-4 relative z-10">
                                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                    <AlertCircle className="h-5 w-5 text-amber-600" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-amber-800">Passo Final Obrigatório</p>
                                    <p className="text-[11px] text-amber-700/80 leading-relaxed font-medium">
                                        Após realizar o PIX, você <strong>DEVE</strong> clicar no botão abaixo para o sistema liberar o seu acesso agora.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <UIDialogFooter className="p-6 pt-2 flex flex-col gap-3 sm:gap-4 sm:flex-row shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] bg-white relative z-20">
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="h-14 font-bold text-slate-400 hover:text-slate-600 order-2 sm:order-1 sm:flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="h-14 gradient-primary shadow-glow font-extrabold text-lg btn-bounce order-1 sm:order-2 sm:flex-[2]"
                            onClick={handleManualConfirm}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : 'Ativar Sistema'}
                        </Button>
                    </UIDialogFooter>
                </div>
            </UIDialogContent>
        </UIDialog>
    );
}

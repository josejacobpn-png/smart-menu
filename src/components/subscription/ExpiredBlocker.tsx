import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Lock } from 'lucide-react';
import { PaymentModal } from './PaymentModal';

export function ExpiredBlocker() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { restaurant } = useAuth();

    if (!restaurant) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
            <Card className="max-w-md w-full shadow-2xl border-destructive/20 animate-in fade-in zoom-in duration-300">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                        <Lock className="h-8 w-8 text-destructive" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Acesso Bloqueado</CardTitle>
                    <CardDescription>
                        Seu período de uso do <strong>{restaurant.name}</strong> expirou.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 text-center">
                    <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100 text-left">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800 leading-relaxed">
                            Para continuar gerenciando seus pedidos, cardápio e relatórios, é necessário ativar sua assinatura.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Button
                            className="w-full h-12 text-lg gradient-primary btn-bounce"
                            onClick={() => setIsModalOpen(true)}
                        >
                            Ativar Agora por 30 Dias
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            Pagamento seguro via PIX com ativação instantânea.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <PaymentModal open={isModalOpen} onOpenChange={setIsModalOpen} />
        </div>
    );
}

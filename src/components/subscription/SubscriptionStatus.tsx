import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { differenceInDays, differenceInHours, parseISO } from 'date-fns';
import { PaymentModal } from './PaymentModal';

export function SubscriptionStatus() {
    const { restaurant, hasRole } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number } | null>(null);
    const [status, setStatus] = useState<'trial' | 'subscription' | 'expired'>('expired');

    useEffect(() => {
        if (!restaurant) return;

        const updateTimer = () => {
            const now = new Date();
            const subEnd = restaurant.subscription_ends_at ? parseISO(restaurant.subscription_ends_at) : null;
            const trialEnd = restaurant.trial_ends_at ? parseISO(restaurant.trial_ends_at) : null;

            const targetDate = subEnd || trialEnd;

            if (!targetDate || targetDate < now) {
                setStatus('expired');
                setTimeLeft(null);
                return;
            }

            const days = differenceInDays(targetDate, now);
            const hours = differenceInHours(targetDate, now) % 24;

            setTimeLeft({ days, hours });
            setStatus(subEnd ? 'subscription' : 'trial');
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [restaurant]);


    if (!restaurant) return null;

    const isWarning = timeLeft && timeLeft.days <= 1;

    return (
        <div className="px-4 py-3 bg-sidebar-accent/50 rounded-xl border border-sidebar-border mx-2 mt-4">
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                        {status === 'trial' ? 'Período de Teste' : status === 'subscription' ? 'Assinatura' : 'Expirado'}
                    </span>
                    {status === 'expired' ? (
                        <Badge variant="destructive" className="animate-pulse">Bloqueado</Badge>
                    ) : isWarning ? (
                        <Badge variant="outline" className="border-orange-500 text-orange-500 flex gap-1">
                            <Clock className="h-3 w-3" /> Expirando
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="border-green-500 text-green-500">Ativo</Badge>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {status === 'expired' ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : (
                        <Calendar className="h-4 w-4 text-sidebar-foreground/70" />
                    )}
                    <span className="text-sm font-medium text-sidebar-foreground">
                        {status === 'expired'
                            ? 'Acesso limitado'
                            : timeLeft
                                ? `${timeLeft.days}d ${timeLeft.hours}h restantes`
                                : 'Processando...'}
                    </span>
                </div>

                <Button
                    size="sm"
                    variant={status === 'expired' ? "default" : "outline"}
                    className={`w-full mt-1 text-xs h-8 ${status === 'expired' ? 'gradient-primary' : ''}`}
                    onClick={() => setIsModalOpen(true)}
                >
                    {status === 'subscription' ? 'Renovar Plano' : 'Assinar Agora'}
                </Button>
            </div>

            <PaymentModal open={isModalOpen} onOpenChange={setIsModalOpen} />
        </div>
    );
}

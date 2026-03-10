import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('admin' | 'attendant' | 'kitchen')[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Carregando...</p>

        {/* Safety button if stuck */}
        <div className="pt-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.href = '/auth?clear=true';
            }}
            className="text-[10px] text-muted-foreground/40 hover:text-primary uppercase tracking-widest"
          >
            Demorando muito? Clique aqui para limpar tudo e reiniciar
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && !allowedRoles.some(role => hasRole(role))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

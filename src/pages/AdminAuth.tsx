import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function AdminAuth() {
    const navigate = useNavigate();
    const { signIn } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Using the same sign in - the app will handle redirects based on user roles
        // But here we can redirect specifically to the admin tenants page after login
        const { error } = await signIn(email, password);
        setLoading(false);

        if (error) {
            toast({
                title: 'Erro ao entrar',
                description: 'Credenciais de administrador inválidas',
                variant: 'destructive',
            });
        } else {
            // For the super admin, we redirect them to the tenant registration page
            navigate('/admin-tenants');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
            <Card className="w-full max-w-md shadow-soft animate-fade-in relative border-slate-800 bg-slate-900 text-slate-100">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center shadow-glow border border-slate-700">
                        <ShieldCheck className="h-8 w-8 text-blue-400" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold">Acesso Restrito</CardTitle>
                        <CardDescription className="text-slate-400">Área exclusiva para administradores do sistema</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="admin-email" className="text-slate-300">Email Administrativo</Label>
                            <Input
                                id="admin-email"
                                type="email"
                                placeholder="admin@sistema.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-blue-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="admin-password" className="text-slate-300">Senha</Label>
                            <Input
                                id="admin-password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-blue-500"
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full btn-bounce bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={loading}
                            size="lg"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Acessar Painel
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <Button variant="link" onClick={() => navigate('/auth')} className="text-slate-500 text-xs hover:text-slate-300">
                            Voltar para o Login de Restaurantes
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

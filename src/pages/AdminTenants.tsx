import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, ArrowLeft, Building2 } from 'lucide-react';
import { z } from 'zod';

const signupSchema = z.object({
    fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    restaurantName: z.string().min(2, 'Nome do restaurante deve ter pelo menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export default function AdminTenants() {
    const navigate = useNavigate();
    const { signUp, signOut } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const [signupForm, setSignupForm] = useState({
        fullName: '',
        restaurantName: '',
        email: '',
        password: ''
    });

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        const validation = signupSchema.safeParse(signupForm);
        if (!validation.success) {
            toast({
                title: 'Erro de validação',
                description: validation.error.errors[0].message,
                variant: 'destructive',
            });
            return;
        }

        setLoading(true);
        // Note: Em um ambiente de produção real, o ideal seria uma Edge Function ou RPC
        // para não deslogar o Super Admin atual, mas como o Supabase Client faz auto-login,
        // o Super Admin que está criando a conta se tornará o novo usuário se auto-login ocorrer,
        // ou apenas criará a conta de forma transparente se email confirmação estiver ligada.
        const { error } = await signUp(
            signupForm.email,
            signupForm.password,
            signupForm.fullName,
            signupForm.restaurantName
        );
        setLoading(false);

        if (error) {
            let message = error.message;
            if (error.message.includes('already registered')) {
                message = 'Este email já está cadastrado';
            }
            toast({
                title: 'Erro ao cadastrar',
                description: message,
                variant: 'destructive',
            });
        } else {
            toast({
                title: 'Restaurante criado com sucesso!',
                description: 'O novo lojista já pode acessar o sistema.',
            });
            setSignupForm({
                fullName: '',
                restaurantName: '',
                email: '',
                password: ''
            });
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/admin-login');
    };

    return (
        <div className="min-h-screen p-4 bg-slate-50">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" onClick={() => navigate('/admin-login')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Building2 className="h-6 w-6 text-primary" />
                            Painel Administrativo
                        </h1>
                    </div>
                    <Button variant="ghost" onClick={handleLogout}>Sair do Painel</Button>
                </div>

                <Card className="shadow-sm border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-xl">Cadastrar Novo Restaurante</CardTitle>
                        <CardDescription>Crie um novo ambiente de restaurante (tenant) e seu usuário administrador principal.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSignup} className="space-y-4 max-w-xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="signup-name">Nome do Proprietário</Label>
                                    <Input
                                        id="signup-name"
                                        type="text"
                                        placeholder="João Silva"
                                        value={signupForm.fullName}
                                        onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-restaurant">Nome do Restaurante</Label>
                                    <Input
                                        id="signup-restaurant"
                                        type="text"
                                        placeholder="Lanchonete do João"
                                        value={signupForm.restaurantName}
                                        onChange={(e) => setSignupForm({ ...signupForm, restaurantName: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="signup-email">Email de Acesso</Label>
                                    <Input
                                        id="signup-email"
                                        type="email"
                                        placeholder="novo@restaurante.com"
                                        value={signupForm.email}
                                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-password">Senha Temporária</Label>
                                    <Input
                                        id="signup-password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={signupForm.password}
                                        onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button
                                    type="submit"
                                    className="btn-bounce gradient-primary"
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />}
                                    Finalizar Cadastro
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

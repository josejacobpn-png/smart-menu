import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { User, Plus, Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Employee {
    id: string;
    name: string;
    role: string;
    active: boolean;
}

export default function Employees() {
    const { restaurant } = useAuth();
    const { toast } = useToast();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [employeeForm, setEmployeeForm] = useState({ name: '', role: 'waiter' });

    useEffect(() => {
        if (restaurant?.id) {
            fetchEmployees();
        }
    }, [restaurant?.id]);

    const fetchEmployees = async () => {
        try {
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .eq('restaurant_id', restaurant!.id)
                .order('name');

            if (error) throw error;
            setEmployees(data || []);
        } catch (error) {
            console.error('Error fetching employees:', error);
            toast({ title: 'Erro ao carregar funcionários', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const openDialog = (employee?: Employee) => {
        if (employee) {
            setEditingEmployee(employee);
            setEmployeeForm({ name: employee.name, role: employee.role });
        } else {
            setEditingEmployee(null);
            setEmployeeForm({ name: '', role: 'waiter' });
        }
        setDialogOpen(true);
    };

    const saveEmployee = async () => {
        try {
            if (!employeeForm.name.trim()) {
                toast({ title: 'Nome é obrigatório', variant: 'destructive' });
                return;
            }

            if (editingEmployee) {
                const { error } = await supabase
                    .from('employees')
                    .update({
                        name: employeeForm.name,
                        role: employeeForm.role,
                    })
                    .eq('id', editingEmployee.id);
                if (error) throw error;
                toast({ title: 'Funcionário atualizado!' });
            } else {
                const { error } = await supabase
                    .from('employees')
                    .insert({
                        restaurant_id: restaurant!.id,
                        name: employeeForm.name,
                        role: employeeForm.role,
                        active: true
                    });
                if (error) throw error;
                toast({ title: 'Funcionário cadastrado!' });
            }

            setDialogOpen(false);
            fetchEmployees();
        } catch (error) {
            console.error('Error saving employee:', error);
            toast({ title: 'Erro ao salvar funcionário', variant: 'destructive' });
        }
    };

    const toggleActive = async (employee: Employee) => {
        try {
            const { error } = await supabase
                .from('employees')
                .update({ active: !employee.active })
                .eq('id', employee.id);

            if (error) throw error;
            toast({ title: `Funcionário ${!employee.active ? 'ativado' : 'desativado'}!` });
            fetchEmployees();
        } catch (error) {
            console.error('Error leveraging employee status:', error);
            toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
        }
    };

    const deleteEmployee = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este funcionário?')) return;
        try {
            const { error } = await supabase.from('employees').delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Funcionário excluído!' });
            fetchEmployees();
        } catch (error) {
            console.error('Error deleting employee:', error);
            toast({ title: 'Erro ao excluir funcionário', variant: 'destructive' });
        }
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold">Funcionários</h1>
                        <p className="text-muted-foreground">
                            Gerencie sua equipe de atendimento
                        </p>
                    </div>
                    <Button className="gradient-primary" onClick={() => openDialog()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Funcionário
                    </Button>
                </div>

                {/* Employees List */}
                {employees.length === 0 && !loading ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>Nenhum funcionário cadastrado</p>
                            <Button variant="link" className="mt-2" onClick={() => openDialog()}>
                                Adicionar primeiro funcionário
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {employees.map((employee) => (
                            <Card key={employee.id} className="card-hover">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <User className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">{employee.name}</h3>
                                                <p className="text-sm text-muted-foreground capitalize">
                                                    {employee.role === 'waiter' ? 'Garçom/Garçonete' :
                                                        employee.role === 'manager' ? 'Gerente' :
                                                            employee.role === 'cook' ? 'Cozinha' : employee.role}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant={employee.active ? 'default' : 'secondary'}>
                                            {employee.active ? 'Ativo' : 'Inativo'}
                                        </Badge>
                                    </div>

                                    <div className="flex gap-2 mt-4 justify-end">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => toggleActive(employee)}
                                            title={employee.active ? "Desativar" : "Ativar"}
                                        >
                                            {employee.active ? <UserCheck className="h-4 w-4 text-green-600" /> : <UserX className="h-4 w-4 text-muted-foreground" />}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openDialog(employee)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive"
                                            onClick={() => deleteEmployee(employee.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Nome Completo</Label>
                            <Input
                                value={employeeForm.name}
                                onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                                placeholder="Ex: João Silva"
                            />
                        </div>
                        <div>
                            <Label>Cargo / Função</Label>
                            <Select
                                value={employeeForm.role}
                                onValueChange={(val) => setEmployeeForm({ ...employeeForm, role: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="waiter">Garçom/Garçonete</SelectItem>
                                    <SelectItem value="manager">Gerente</SelectItem>
                                    <SelectItem value="cook">Cozinheiro(a)</SelectItem>
                                    <SelectItem value="host">Recepcionista</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={saveEmployee} className="w-full gradient-primary">
                            {editingEmployee ? 'Salvar' : 'Cadastrar'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}

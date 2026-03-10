import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Pencil, Trash2 } from 'lucide-react';

interface Table {
  id: string;
  number: number;
  status: 'free' | 'occupied';
  capacity: number;
}

interface Order {
  id: string;
  order_number: number;
  total: number;
  status: string;
  employee_id?: string;
}

interface Employee {
  id: string;
  name: string;
}

export default function Tables() {
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const [tables, setTables] = useState<Table[]>([]);
  const [tableOrders, setTableOrders] = useState<Record<string, Order | null>>({});
  const [employees, setEmployees] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [tableForm, setTableForm] = useState({ number: '', capacity: '4' });

  useEffect(() => {
    if (restaurant?.id) {
      fetchTables();
    }
  }, [restaurant?.id]);

  const fetchTables = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('restaurant_id', restaurant!.id)
        .order('number');

      if (error) throw error;
      setTables(data || []);

      // Fetch active orders for occupied tables
      const occupiedTables = data?.filter(t => t.status === 'occupied') || [];
      const ordersMap: Record<string, Order | null> = {};

      for (const table of occupiedTables) {
        const { data: orderData } = await supabase
          .from('orders')
          .select('id, order_number, total, status, employee_id')
          .eq('table_id', table.id)
          .in('status', ['open', 'preparing', 'ready'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle() as any;

        ordersMap[table.id] = orderData as Order | null;
      }

      setTableOrders(ordersMap);

      // Fetch employees names
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, name')
        .eq('restaurant_id', restaurant!.id) as any;

      const employeesMap: Record<string, string> = {};
      (employeesData as any[])?.forEach(emp => {
        employeesMap[emp.id] = emp.name;
      });
      setEmployees(employeesMap);

    } catch (error) {
      console.error('Error fetching tables:', error);
      toast({ title: 'Erro ao carregar mesas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (table?: Table) => {
    if (table) {
      setEditingTable(table);
      setTableForm({ number: table.number.toString(), capacity: table.capacity.toString() });
    } else {
      setEditingTable(null);
      const nextNumber = tables.length > 0 ? Math.max(...tables.map(t => t.number)) + 1 : 1;
      setTableForm({ number: nextNumber.toString(), capacity: '4' });
    }
    setDialogOpen(true);
  };

  const saveTable = async () => {
    try {
      const tableData = {
        number: parseInt(tableForm.number),
        capacity: parseInt(tableForm.capacity),
      };

      if (editingTable) {
        const { error } = await supabase
          .from('restaurant_tables')
          .update(tableData)
          .eq('id', editingTable.id);
        if (error) throw error;
        toast({ title: 'Mesa atualizada!' });
      } else {
        const { error } = await supabase
          .from('restaurant_tables')
          .insert({
            ...tableData,
            restaurant_id: restaurant!.id,
            status: 'free',
          });
        if (error) throw error;
        toast({ title: 'Mesa criada!' });
      }

      setDialogOpen(false);
      fetchTables();
    } catch (error) {
      console.error('Error saving table:', error);
      if (error.code === '23505') {
        toast({ title: 'Já existe uma mesa com este número', variant: 'destructive' });
      } else {
        toast({ title: 'Erro ao salvar mesa', variant: 'destructive' });
      }
    }
  };

  const deleteTable = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta mesa?')) return;
    try {
      const { error } = await supabase.from('restaurant_tables').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Mesa excluída!' });
      fetchTables();
    } catch (error) {
      console.error('Error deleting table:', error);
      toast({ title: 'Erro ao excluir mesa', variant: 'destructive' });
    }
  };

  const freeTable = async (tableId: string) => {
    try {
      const { error } = await supabase
        .from('restaurant_tables')
        .update({ status: 'free' })
        .eq('id', tableId);
      if (error) throw error;
      toast({ title: 'Mesa liberada!' });
      fetchTables();
    } catch (error) {
      console.error('Error freeing table:', error);
      toast({ title: 'Erro ao liberar mesa', variant: 'destructive' });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const freeTables = tables.filter(t => t.status === 'free').length;
  const occupiedTables = tables.filter(t => t.status === 'occupied').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Mesas</h1>
          <p className="text-muted-foreground">
            {freeTables} livre{freeTables !== 1 ? 's' : ''} • {occupiedTables} ocupada{occupiedTables !== 1 ? 's' : ''}
          </p>
        </div>
        <Button className="gradient-primary" onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Mesa
        </Button>
      </div>

      {/* Tables Grid */}
      {tables.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma mesa cadastrada</p>
            <Button variant="link" className="mt-2" onClick={() => openDialog()}>
              Adicionar primeira mesa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {tables.map((table) => {
            const order = tableOrders[table.id];
            const isOccupied = table.status === 'occupied';

            return (
              <Card
                key={table.id}
                className={`card-hover ${isOccupied ? 'border-warning' : 'border-success'}`}
              >
                <CardContent className="p-4 text-center">
                  <div className="relative">
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl font-bold ${isOccupied ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                      }`}>
                      {table.number}
                    </div>
                    <Badge
                      variant={isOccupied ? 'default' : 'secondary'}
                      className={`absolute -top-1 -right-1 ${isOccupied ? 'bg-warning text-warning-foreground' : 'bg-success text-success-foreground'
                        }`}
                    >
                      {isOccupied ? 'Ocupada' : 'Livre'}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mt-3">
                    {table.capacity} lugares
                  </p>

                  {order && (
                    <div className="mt-2 p-2 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Pedido #{order.order_number}</p>
                      <p className="font-semibold">{formatCurrency(Number(order.total))}</p>
                      {order.employee_id && employees[order.employee_id] && (
                        <div className="flex items-center justify-center gap-1 mt-1 text-xs text-muted-foreground border-t border-border/50 pt-1">
                          <span className="w-2 h-2 rounded-full bg-primary/50" />
                          {employees[order.employee_id]}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-1 mt-3 justify-center">
                    {isOccupied && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => freeTable(table.id)}
                      >
                        Liberar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openDialog(table)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteTable(table.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTable ? 'Editar Mesa' : 'Nova Mesa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Número da mesa</Label>
              <Input
                type="number"
                value={tableForm.number}
                onChange={(e) => setTableForm({ ...tableForm, number: e.target.value })}
                placeholder="1"
              />
            </div>
            <div>
              <Label>Capacidade (lugares)</Label>
              <Input
                type="number"
                value={tableForm.capacity}
                onChange={(e) => setTableForm({ ...tableForm, capacity: e.target.value })}
                placeholder="4"
              />
            </div>
            <Button onClick={saveTable} className="w-full gradient-primary">
              {editingTable ? 'Salvar' : 'Criar Mesa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

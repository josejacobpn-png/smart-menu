import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, Store, User, Save } from 'lucide-react';

export default function Settings() {
  const { restaurant, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [restaurantForm, setRestaurantForm] = useState({
    name: restaurant?.name || '',
    phone: '',
    address: '',
  });

  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || '',
  });

  const saveRestaurant = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          name: restaurantForm.name,
          phone: restaurantForm.phone,
          address: restaurantForm.address,
        })
        .eq('id', restaurant!.id);

      if (error) throw error;
      toast({ title: 'Dados do restaurante atualizados!' });
    } catch (error) {
      console.error('Error updating restaurant:', error);
      toast({ title: 'Erro ao atualizar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name,
        })
        .eq('id', profile!.id);

      if (error) throw error;
      toast({ title: 'Perfil atualizado!' });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({ title: 'Erro ao atualizar perfil', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
          <SettingsIcon className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Gerencie seu restaurante</p>
        </div>
      </div>

      {/* Restaurant Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <CardTitle>Dados do Restaurante</CardTitle>
          </div>
          <CardDescription>Informações do seu estabelecimento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nome do restaurante</Label>
            <Input
              value={restaurantForm.name}
              onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
              placeholder="Nome do restaurante"
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input
              value={restaurantForm.phone}
              onChange={(e) => setRestaurantForm({ ...restaurantForm, phone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <Label>Endereço</Label>
            <Input
              value={restaurantForm.address}
              onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })}
              placeholder="Endereço completo"
            />
          </div>
          <Button onClick={saveRestaurant} disabled={loading} className="gradient-primary">
            <Save className="h-4 w-4 mr-2" />
            Salvar alterações
          </Button>
        </CardContent>
      </Card>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Seu Perfil</CardTitle>
          </div>
          <CardDescription>Suas informações pessoais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nome completo</Label>
            <Input
              value={profileForm.full_name}
              onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
              placeholder="Seu nome"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              value={profile?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">O email não pode ser alterado</p>
          </div>
          <Button onClick={saveProfile} disabled={loading} className="gradient-primary">
            <Save className="h-4 w-4 mr-2" />
            Salvar alterações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

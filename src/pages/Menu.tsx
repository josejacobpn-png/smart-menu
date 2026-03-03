import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Package, FolderOpen, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  send_to_kitchen?: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  is_active: boolean;
  is_combo: boolean;
  image_url: string | null;
  track_stock?: boolean;
  stock_quantity?: number;
  min_stock_quantity?: number;
}

export default function MenuPage() {
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Category form
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', send_to_kitchen: true });

  // Product form
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    is_active: true,
    is_combo: false,
    track_stock: false,
    stock_quantity: '0',
    min_stock_quantity: '0',
  });

  useEffect(() => {
    if (restaurant?.id) {
      fetchData();
    }
  }, [restaurant?.id]);

  const fetchData = async () => {
    try {
      const [categoriesRes, productsRes] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .eq('restaurant_id', restaurant!.id)
          .order('sort_order'),
        supabase
          .from('products')
          .select('*')
          .eq('restaurant_id', restaurant!.id)
          .order('sort_order'),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (productsRes.error) throw productsRes.error;

      setCategories(categoriesRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error('Error fetching menu data:', error);
      toast({ title: 'Erro ao carregar cardápio', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Category functions
  const openCategoryDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        send_to_kitchen: category.send_to_kitchen ?? true
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', send_to_kitchen: true });
    }
    setCategoryDialogOpen(true);
  };

  const saveCategory = async () => {
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({
            name: categoryForm.name,
            description: categoryForm.description,
            send_to_kitchen: categoryForm.send_to_kitchen
          })
          .eq('id', editingCategory.id);
        if (error) throw error;
        toast({ title: 'Categoria atualizada!' });
      } else {
        const { error } = await supabase
          .from('categories')
          .insert({
            restaurant_id: restaurant!.id,
            name: categoryForm.name,
            description: categoryForm.description,
            send_to_kitchen: categoryForm.send_to_kitchen,
            sort_order: categories.length,
          });
        if (error) throw error;
        toast({ title: 'Categoria criada!' });
      }
      setCategoryDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving category:', error);
      toast({ title: 'Erro ao salvar categoria', variant: 'destructive' });
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Categoria excluída!' });
      fetchData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({ title: 'Erro ao excluir categoria', variant: 'destructive' });
    }
  };

  // Product functions
  const openProductDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        description: product.description || '',
        price: product.price.toString(),
        category_id: product.category_id || '',
        is_active: product.is_active,
        is_combo: product.is_combo,
        track_stock: product.track_stock || false,
        stock_quantity: (product.stock_quantity || 0).toString(),
        min_stock_quantity: (product.min_stock_quantity || 0).toString(),
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        price: '',
        category_id: selectedCategory || '',
        is_active: true,
        is_combo: false,
        track_stock: false,
        stock_quantity: '0',
        min_stock_quantity: '0',
      });
    }
    setProductDialogOpen(true);
  };

  const saveProduct = async () => {
    try {
      const productData = {
        name: productForm.name,
        description: productForm.description,
        price: parseFloat(productForm.price) || 0,
        category_id: productForm.category_id || null,
        is_active: productForm.is_active,
        is_combo: productForm.is_combo,
        track_stock: productForm.track_stock,
        stock_quantity: parseInt(productForm.stock_quantity) || 0,
        min_stock_quantity: parseInt(productForm.min_stock_quantity) || 0,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
        toast({ title: 'Produto atualizado!' });
      } else {
        const { error } = await supabase
          .from('products')
          .insert({
            ...productData,
            restaurant_id: restaurant!.id,
            sort_order: products.length,
          });
        if (error) throw error;
        toast({ title: 'Produto criado!' });
      }
      setProductDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({ title: 'Erro ao salvar produto', variant: 'destructive' });
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Produto excluído!' });
      fetchData();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({ title: 'Erro ao excluir produto', variant: 'destructive' });
    }
  };

  const toggleProductActive = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error toggling product:', error);
    }
  };

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Cardápio</h1>
            <p className="text-muted-foreground">Gerencie categorias e produtos</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openCategoryDialog()}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
            <Button className="gradient-primary" onClick={() => openProductDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Categories Sidebar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Categorias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant={selectedCategory === null ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setSelectedCategory(null)}
              >
                <Package className="h-4 w-4 mr-2" />
                Todos os produtos
                <Badge variant="secondary" className="ml-auto">{products.length}</Badge>
              </Button>
              {categories.map((category) => (
                <div key={category.id} className="flex items-center gap-1">
                  <Button
                    variant={selectedCategory === category.id ? 'default' : 'ghost'}
                    className="flex-1 justify-start"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    {category.name}
                    <Badge variant="secondary" className="ml-auto">
                      {products.filter(p => p.category_id === category.id).length}
                    </Badge>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openCategoryDialog(category)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => deleteCategory(category.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum produto cadastrado</p>
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => openProductDialog()}
                    >
                      Adicionar primeiro produto
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className={`card-hover ${!product.is_active ? 'opacity-60' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{product.name}</h3>
                            {product.is_combo && (
                              <Badge variant="secondary" className="text-xs">Combo</Badge>
                            )}
                          </div>
                          {product.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {product.description}
                            </p>
                          )}
                          {product.track_stock && (
                            <div className="mt-2">
                              <Badge variant={
                                (product.stock_quantity || 0) <= (product.min_stock_quantity || 0)
                                  ? "destructive"
                                  : "outline"
                              }>
                                Estoque: {product.stock_quantity || 0}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <Switch
                          checked={product.is_active}
                          onCheckedChange={() => toggleProductActive(product)}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-lg font-bold text-primary">
                          {formatCurrency(product.price)}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openProductDialog(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => deleteProduct(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Ex: Lanches"
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Descrição da categoria"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="send-to-kitchen"
                checked={categoryForm.send_to_kitchen}
                onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, send_to_kitchen: checked })}
              />
              <Label htmlFor="send-to-kitchen">Enviar para Cozinha?</Label>
            </div>
            <Button onClick={saveCategory} className="w-full gradient-primary">
              {editingCategory ? 'Salvar' : 'Criar Categoria'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="Ex: X-Burger"
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Descrição do produto"
              />
            </div>
            <div>
              <Label>Preço</Label>
              <Input
                type="number"
                step="0.01"
                value={productForm.price}
                onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select
                value={productForm.category_id}
                onValueChange={(value) => setProductForm({ ...productForm, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={productForm.is_combo}
                  onCheckedChange={(checked) => setProductForm({ ...productForm, is_combo: checked })}
                />
                <Label>É um combo?</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={productForm.is_active}
                  onCheckedChange={(checked) => setProductForm({ ...productForm, is_active: checked })}
                />
                <Label>Ativo</Label>
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="track-stock"
                  checked={productForm.track_stock}
                  onCheckedChange={(checked) => setProductForm({ ...productForm, track_stock: checked })}
                />
                <Label htmlFor="track-stock">Controlar Estoque?</Label>
              </div>

              {productForm.track_stock && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantidade em Estoque</Label>
                    <Input
                      type="number"
                      value={productForm.stock_quantity}
                      onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Estoque Mínimo</Label>
                    <Input
                      type="number"
                      value={productForm.min_stock_quantity}
                      onChange={(e) => setProductForm({ ...productForm, min_stock_quantity: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </div>
            <Button onClick={saveProduct} className="w-full gradient-primary">
              {editingProduct ? 'Salvar' : 'Criar Produto'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

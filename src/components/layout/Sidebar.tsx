import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingBag,
  ChefHat,
  CreditCard,
  BarChart3,
  LogOut,
  Menu,
  X,
  Users,
  Settings
} from 'lucide-react';
import { useState } from 'react';
import { SubscriptionStatus } from '../subscription/SubscriptionStatus';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['admin', 'attendant', 'kitchen'] },
  { icon: UtensilsCrossed, label: 'Cardápio', path: '/menu', roles: ['admin'] },
  { icon: ShoppingBag, label: 'Pedidos', path: '/orders', roles: ['admin', 'attendant'] },
  { icon: Users, label: 'Mesas', path: '/tables', roles: ['admin', 'attendant'] },
  { icon: ChefHat, label: 'Cozinha', path: '/kitchen', roles: ['admin', 'kitchen'] },
  { icon: CreditCard, label: 'Caixa', path: '/cashier', roles: ['admin', 'attendant'] },
  { icon: BarChart3, label: 'Relatórios', path: '/reports', roles: ['admin'] },

  { icon: Users, label: 'Funcionários', path: '/employees', roles: ['admin'] },
  { icon: Settings, label: 'Configurações', path: '/settings', roles: ['admin'] },
];

export default function Sidebar() {
  const location = useLocation();
  const { signOut, restaurant, profile, hasRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredMenuItems = menuItems.filter(item =>
    item.roles.some(role => hasRole(role as 'admin' | 'attendant' | 'kitchen'))
  );

  const navLinks = (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {filteredMenuItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const sidebarHeader = (
    <div className="p-4 border-b border-sidebar-border">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
          <UtensilsCrossed className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sidebar-foreground truncate">
            {restaurant?.name || 'Smart Menu'}
          </h2>
          <p className="text-xs text-sidebar-foreground/70 truncate">
            {profile?.full_name}
          </p>
        </div>
      </div>
    </div>
  );

  const sidebarFooter = (
    <div className="p-3 border-t border-sidebar-border space-y-2">
      <div className="flex items-center justify-between px-2">
        <span className="text-sm font-medium text-sidebar-foreground/80">Tema</span>
        <ModeToggle />
      </div>
      <Button
        variant="ghost"
        onClick={() => signOut()}
        className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
      >
        <LogOut className="h-5 w-5" />
        <span>Sair</span>
      </Button>
    </div>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar z-40 flex items-center justify-between px-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 gradient-primary rounded-lg flex items-center justify-center">
            <UtensilsCrossed className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sidebar-foreground">
            {restaurant?.name || 'Smart Menu'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-sidebar-foreground"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-foreground/50 z-40 pt-16"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        'lg:hidden fixed left-0 top-16 bottom-0 w-72 bg-sidebar z-50 flex flex-col transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {sidebarHeader}
        <SubscriptionStatus />
        {navLinks}
        {sidebarFooter}
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-72 bg-sidebar flex-col shadow-xl z-30">
        {sidebarHeader}
        <SubscriptionStatus />
        {navLinks}
        {sidebarFooter}
      </aside>
    </>
  );
}

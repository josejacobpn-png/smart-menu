import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "@/components/theme-provider";
import MainLayout from "@/components/layout/MainLayout";

// Lazy load pages
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MenuPage = lazy(() => import("./pages/Menu"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetails = lazy(() => import("./pages/OrderDetails"));
const NewOrder = lazy(() => import("./pages/NewOrder"));
const Tables = lazy(() => import("./pages/Tables"));
const Kitchen = lazy(() => import("./pages/Kitchen"));
const Cashier = lazy(() => import("./pages/Cashier"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Employees = lazy(() => import("./pages/Employees"));
const AdminAuth = lazy(() => import("./pages/AdminAuth"));
const AdminTenants = lazy(() => import("./pages/AdminTenants"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin-login" element={<AdminAuth />} />

                {/* Authenticated Routes with Persistent Layout */}
                <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/menu" element={<MenuPage />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/orders/new" element={<NewOrder />} />
                  <Route path="/orders/:id" element={<OrderDetails />} />
                  <Route path="/tables" element={<Tables />} />
                  <Route path="/kitchen" element={<Kitchen />} />
                  <Route path="/cashier" element={<Cashier />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/employees" element={<Employees />} />
                  <Route path="/admin-tenants" element={<AdminTenants />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

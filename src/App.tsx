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

const queryClient = new QueryClient();

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
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/menu" element={<ProtectedRoute allowedRoles={['admin']}><MenuPage /></ProtectedRoute>} />
                <Route path="/orders" element={<ProtectedRoute allowedRoles={['admin', 'attendant']}><Orders /></ProtectedRoute>} />
                <Route path="/orders/new" element={<ProtectedRoute allowedRoles={['admin', 'attendant']}><NewOrder /></ProtectedRoute>} />
                <Route path="/orders/:id" element={<ProtectedRoute allowedRoles={['admin', 'attendant']}><OrderDetails /></ProtectedRoute>} />
                <Route path="/tables" element={<ProtectedRoute allowedRoles={['admin', 'attendant']}><Tables /></ProtectedRoute>} />
                <Route path="/kitchen" element={<ProtectedRoute allowedRoles={['admin', 'kitchen']}><Kitchen /></ProtectedRoute>} />
                <Route path="/cashier" element={<ProtectedRoute allowedRoles={['admin', 'attendant']}><Cashier /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />
                <Route path="/employees" element={<ProtectedRoute allowedRoles={['admin']}><Employees /></ProtectedRoute>} />
                <Route path="/admin-login" element={<AdminAuth />} />
                <Route path="/admin-tenants" element={<ProtectedRoute><AdminTenants /></ProtectedRoute>} />
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

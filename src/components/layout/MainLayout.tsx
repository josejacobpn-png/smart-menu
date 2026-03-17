import { ReactNode, useMemo, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const PageLoading = () => (
  <div className="flex items-center justify-center p-12">
    <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
  </div>
);

interface MainLayoutProps {
  children?: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { restaurant, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full relative">
      <Sidebar />
      <main className="lg:pl-72 pt-16 lg:pt-0 min-h-screen w-full max-w-[100vw] overflow-x-hidden">
        <div className="p-4 lg:p-6 mx-auto w-full max-w-full">
          <Suspense fallback={<PageLoading />}>
            {children || <Outlet />}
          </Suspense>
        </div>
      </main>
    </div>
  );
}

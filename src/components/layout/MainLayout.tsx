import { ReactNode, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { ExpiredBlocker } from '../subscription/ExpiredBlocker';
import { parseISO, isAfter } from 'date-fns';

interface MainLayoutProps {
  children?: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { restaurant, loading } = useAuth();

  const isExpired = useMemo(() => {
    if (loading || !restaurant) return false;

    try {
      const now = new Date();

      const parseDate = (val: string | null | undefined) => {
        if (!val || typeof val !== 'string') return null;
        try {
          const d = parseISO(val);
          return isNaN(d.getTime()) ? null : d;
        } catch {
          return null;
        }
      };

      const trialEnd = parseDate(restaurant.trial_ends_at);
      const subEnd = parseDate(restaurant.subscription_ends_at);

      const latestEnd = subEnd || trialEnd;

      if (!latestEnd) return false;
      return isAfter(now, latestEnd);
    } catch (err) {
      console.error("Error in expiration check:", err);
      return false; // Safely allow access on error
    }
  }, [restaurant, loading]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full relative">
      <Sidebar />
      {isExpired && <ExpiredBlocker />}
      <main className="lg:pl-72 pt-16 lg:pt-0 min-h-screen w-full max-w-[100vw] overflow-x-hidden">
        <div className="p-4 lg:p-6 mx-auto w-full max-w-full">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
}

import { ReactNode, useMemo } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { ExpiredBlocker } from '../subscription/ExpiredBlocker';
import { parseISO, isAfter } from 'date-fns';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { restaurant, loading } = useAuth();

  const isExpired = useMemo(() => {
    if (loading || !restaurant) return false;

    const now = new Date();
    const trialEnd = restaurant.trial_ends_at ? parseISO(restaurant.trial_ends_at) : null;
    const subEnd = restaurant.subscription_ends_at ? parseISO(restaurant.subscription_ends_at) : null;

    const latestEnd = subEnd || trialEnd;

    if (!latestEnd) return true; // Or handle as not-expired if no dates yet
    return !isAfter(latestEnd, now);
  }, [restaurant, loading]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full relative">
      <Sidebar />
      {isExpired && <ExpiredBlocker />}
      <main className="lg:pl-72 pt-16 lg:pt-0 min-h-screen w-full max-w-[100vw] overflow-x-hidden">
        <div className="p-4 lg:p-6 mx-auto w-full max-w-full">
          {children}
        </div>
      </main>
    </div>
  );
}

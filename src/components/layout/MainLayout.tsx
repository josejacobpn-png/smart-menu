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
    const trialEnd = restaurant.trial_ends_at && typeof restaurant.trial_ends_at === 'string'
      ? parseISO(restaurant.trial_ends_at)
      : null;
    const subEnd = restaurant.subscription_ends_at && typeof restaurant.subscription_ends_at === 'string'
      ? parseISO(restaurant.subscription_ends_at)
      : null;

    const latestEnd = subEnd || trialEnd;

    // If no dates are set, we don't block access by default
    if (!latestEnd) return false;

    // Check if the current date is after the expiration date
    return isAfter(now, latestEnd);
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

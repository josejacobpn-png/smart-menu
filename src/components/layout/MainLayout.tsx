import { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full relative">
      <Sidebar />
      <main className="lg:pl-72 pt-16 lg:pt-0 min-h-screen w-full max-w-[100vw] overflow-x-hidden">
        <div className="p-4 lg:p-6 mx-auto w-full max-w-full">
          {children}
        </div>
      </main>
    </div>
  );
}

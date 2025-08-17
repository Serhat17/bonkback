import { ReactNode, useEffect } from 'react';
import { Navigation } from './Navigation';
import { BottomNavigation } from './BottomNavigation';
import { Footer } from './Footer';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { useReferral } from '@/hooks/useReferral';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { initialize } = useAppStore();
  const { initialize: initAuth } = useAuthStore();
  const location = useLocation();
  
  // Initialize referral handling
  useReferral();

  useEffect(() => {
    const initializeApp = async () => {
      const cleanup = initAuth();
      await initialize();
      return cleanup;
    };
    
    initializeApp();
  }, [initialize, initAuth]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Desktop Navigation */}
      <Navigation />
      
      {/* Main Content with mobile-safe spacing */}
      <main className="flex-1 pb-24 md:pb-0 relative">
        {children}
      </main>
      
      {/* Mobile Bottom Navigation */}
      <BottomNavigation />
      
      {/* Footer - Hidden on mobile except for homepage */}
      <div className={location.pathname === '/' ? 'block' : 'hidden md:block'}>
        <Footer />
      </div>
    </div>
  );
};
import React, { useEffect } from 'react';
import { getDeviceInfo, addIOSMetaTags } from '@/lib/mobile-utils';

interface MobileLayoutProps {
  children: React.ReactNode;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  useEffect(() => {
    const deviceInfo = getDeviceInfo();
    
    // Add iOS-specific optimizations
    if (deviceInfo.platform === 'ios') {
      addIOSMetaTags();
    }

    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    const preventZoom = (e: TouchEvent) => {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    document.addEventListener('touchend', preventZoom, { passive: false });

    // Cleanup
    return () => {
      document.removeEventListener('touchend', preventZoom);
    };
  }, []);

  return (
    <div className="mobile-layout">
      {children}
    </div>
  );
};
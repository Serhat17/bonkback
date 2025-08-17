// Unified mobile detection hook
import { useState, useEffect } from 'react';

export interface DeviceInfo {
  platform: 'ios' | 'android' | 'desktop' | 'pwa-ios' | 'pwa-android';
  isMobile: boolean;
  isStandalone: boolean;
  userAgent: string;
  screenSize: 'mobile' | 'tablet' | 'desktop';
}

export const useMobileDetection = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => getDeviceInfo());

  function getDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent;
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any)?.standalone ||
      document.referrer.includes('android-app://');

    // Platform detection
    let platform: DeviceInfo['platform'] = 'desktop';
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      platform = isStandalone ? 'pwa-ios' : 'ios';
    } else if (/Android/.test(userAgent)) {
      platform = isStandalone ? 'pwa-android' : 'android';
    }

    // Mobile detection
    const isMobile = platform !== 'desktop' || window.innerWidth <= 768;

    // Screen size detection
    let screenSize: DeviceInfo['screenSize'] = 'desktop';
    if (window.innerWidth <= 768) {
      screenSize = 'mobile';
    } else if (window.innerWidth <= 1024) {
      screenSize = 'tablet';
    }

    return {
      platform,
      isMobile,
      isStandalone,
      userAgent,
      screenSize
    };
  }

  useEffect(() => {
    const handleResize = () => {
      setDeviceInfo(getDeviceInfo());
    };

    const handleDisplayModeChange = () => {
      setDeviceInfo(getDeviceInfo());
    };

    window.addEventListener('resize', handleResize);
    
    // Listen for PWA installation
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  return deviceInfo;
};

// Convenience hooks
export const useIsMobile = (): boolean => {
  const { isMobile } = useMobileDetection();
  return isMobile;
};

export const useIsStandalone = (): boolean => {
  const { isStandalone } = useMobileDetection();
  return isStandalone;
};

export const usePlatform = (): DeviceInfo['platform'] => {
  const { platform } = useMobileDetection();
  return platform;
};
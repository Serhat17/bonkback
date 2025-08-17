/**
 * Mobile device detection and utilities for BonkBack PWA
 */

export interface DeviceInfo {
  platform: 'ios' | 'android' | 'desktop';
  isMobile: boolean;
  isStandalone: boolean;
  userAgent: string;
}

/**
 * Detect the user's device and platform
 */
export const getDeviceInfo = (): DeviceInfo => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  
  // Check if running as PWA (standalone mode)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone ||
                      document.referrer.includes('android-app://');

  // Platform detection
  let platform: 'ios' | 'android' | 'desktop' = 'desktop';
  
  if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
    platform = 'ios';
  } else if (/android/i.test(userAgent)) {
    platform = 'android';
  }

  const isMobile = platform !== 'desktop' || window.innerWidth <= 768;

  return {
    platform,
    isMobile,
    isStandalone,
    userAgent
  };
};

/**
 * Check if the device supports deep linking
 */
export const supportsDeepLinking = (): boolean => {
  const deviceInfo = getDeviceInfo();
  return deviceInfo.isMobile && (deviceInfo.isStandalone || deviceInfo.platform !== 'desktop');
};

/**
 * Open a URL with mobile-specific handling
 */
export const openMobileUrl = (url: string, options: { 
  fallback?: string;
  target?: string;
  useDeepLink?: boolean;
} = {}): Window | null => {
  const { fallback, target = '_blank', useDeepLink = false } = options;
  const deviceInfo = getDeviceInfo();

  // For mobile devices, try to avoid in-app browser issues
  if (deviceInfo.isMobile) {
    try {
      // Try to open in external browser
      const opened = window.open(url, target, 'noopener,noreferrer');
      
      if (!opened && fallback) {
        // Fallback if popup was blocked
        window.location.href = fallback;
      }
      
      return opened;
    } catch (error) {
      console.warn('Failed to open URL:', error);
      
      if (fallback) {
        window.location.href = fallback;
      }
      
      return null;
    }
  }

  // Desktop behavior
  return window.open(url, target);
};

/**
 * Get app store URLs for wallet installation
 */
export const getWalletInstallUrl = (walletName: string, platform?: 'ios' | 'android'): string => {
  const deviceInfo = getDeviceInfo();
  const targetPlatform = platform || deviceInfo.platform;

  const walletUrls: Record<string, Record<string, string>> = {
    'Phantom': {
      ios: 'https://apps.apple.com/app/phantom-crypto-wallet/id1598432977',
      android: 'https://play.google.com/store/apps/details?id=app.phantom'
    },
    'Solflare': {
      ios: 'https://apps.apple.com/app/solflare/id1580902717',
      android: 'https://play.google.com/store/apps/details?id=com.solflare.mobile'
    },
    'Backpack': {
      ios: 'https://apps.apple.com/app/backpack-crypto-wallet/id6448044767',
      android: 'https://play.google.com/store/apps/details?id=app.backpack.mobile'
    }
  };

  return walletUrls[walletName]?.[targetPlatform] || 
         `https://${walletName.toLowerCase()}.app`;
};

/**
 * Attempt to open a wallet deep link
 */
export const openWalletDeepLink = (walletName: string, returnUrl?: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const deviceInfo = getDeviceInfo();
    
    if (!deviceInfo.isMobile) {
      resolve(false);
      return;
    }

    const deepLinks: Record<string, string> = {
      'Phantom': 'phantom://',
      'Solflare': 'solflare://',
      'Backpack': 'backpack://'
    };

    const deepLink = deepLinks[walletName];
    if (!deepLink) {
      resolve(false);
      return;
    }

    const url = returnUrl 
      ? `${deepLink}browse/${encodeURIComponent(returnUrl)}`
      : deepLink;

    try {
      // Set a timeout to detect if the deep link worked
      const timeout = setTimeout(() => {
        resolve(false);
      }, 3000);

      // Listen for app becoming hidden (deep link successful)
      const handleVisibilityChange = () => {
        if (document.hidden) {
          clearTimeout(timeout);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          resolve(true);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Attempt the deep link
      window.location.href = url;

    } catch (error) {
      console.warn('Deep link failed:', error);
      resolve(false);
    }
  });
};

/**
 * Add iOS-specific meta tags for PWA
 */
export const addIOSMetaTags = (): void => {
  const deviceInfo = getDeviceInfo();
  
  if (deviceInfo.platform === 'ios') {
    const head = document.head;
    
    // Check if meta tags already exist
    if (!head.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
      const metaTags = [
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'BonkBack' },
        { name: 'format-detection', content: 'telephone=no' }
      ];

      metaTags.forEach(({ name, content }) => {
        const meta = document.createElement('meta');
        meta.name = name;
        meta.content = content;
        head.appendChild(meta);
      });
    }
  }
};

/**
 * Check if user needs to install PWA
 */
export const canInstallPWA = (): boolean => {
  const deviceInfo = getDeviceInfo();
  return deviceInfo.isMobile && !deviceInfo.isStandalone;
};

/**
 * Handle PWA installation prompt
 */
export const handlePWAInstall = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // This will be triggered by beforeinstallprompt event
    const event = (window as any).deferredPrompt;
    
    if (event) {
      event.prompt();
      event.userChoice.then((choiceResult: any) => {
        resolve(choiceResult.outcome === 'accepted');
        (window as any).deferredPrompt = null;
      });
    } else {
      resolve(false);
    }
  });
};
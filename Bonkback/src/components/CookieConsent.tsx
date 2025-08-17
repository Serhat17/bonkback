import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Cookie, Settings, Shield, BarChart3, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

const COOKIE_CONSENT_KEY = 'bonkback_cookie_consent';
const COOKIE_PREFERENCES_KEY = 'bonkback_cookie_preferences';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
    functional: false
  });

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    const savedPreferences = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    
    if (savedPreferences) {
      setPreferences(JSON.parse(savedPreferences));
    }
    
    // Show banner if no consent recorded
    if (!consent) {
      // Delay showing banner slightly for better UX
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = (acceptedPreferences: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(acceptedPreferences));
    setPreferences(acceptedPreferences);
    setShowBanner(false);
    setShowSettings(false);
    
    // Apply cookie preferences
    applyCookiePreferences(acceptedPreferences);
  };

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true
    };
    saveConsent(allAccepted);
  };

  const acceptNecessary = () => {
    const necessaryOnly = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false
    };
    saveConsent(necessaryOnly);
  };

  const saveCustomPreferences = () => {
    saveConsent(preferences);
  };

  const applyCookiePreferences = (prefs: CookiePreferences) => {
    // Apply analytics cookies
    if (prefs.analytics) {
      // Enable analytics tracking
      console.log('Analytics cookies enabled');
    } else {
      // Disable analytics tracking
      console.log('Analytics cookies disabled');
    }

    // Apply marketing cookies
    if (prefs.marketing) {
      // Enable marketing tracking
      console.log('Marketing cookies enabled');
    } else {
      // Disable marketing tracking
      console.log('Marketing cookies disabled');
    }

    // Apply functional cookies
    if (prefs.functional) {
      // Enable functional cookies
      console.log('Functional cookies enabled');
    } else {
      // Disable functional cookies
      console.log('Functional cookies disabled');
    }
  };

  const handlePreferenceChange = (type: keyof CookiePreferences, value: boolean) => {
    if (type === 'necessary') return; // Cannot disable necessary cookies
    
    setPreferences(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const getCookieDescription = (type: keyof CookiePreferences) => {
    switch (type) {
      case 'necessary':
        return 'Essential for the website to function properly. Cannot be disabled.';
      case 'analytics':
        return 'Help us understand how visitors interact with our website.';
      case 'marketing':
        return 'Used to track visitors and display relevant advertisements.';
      case 'functional':
        return 'Enable enhanced functionality and personalization.';
      default:
        return '';
    }
  };

  const cookieCategories = [
    { key: 'necessary' as const, label: 'Necessary', icon: Shield, required: true },
    { key: 'analytics' as const, label: 'Analytics', icon: BarChart3, required: false },
    { key: 'marketing' as const, label: 'Marketing', icon: Zap, required: false },
    { key: 'functional' as const, label: 'Functional', icon: Settings, required: false }
  ];

  return (
    <>
      {/* Cookie Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4"
          >
            <Card className="max-w-4xl mx-auto shadow-2xl border-2">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <Cookie className="h-8 w-8 text-primary flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">We use cookies</h3>
                      <p className="text-sm text-muted-foreground">
                        We use cookies to enhance your browsing experience, provide personalized content, 
                        and analyze our traffic. By clicking "Accept All", you consent to our use of cookies. 
                        You can customize your preferences or learn more in our{' '}
                        <a href="/privacy" className="underline hover:text-primary">Privacy Policy</a>.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <Button
                      variant="outline"
                      onClick={() => setShowSettings(true)}
                      className="w-full sm:w-auto"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Customize
                    </Button>
                    <Button
                      variant="outline"
                      onClick={acceptNecessary}
                      className="w-full sm:w-auto"
                    >
                      Necessary Only
                    </Button>
                    <Button
                      onClick={acceptAll}
                      className="w-full sm:w-auto btn-primary"
                    >
                      Accept All
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cookie Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5" />
              Cookie Preferences
            </DialogTitle>
            <DialogDescription>
              Manage your cookie preferences. You can enable or disable different types of cookies below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {cookieCategories.map(({ key, label, icon: Icon, required }) => (
              <div key={key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="text-base font-medium flex items-center gap-2">
                        {label}
                        {required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getCookieDescription(key)}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences[key]}
                    onCheckedChange={(value) => handlePreferenceChange(key, value)}
                    disabled={required}
                  />
                </div>
              </div>
            ))}

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">What are cookies?</h4>
              <p className="text-sm text-muted-foreground">
                Cookies are small text files that are placed on your computer or mobile device when you visit a website. 
                They help us provide you with a better experience by remembering your preferences and improving our services.
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={acceptNecessary} className="w-full sm:w-auto">
              Necessary Only
            </Button>
            <Button onClick={saveCustomPreferences} className="w-full sm:w-auto btn-primary">
              Save Preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
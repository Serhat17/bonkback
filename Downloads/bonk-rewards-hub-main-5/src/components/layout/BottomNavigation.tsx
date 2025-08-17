import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  ShoppingBag, 
  Gift, 
  User, 
  Settings,
  Wallet,
  History,
  Plus,
  LogOut
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const navigationItems = [
  { 
    name: 'Home', 
    href: '/dashboard', 
    icon: Home, 
    auth: true,
    primary: true
  },
  { 
    name: 'Offers', 
    href: '/offers', 
    icon: ShoppingBag,
    auth: false
  },
  { 
    name: 'Earn', 
    href: '/gift-cards', 
    icon: Plus,
    auth: true,
    special: true
  },
  { 
    name: 'Wallet', 
    href: '/wallet', 
    icon: Wallet,
    auth: true
  },
  { 
    name: 'History', 
    href: '/transactions', 
    icon: History,
    auth: true
  },
  { 
    name: 'Profile', 
    href: '/settings', 
    icon: User,
    auth: true
  }
];

export const BottomNavigation = () => {
  const location = useLocation();
  const { user, profile, signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
  };

  // Don't show on auth page
  if (location.pathname === '/auth' || location.pathname === '/') {
    return null;
  }

  // Filter navigation based on auth status
  const filteredItems = navigationItems.filter(item => {
    if (item.auth && !user) return false;
    return true;
  });

  return (
    <motion.nav 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/90 backdrop-blur-xl border-t border-border/30"
    >
      {/* Background with blur effect */}
      
      
      {/* Safe area padding for devices with home indicator */}
      <div className="relative px-2 pt-2 pb-safe">
        <div className="mx-auto w-full max-w-lg px-2">
          <div className="rounded-2xl border border-border/30 bg-card/80 backdrop-blur-xl shadow-lg">
            <div className="flex items-center justify-between px-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || 
                           (item.href === '/dashboard' && location.pathname === '/');
            
            return (
              <Link
                key={item.name}
                to={item.href}
                aria-label={item.name}
                className={cn(
                  "relative flex flex-col items-center justify-center p-2 min-w-[3.75rem] transition-all duration-200 hover-scale",
                  item.special ? "mx-2" : ""
                )}
              >
                {/* Special floating button for main action */}
                {item.special ? (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center mb-1 shadow-lg -translate-y-2 animate-scale-in",
                      "bg-gradient-to-r from-primary to-primary/80",
                      "border-4 border-background"
                    )}
                  >
                    <Icon className="w-6 h-6 text-background" />
                  </motion.div>
                ) : (
                  /* Regular navigation icons */
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center mb-1 transition-all duration-200",
                      isActive 
                        ? "bg-primary/15 text-primary shadow-sm" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon className="w-6 h-6" />
                    
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20"
                        initial={false}
                        transition={{ type: "spring", duration: 0.4 }}
                      />
                    )}
                  </motion.div>
                )}
                
                {/* Label */}
                <span 
                  className={cn(
                    "text-xs font-medium transition-colors duration-200",
                    isActive ? "text-primary" : "text-muted-foreground",
                    item.special ? "text-primary" : ""
                  )}
                >
                  {item.name}
                </span>
                
              </Link>
            );
          })}
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};
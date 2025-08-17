import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Gift, 
  Search, 
  Filter,
  Coins,
  ShoppingBag,
  Star
} from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function GiftCards() {
  const { user, profile } = useAuthStore();
  const { giftCards, systemSettings } = useAppStore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState<string | null>(null);

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const filteredGiftCards = giftCards.filter(card => {
    const matchesSearch = card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         card.brand_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleRedeem = async (giftCardId: string, bonkPrice: number) => {
    if (!user || !profile) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to redeem gift cards.',
        variant: 'destructive',
      });
      return;
    }

    setIsRedeeming(giftCardId);

    try {
      // Use the secure atomic redemption function
      const { data, error } = await supabase.rpc('redeem_gift_card_secure', {
        _gift_card_id: giftCardId,
        _bonk_amount: bonkPrice
      });

      if (error) {
        throw error;
      }

      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || 'Redemption failed');
      }

      toast({
        title: 'Redemption Successful!',
        description: 'Your gift card will be processed and sent to you shortly.',
      });

      // Refresh user profile to update balance
      window.location.reload();
    } catch (error: any) {
      console.error('Redemption error:', error);
      
      const errorMessage = error?.message === 'Gift card redemption blocked: normal cashback must be at least 2x your referral rewards.' 
        ? 'You need more legitimate cashback earnings before redeeming. Earn BONK through shopping to unlock gift card redemptions.'
        : error?.message === 'Insufficient available balance after locks'
        ? 'Some of your BONK balance is currently locked. Please wait or check your available balance.'
        : error?.message === 'Gift card not available'
        ? 'This gift card is no longer available.'
        : error?.message || 'There was an error processing your redemption. Please try again.';

      toast({
        title: 'Redemption Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsRedeeming(null);
    }
  };

  const canAfford = (bonkPrice: number) => {
    return profile && profile.bonk_balance >= bonkPrice;
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Gift Cards</h1>
              <p className="text-muted-foreground">
                Convert your BONK tokens into gift cards from popular brands
              </p>
            </div>
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {profile?.bonk_balance?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Available BONK
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search gift cards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </Button>
          </div>
        </motion.div>

        {/* Gift Cards Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {filteredGiftCards.map((giftCard) => (
            <motion.div key={giftCard.id} variants={item}>
              <Card className={`glass-card hover-scale h-full ${
                canAfford(giftCard.bonk_price) 
                  ? 'border-primary/20' 
                  : 'opacity-60'
              }`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
{giftCard.brand_logo_url ? (
  <Logo src={giftCard.brand_logo_url} alt={giftCard.brand_name} size={12} variant="offer" />
) : (
  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
    <Gift className="w-6 h-6 text-primary" />
  </div>
)}
                    <Badge variant="secondary" className="text-xs">
                      {giftCard.currency} {giftCard.fiat_value}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{giftCard.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {giftCard.brand_name}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {giftCard.description && (
                    <p className="text-sm text-muted-foreground">
                      {giftCard.description}
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>BONK Price:</span>
                      <span className="font-medium text-primary">
                        {giftCard.bonk_price.toLocaleString()} BONK
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>USD Value:</span>
                      <span className="font-medium">
                        ${giftCard.fiat_value}
                      </span>
                    </div>
                    {systemSettings && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>USD Cost:</span>
                        <span>
                          ${(giftCard.bonk_price * systemSettings.bonkPriceUsd).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button
                      className="w-full btn-primary"
                      disabled={!canAfford(giftCard.bonk_price) || isRedeeming === giftCard.id}
                      onClick={() => handleRedeem(giftCard.id, giftCard.bonk_price)}
                    >
                      {isRedeeming === giftCard.id ? (
                        'Processing...'
                      ) : canAfford(giftCard.bonk_price) ? (
                        <>
                          <Coins className="mr-2 h-4 w-4" />
                          Redeem
                        </>
                      ) : (
                        'Insufficient BONK'
                      )}
                    </Button>
                  </div>

                  {giftCard.available_quantity > 0 && giftCard.available_quantity < 10 && (
                    <div className="text-xs text-yellow-500 text-center">
                      Only {giftCard.available_quantity} left in stock
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {filteredGiftCards.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Gift className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Gift Cards Found</h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? 'Try adjusting your search terms' 
                : 'No gift cards are currently available'}
            </p>
          </motion.div>
        )}

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12"
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="mr-2 h-5 w-5 text-primary" />
                How Gift Card Redemption Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  <h4 className="font-semibold mb-2">Choose Your Card</h4>
                  <p className="text-sm text-muted-foreground">
                    Select from our range of popular brand gift cards
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-primary font-bold">2</span>
                  </div>
                  <h4 className="font-semibold mb-2">Pay with BONK</h4>
                  <p className="text-sm text-muted-foreground">
                    Use your earned BONK tokens to purchase the gift card
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-primary font-bold">3</span>
                  </div>
                  <h4 className="font-semibold mb-2">Receive Your Code</h4>
                  <p className="text-sm text-muted-foreground">
                    Get your digital gift card code via email within 24 hours
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
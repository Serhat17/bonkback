import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/store/appStore';
import { ArrowLeft, Search, ExternalLink, Filter, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getBaseDomain } from '@/lib/domain';
import { supabase } from '@/integrations/supabase/client';

const AllOffers = () => {
  const navigate = useNavigate();
  const { offers, fetchOffers } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('featured');

  useEffect(() => {
    const loadOffers = async () => {
      await fetchOffers();
      setLoading(false);
    };
    loadOffers();
  }, [fetchOffers]);

  const categories = [...new Set(offers.map(offer => offer.category).filter(Boolean))];
  
  const filteredOffers = offers.filter(offer => {
    const matchesSearch = offer.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         offer.merchant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         offer.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || offer.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const sortedOffers = [...filteredOffers].sort((a, b) => {
    switch (sortBy) {
      case 'featured':
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      case 'cashback_high':
        return b.cashback_percentage - a.cashback_percentage;
      case 'cashback_low':
        return a.cashback_percentage - b.cashback_percentage;
      case 'merchant':
        return a.merchant_name.localeCompare(b.merchant_name);
      default:
        return 0;
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleShopNow = async (offerId: string) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.warn('Auth error when getting user:', authError);
      }
      
      // Use Supabase edge function URL format with proper error handling
      const supabaseUrl = 'https://lnachtwjumapjmabrrrp.supabase.co';
      const redirectUrl = `${supabaseUrl}/functions/v1/r?offer_id=${encodeURIComponent(offerId)}${user ? `&user_id=${encodeURIComponent(user.id)}` : ''}`;
      
      // Track click before redirecting
      if (user) {
        try {
          await supabase.rpc('record_offer_click', {
            p_user_id: user.id,
            p_offer_id: offerId,
            p_ip: '', // Will be filled by the function
            p_user_agent: navigator.userAgent,
            p_referrer: window.location.href
          });
        } catch (clickError) {
          console.warn('Failed to record offer click:', clickError);
        }
      }
      
      window.open(redirectUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error handling shop now:', error);
      
      // Fallback: direct redirect if available
      const offer = offers.find(o => o.id === offerId);
      if (offer?.deeplink) {
        window.open(offer.deeplink, '_blank', 'noopener,noreferrer');
      } else {
        // If no deeplink available, show an error message
        console.error('No deeplink available for offer:', offerId);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading offers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="hidden md:flex"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold">All Cashback Offers</h1>
              <p className="text-muted-foreground">Discover cashback opportunities from our partner merchants</p>
            </div>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter & Sort Offers
              </CardTitle>
              <CardDescription>
                Find the perfect cashback offers for your shopping needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search offers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category!}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featured">Featured First</SelectItem>
                    <SelectItem value="cashback_high">Highest Cashback</SelectItem>
                    <SelectItem value="cashback_low">Lowest Cashback</SelectItem>
                    <SelectItem value="merchant">Merchant A-Z</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center text-sm text-muted-foreground">
                  {sortedOffers.length} offer(s) found
                </div>
              </div>
            </CardContent>
          </Card>

          {sortedOffers.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No offers found matching your criteria.</p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('all');
                  }}
                  className="mt-4"
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedOffers.map((offer, index) => (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.05 }}
                >
                  <Card className={`h-full hover:shadow-lg transition-shadow ${offer.featured ? 'border-primary/20' : ''}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {offer.merchant_name}
                            {offer.featured && (
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            )}
                          </CardTitle>
                          <CardDescription className="font-medium text-primary">
                            {offer.title}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="text-lg font-bold">
                          {offer.cashback_percentage}%
                        </Badge>
                      </div>
                      {offer.category && (
                        <Badge variant="outline" className="w-fit">
                          {offer.category}
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent>
                      {offer.description && (
                        <p className="text-muted-foreground mb-4 line-clamp-3">
                          {offer.description}
                        </p>
                      )}
                      
                      <div className="space-y-2 mb-4">
                        {offer.max_cashback && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Max Cashback:</span>
                            <span className="font-medium">${offer.max_cashback}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Valid From:</span>
                          <span className="font-medium">{formatDate(offer.valid_from)}</span>
                        </div>
                        {offer.valid_until && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Valid Until:</span>
                            <span className="font-medium">{formatDate(offer.valid_until)}</span>
                          </div>
                        )}
                      </div>

                      <Button 
                        className="w-full"
                        onClick={() => handleShopNow(offer.id)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Shop Now
                      </Button>
                      
                      {offer.terms_conditions && (
                        <details className="mt-4">
                          <summary className="text-sm text-muted-foreground cursor-pointer hover:text-primary">
                            Terms & Conditions
                          </summary>
                          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                            {offer.terms_conditions}
                          </p>
                        </details>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AllOffers;
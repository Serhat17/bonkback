import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Store, Star, TrendingUp, Shield, CheckCircle } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';

const MerchantGuide = () => {
  const topMerchants = [
    { name: "Amazon", category: "Everything", cashback: "3-8%", rating: 5 },
    { name: "Target", category: "Retail", cashback: "5-12%", rating: 5 },
    { name: "Nike", category: "Fashion", cashback: "8-15%", rating: 4 },
    { name: "Best Buy", category: "Electronics", cashback: "4-10%", rating: 5 },
    { name: "Walmart", category: "Groceries", cashback: "2-6%", rating: 4 },
    { name: "Home Depot", category: "Home & Garden", cashback: "6-12%", rating: 4 }
  ];

  const categories = [
    { name: "Fashion & Apparel", range: "8-20%", merchants: 150 },
    { name: "Electronics", range: "4-12%", merchants: 85 },
    { name: "Home & Garden", range: "6-15%", merchants: 120 },
    { name: "Travel & Hotels", range: "5-25%", merchants: 200 },
    { name: "Food & Dining", range: "3-10%", merchants: 75 },
    { name: "Health & Beauty", range: "8-18%", merchants: 90 }
  ];

  const tips = [
    "Check cashback rates before shopping - they can change seasonally",
    "Look for new merchant promotions with higher introductory rates",
    "Some merchants offer bonus rates for first-time shoppers",
    "Stack merchant sales with BonkBack cashback for maximum savings",
    "Follow your favorite merchants for exclusive offers",
    "Check for minimum purchase requirements on some offers"
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <RouterLink 
            to="/help" 
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Help Center
          </RouterLink>

          <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Partner Merchant Guide
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl">
            Discover our partner merchants and learn how to maximize your BONK token earnings across different categories.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-12"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Store className="h-6 w-6 text-primary" />
                  <CardTitle>Top Partner Merchants</CardTitle>
                </div>
                <CardDescription>
                  Our most popular merchants offering great cashback rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topMerchants.map((merchant, index) => (
                    <div key={merchant.name} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{merchant.name}</h3>
                        <div className="flex">
                          {[...Array(merchant.rating)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{merchant.category}</p>
                      <Badge variant="secondary">{merchant.cashback} BONK</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  <CardTitle>Cashback by Category</CardTitle>
                </div>
                <CardDescription>
                  Explore different shopping categories and their typical cashback ranges
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {categories.map((category, index) => (
                    <div key={category.name} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium">{category.name}</h3>
                        <Badge>{category.range}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {category.merchants} partner merchants
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-12"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-primary" />
                  <CardTitle>Merchant Shopping Tips</CardTitle>
                </div>
                <CardDescription>
                  Get the most out of your merchant partnerships
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {tips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Start Shopping with Our Partners</CardTitle>
                <CardDescription>
                  Browse all available offers and start earning BONK tokens today.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button asChild>
                  <RouterLink to="/offers">Browse All Offers</RouterLink>
                </Button>
                <Button variant="outline" asChild>
                  <RouterLink to="/partners">View All Partners</RouterLink>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default MerchantGuide;
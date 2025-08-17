import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Coins, ShoppingCart, Gift, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const HowCashbackWorks = () => {
  const cashbackSteps = [
    {
      title: "Shop at Partner Stores",
      description: "Browse our partner merchants and make purchases",
      icon: ShoppingCart,
      details: "Visit any of our 500+ partner merchants through BonkBack links or use our browser extension. Popular partners include major retailers, online marketplaces, and subscription services.",
      percentage: "Up to 15% cashback"
    },
    {
      title: "Earn BONK Tokens",
      description: "Get cashback in BONK cryptocurrency for every purchase",
      icon: Coins,
      details: "Your cashback is automatically calculated based on your purchase amount and the merchant's cashback rate. BONK tokens are credited to your account within 24-48 hours.",
      percentage: "Instant conversion"
    },
    {
      title: "Track Your Earnings",
      description: "Monitor your cashback history and pending rewards",
      icon: Clock,
      details: "View all your transactions, pending cashback, and total earnings in your dashboard. Get notifications when new cashback is credited to your account.",
      percentage: "Real-time tracking"
    },
    {
      title: "Use or Convert",
      description: "Exchange BONK for gift cards or keep as cryptocurrency",
      icon: Gift,
      details: "Convert your BONK tokens to popular gift cards, transfer to your external wallet, or hold them as investment. Minimum conversion threshold is 1000 BONK tokens.",
      percentage: "Flexible options"
    }
  ];

  const cashbackRates = [
    { category: "Electronics", rate: "5-8%", popular: ["Best Buy", "Amazon", "Newegg"] },
    { category: "Fashion", rate: "8-15%", popular: ["Nike", "Adidas", "H&M"] },
    { category: "Travel", rate: "3-6%", popular: ["Booking.com", "Expedia", "Hotels.com"] },
    { category: "Food Delivery", rate: "5-10%", popular: ["DoorDash", "Uber Eats", "Grubhub"] },
    { category: "Streaming", rate: "2-5%", popular: ["Netflix", "Spotify", "Disney+"] },
    { category: "Gaming", rate: "4-8%", popular: ["Steam", "Epic Games", "PlayStation"] }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Link to="/help" className="inline-flex items-center gap-2 text-primary hover:underline mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to Help Center
          </Link>

          <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            How Cashback Works
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12">
            Understand how you earn BONK tokens through our cashback system and maximize your rewards.
          </p>

          <div className="space-y-8 mb-16">
            {cashbackSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                        <step.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xl">{step.title}</CardTitle>
                          <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                            {step.percentage}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-1">{step.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{step.details}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold mb-8">Cashback Rates by Category</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cashbackRates.map((category, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{category.category}</CardTitle>
                      <span className="text-primary font-bold">{category.rate}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">Popular merchants:</p>
                    <div className="space-y-1">
                      {category.popular.map((merchant, i) => (
                        <div key={i} className="text-sm bg-muted/50 px-2 py-1 rounded">
                          {merchant}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Maximize Your Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-sm">Always shop through BonkBack links or browser extension</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-sm">Look for special bonus cashback events and promotions</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-sm">Refer friends to earn bonus BONK tokens on their purchases</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-sm">Stack cashback with merchant sales and promotional offers</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button asChild>
                    <Link to="/offers">Browse Offers</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/help">More Help Articles</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default HowCashbackWorks;
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShoppingCart, Search, CreditCard, Gift, CheckCircle } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';

const FirstPurchase = () => {
  const steps = [
    {
      title: "Browse Available Offers",
      description: "Find cashback deals from our partner merchants",
      icon: Search,
      details: "Visit our offers page to see all available cashback deals. Filter by category or search for specific merchants you love shopping with.",
      tip: "Check the cashback percentage before shopping"
    },
    {
      title: "Click Through from BonkBack",
      description: "Always start your shopping journey from our platform",
      icon: ShoppingCart,
      details: "Click on the merchant offer from BonkBack to be redirected to their website. This ensures your purchase is tracked for cashback.",
      tip: "Don't use coupon sites that might interfere with tracking"
    },
    {
      title: "Complete Your Purchase",
      description: "Shop normally and complete your transaction",
      icon: CreditCard,
      details: "Shop as you normally would on the merchant's website. Use any payment method you prefer - the cashback tracking is based on your click-through, not payment method.",
      tip: "Keep your browser cookies enabled for proper tracking"
    },
    {
      title: "Earn BONK Tokens",
      description: "Receive your cashback in BONK tokens",
      icon: Gift,
      details: "Your cashback will be calculated and added to your BonkBack account. Processing times vary by merchant but typically take 24-72 hours.",
      tip: "Check your dashboard to track pending cashback"
    }
  ];

  const tips = [
    "Always clear your shopping cart before starting from BonkBack",
    "Disable ad blockers that might interfere with tracking",
    "Complete purchases in the same browser session",
    "Check if purchases are excluded (gift cards, etc.)",
    "Keep receipts until cashback is confirmed"
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
            Making Your First Purchase
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl">
            Follow these simple steps to earn BONK tokens on your first purchase through BonkBack.
          </p>

          <div className="grid gap-8 mb-12">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                        <step.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{step.title}</CardTitle>
                        <CardDescription className="text-base">{step.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{step.details}</p>
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Tip: {step.tip}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-12"
          >
            <Card>
              <CardHeader>
                <CardTitle>Pro Tips for Success</CardTitle>
                <CardDescription>
                  Follow these best practices to ensure your purchases are tracked properly
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
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Ready to Start Shopping?</CardTitle>
                <CardDescription>
                  Browse our available offers and start earning BONK tokens on your purchases today.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button asChild>
                  <RouterLink to="/offers">Browse Offers</RouterLink>
                </Button>
                <Button variant="outline" asChild>
                  <RouterLink to="/help">More Help Articles</RouterLink>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default FirstPurchase;
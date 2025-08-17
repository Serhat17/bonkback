import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, ShoppingCart, Gift, Users } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      icon: ShoppingCart,
      title: "Shop at Partner Stores",
      description: "Browse our extensive network of partner merchants and make purchases as usual.",
      details: "Simply shop through our platform or use our browser extension to activate cashback automatically."
    },
    {
      icon: Coins,
      title: "Earn BONK Tokens",
      description: "Get rewarded with BONK tokens for every qualifying purchase you make.",
      details: "Earn up to 15% cashback in BONK tokens, depending on the merchant and offer."
    },
    {
      icon: Gift,
      title: "Convert to Gift Cards",
      description: "Exchange your earned BONK tokens for gift cards from popular brands.",
      details: "Choose from hundreds of gift card options or keep your BONK tokens for future use."
    },
    {
      icon: Users,
      title: "Refer Friends",
      description: "Invite friends to join BonkBack and earn bonus BONK tokens for every referral.",
      details: "Both you and your friend receive 333,333 BONK tokens when they make their first qualifying purchase."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            How BonkBack Works
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Discover how simple it is to earn BONK tokens with every purchase and turn your everyday shopping into crypto rewards.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <step.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                  </div>
                  <CardTitle className="text-xl">{step.title}</CardTitle>
                  <CardDescription className="text-base">
                    {step.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{step.details}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center"
        >
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to Start Earning?</CardTitle>
              <CardDescription>
                Join thousands of users who are already earning BONK tokens with their everyday purchases.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-primary mb-2">15%</div>
                  <div className="text-muted-foreground">Maximum Cashback</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary mb-2">500+</div>
                  <div className="text-muted-foreground">Partner Merchants</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary mb-2">24/7</div>
                  <div className="text-muted-foreground">Support Available</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default HowItWorks;
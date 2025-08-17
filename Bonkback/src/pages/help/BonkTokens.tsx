import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Coins, TrendingUp, Zap, Shield, Gift, CheckCircle } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';

const BonkTokens = () => {
  const features = [
    {
      title: "Fast & Low-Cost",
      description: "Built on Solana for lightning-fast transactions",
      icon: Zap,
      details: "BONK tokens benefit from Solana's high-speed, low-cost blockchain infrastructure, making transactions quick and affordable."
    },
    {
      title: "Community-Driven",
      description: "The first dog coin for the people, by the people",
      icon: TrendingUp,
      details: "BONK was designed as a community token, with fair distribution and a focus on building utility within the Solana ecosystem."
    },
    {
      title: "Secure & Reliable",
      description: "Backed by Solana's robust blockchain technology",
      icon: Shield,
      details: "Your BONK tokens are secured by Solana's proof-of-stake consensus mechanism and can be stored in any Solana-compatible wallet."
    },
    {
      title: "Multiple Use Cases",
      description: "Trade, hold, or convert to gift cards",
      icon: Gift,
      details: "Use your BONK tokens in various ways - convert to gift cards, trade on exchanges, or hold as an investment."
    }
  ];

  const useCases = [
    "Convert to popular gift cards through BonkBack",
    "Trade on major cryptocurrency exchanges",
    "Hold as a potential investment",
    "Use in Solana DeFi applications",
    "Participate in the BONK community ecosystem"
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
            Understanding BONK Tokens
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl">
            Learn about BONK tokens - the community-driven cryptocurrency that powers your BonkBack rewards.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-12"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                    <Coins className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">What is BONK?</CardTitle>
                    <CardDescription className="text-lg">
                      BONK is a community-driven memecoin built on the Solana blockchain
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  BONK was launched as the first dog-themed coin on Solana, designed to bring fun and utility to the ecosystem. 
                  Unlike many cryptocurrencies, BONK was distributed fairly to the community, with a focus on building real-world use cases. 
                  At BonkBack, we've integrated BONK as your cashback reward token, giving it practical utility in everyday shopping.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <feature.icon className="h-6 w-6 text-primary" />
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.details}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-12"
          >
            <Card>
              <CardHeader>
                <CardTitle>What Can You Do with BONK Tokens?</CardTitle>
                <CardDescription>
                  Your BONK rewards from BonkBack can be used in multiple ways
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {useCases.map((useCase, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{useCase}</span>
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
                <CardTitle>Start Earning BONK Today</CardTitle>
                <CardDescription>
                  Ready to start earning BONK tokens through cashback? Browse our offers or learn more about the platform.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button asChild>
                  <RouterLink to="/offers">Browse Offers</RouterLink>
                </Button>
                <Button variant="outline" asChild>
                  <RouterLink to="/help/cashback-works">How Cashback Works</RouterLink>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default BonkTokens;
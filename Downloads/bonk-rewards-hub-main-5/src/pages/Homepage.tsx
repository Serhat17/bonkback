import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Gift, 
  Shield, 
  Zap, 
  ArrowRight,
  Star,
  Store,
  Coins
} from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function Homepage() {
  const { featuredOffers, systemSettings } = useAppStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const features = [
    {
      icon: Coins,
      title: 'Earn BONK Tokens',
      description: 'Get cashback in BONK tokens for every qualifying purchase'
    },
    {
      icon: Gift,
      title: 'Convert to Gift Cards',
      description: 'Trade your BONK tokens for gift cards from popular brands'
    },
    {
      icon: Shield,
      title: 'Secure & Transparent',
      description: 'Web3 technology ensures secure and transparent transactions'
    },
    {
      icon: Zap,
      title: 'Instant Rewards',
      description: 'Receive your BONK cashback instantly after verified purchases'
    }
  ];

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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              Earn <span className="text-gradient">BONK</span> with
              <br />Every Purchase
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              The future of cashback is here. Shop with our partners and earn BONK tokens 
              that you can convert to gift cards or hold for rewards.
            </p>
            
            {/* BONK Price Display */}
            {systemSettings && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center glass-card px-6 py-3 mb-8"
              >
                <TrendingUp className="w-5 h-5 text-primary mr-2" />
                <span className="text-sm text-muted-foreground mr-2">BONK Price:</span>
                <span className="font-bold text-primary">
                  ${systemSettings.bonkPriceUsd.toFixed(8)}
                </span>
              </motion.div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link to="/dashboard">
                  <Button size="lg" className="btn-primary text-lg px-8 py-6 w-full sm:w-auto">
                    Go to Dashboard
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              ) : (
                <Link to="/auth">
                  <Button size="lg" className="btn-primary text-lg px-8 py-6 w-full sm:w-auto">
                    Start Earning BONK
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              )}
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-6 w-full sm:w-auto"
                onClick={() => {
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Learn More
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Why Choose BonkBack?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the next generation of cashback rewards with Web3 technology
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div key={index} variants={item}>
                  <Card className="glass-card text-center h-full hover-scale">
                    <CardHeader>
                      <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Icon className="w-8 h-8 text-background" />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Featured Offers Section */}
      {featuredOffers.length > 0 && (
        <section className="py-20 px-4 bg-secondary/20">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl font-bold mb-4">Featured Cashback Offers</h2>
              <p className="text-xl text-muted-foreground">
                Start earning BONK with these exclusive partner deals
              </p>
            </motion.div>

            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {featuredOffers.slice(0, 6).map((offer, index) => (
                <motion.div key={offer.id} variants={item}>
                  <Card className="glass-card hover-scale h-full">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
{offer.merchant_logo_url ? (
  <Logo src={offer.merchant_logo_url} alt={offer.merchant_name} size={12} variant="offer" />
) : (
  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
    <Store className="w-6 h-6 text-primary" />
  </div>
)}
                          <div>
                            <CardTitle className="text-lg">{offer.merchant_name}</CardTitle>
                            <Badge variant="secondary" className="mt-1">
                              <Star className="w-3 h-3 mr-1" />
                              Featured
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {offer.cashback_percentage}%
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Cashback
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="mb-4">
                        {offer.description || offer.title}
                      </CardDescription>
                      {offer.max_cashback && (
                        <div className="text-sm text-muted-foreground">
                          Max cashback: ${offer.max_cashback}
                        </div>
                      )}
                      <Button 
                        className="w-full mt-4 btn-primary"
                        onClick={() => {
                          // Navigate to offer page with tracking
                          window.open(offer.deeplink || '#', '_blank');
                        }}
                        disabled={!offer.deeplink}
                      >
                        {offer.deeplink ? 'Shop Now' : 'Coming Soon'}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            <div className="text-center mt-12">
              <div className="flex justify-center">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-lg px-8 py-4"
                  onClick={() => navigate('/offers')}
                >
                  Browse All Offers
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">How BonkBack Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Earning BONK cashback is simple and rewarding
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {[
              {
                step: '1',
                title: 'Sign Up & Connect',
                description: 'Create your BonkBack account and optionally connect your Web3 wallet'
              },
              {
                step: '2',
                title: 'Shop with Partners',
                description: 'Browse our cashback offers and shop with verified merchant partners'
              },
              {
                step: '3',
                title: 'Earn BONK Rewards',
                description: 'Receive BONK tokens as cashback and convert them to gift cards'
              }
            ].map((step, index) => (
              <motion.div key={index} variants={item}>
                <Card className="glass-card text-center">
                  <CardHeader>
                    <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-background">
                      {step.step}
                    </div>
                    <CardTitle className="text-xl">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {step.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="pt-10 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-6">
              Ready to Start Earning BONK?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of users already earning Web3 cashback rewards
            </p>
            {!user && (
              <div className="flex justify-center">
                <Link to="/auth">
                  <Button size="lg" className="btn-primary text-lg px-8 py-6 animate-glow-pulse">
                    Get Started Now
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
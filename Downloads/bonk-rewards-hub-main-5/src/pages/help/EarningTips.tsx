import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Target, Calendar, TrendingUp, Users, Gift, Star, CheckCircle } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';

const EarningTips = () => {
  const strategies = [
    {
      title: "Stack Multiple Offers",
      description: "Combine BonkBack with credit card rewards and store promotions",
      icon: Target,
      level: "Advanced",
      tips: [
        "Use cashback credit cards for additional rewards",
        "Shop during merchant sales and promotions",
        "Look for bonus cashback categories",
        "Time purchases with seasonal offers"
      ]
    },
    {
      title: "Plan Your Shopping",
      description: "Strategic timing can maximize your cashback earnings",
      icon: Calendar,
      level: "Intermediate",
      tips: [
        "Check for increased cashback rates before shopping",
        "Wait for special promotion periods",
        "Bundle purchases to hit minimum thresholds",
        "Use shopping lists to stay focused"
      ]
    },
    {
      title: "Leverage High-Rate Categories",
      description: "Focus on merchants offering the highest cashback percentages",
      icon: TrendingUp,
      level: "Beginner",
      tips: [
        "Prioritize 10%+ cashback offers",
        "Check fashion and electronics for high rates",
        "Look for new merchant promotions",
        "Subscribe to offer notifications"
      ]
    },
    {
      title: "Maximize Referrals",
      description: "Earn bonus BONK tokens by inviting friends and family",
      icon: Users,
      level: "All Levels",
      tips: [
        "Share your referral link on social media",
        "Explain the benefits to friends and family",
        "Help new users get started",
        "Earn ongoing bonuses from referral activity"
      ]
    }
  ];

  const quickTips = [
    {
      tip: "Always clear your cart before clicking through BonkBack",
      category: "Tracking"
    },
    {
      tip: "Disable ad blockers when shopping for cashback",
      category: "Technical"
    },
    {
      tip: "Complete purchases in the same browser session",
      category: "Tracking"
    },
    {
      tip: "Check exclusions before making large purchases",
      category: "Strategy"
    },
    {
      tip: "Keep receipts until cashback is confirmed",
      category: "Safety"
    },
    {
      tip: "Follow merchants on social media for exclusive offers",
      category: "Strategy"
    }
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Beginner": return "bg-green-100 text-green-800";
      case "Intermediate": return "bg-yellow-100 text-yellow-800";
      case "Advanced": return "bg-red-100 text-red-800";
      default: return "bg-blue-100 text-blue-800";
    }
  };

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
            Best Practices for Earning
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl">
            Maximize your BONK token earnings with these proven strategies and expert tips.
          </p>

          <div className="grid gap-8 mb-12">
            {strategies.map((strategy, index) => (
              <motion.div
                key={strategy.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                          <strategy.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{strategy.title}</CardTitle>
                          <CardDescription className="text-base">{strategy.description}</CardDescription>
                        </div>
                      </div>
                      <Badge className={getLevelColor(strategy.level)}>
                        {strategy.level}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {strategy.tips.map((tip, tipIndex) => (
                        <li key={tipIndex} className="flex items-start gap-3">
                          <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                          <span className="text-muted-foreground">{tip}</span>
                        </li>
                      ))}
                    </ul>
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
                <div className="flex items-center gap-3">
                  <Star className="h-6 w-6 text-primary" />
                  <CardTitle>Quick Tips for Success</CardTitle>
                </div>
                <CardDescription>
                  Essential tips to ensure you never miss out on cashback
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {quickTips.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                      <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{item.tip}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {item.category}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
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
                <CardTitle>Ready to Maximize Your Earnings?</CardTitle>
                <CardDescription>
                  Put these strategies into action and start earning more BONK tokens today.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button asChild>
                  <RouterLink to="/offers">Browse High-Rate Offers</RouterLink>
                </Button>
                <Button variant="outline" asChild>
                  <RouterLink to="/dashboard">Check Your Dashboard</RouterLink>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default EarningTips;
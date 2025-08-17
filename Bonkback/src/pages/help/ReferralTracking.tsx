import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Eye, TrendingUp, Gift, CheckCircle } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';

const ReferralTracking = () => {
  const trackingFeatures = [
    {
      title: "Real-time Dashboard",
      description: "Monitor your referral performance instantly",
      icon: TrendingUp,
      details: "View live stats on referred users, their activity, and your earned bonuses. Track conversion rates and optimize your referral strategy."
    },
    {
      title: "Referral Analytics",
      description: "Detailed insights into your referral network",
      icon: Eye,
      details: "See which channels perform best, track click-through rates, and understand your audience to improve your referral success."
    },
    {
      title: "Bonus History",
      description: "Complete record of all referral earnings",
      icon: Gift,
      details: "Track all bonus payments, pending rewards, and historical earnings with detailed transaction records and payment dates."
    },
    {
      title: "Network Growth",
      description: "Visualize your referral network expansion",
      icon: Users,
      details: "See your referral tree grow over time, track active vs inactive referrals, and identify your most valuable connections."
    }
  ];

  const tips = [
    "Check your dashboard daily to monitor new referrals",
    "Use UTM parameters in your links to track different channels",
    "Monitor conversion rates to optimize your referral strategy",
    "Track which friends are most active to focus your efforts",
    "Set up notifications for new referral sign-ups",
    "Review monthly reports to understand trends"
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
            Tracking Your Referrals
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl">
            Learn how to monitor and optimize your referral performance with BonkBack's comprehensive tracking tools.
          </p>

          <div className="grid gap-8 mb-12">
            {trackingFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{feature.title}</CardTitle>
                        <CardDescription className="text-base">{feature.description}</CardDescription>
                      </div>
                    </div>
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
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-12"
          >
            <Card>
              <CardHeader>
                <CardTitle>Tracking Best Practices</CardTitle>
                <CardDescription>
                  Maximize your referral success with these proven strategies
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
                <CardTitle>View Your Referral Dashboard</CardTitle>
                <CardDescription>
                  Access your complete referral tracking and analytics dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button asChild>
                  <RouterLink to="/dashboard">View Dashboard</RouterLink>
                </Button>
                <Button variant="outline" asChild>
                  <RouterLink to="/help/refer-friends">How to Refer</RouterLink>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default ReferralTracking;
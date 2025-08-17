import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Gift, Users, TrendingUp, Star, CheckCircle } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';

const ReferralBonuses = () => {
  const bonusStructure = [
    {
      milestone: "Friend Signs Up",
      referrer: "5,000 BONK",
      referee: "5,000 BONK",
      description: "Instant bonus when your friend creates an account"
    },
    {
      milestone: "First Purchase",
      referrer: "25,000 BONK",
      referee: "15,000 BONK",
      description: "When your friend makes their first qualifying purchase"
    },
    {
      milestone: "Reach $100 in Purchases",
      referrer: "50,000 BONK",
      referee: "25,000 BONK",
      description: "Bonus when friend reaches $100 in total purchases"
    },
    {
      milestone: "Reach $500 in Purchases",
      referrer: "100,000 BONK",
      referee: "50,000 BONK",
      description: "Additional bonus at $500 purchase milestone"
    }
  ];

  const tierBenefits = [
    {
      tier: "Bronze",
      requirement: "1-4 active referrals",
      bonus: "1.1x multiplier",
      color: "bg-amber-100 text-amber-800"
    },
    {
      tier: "Silver",
      requirement: "5-9 active referrals",
      bonus: "1.25x multiplier",
      color: "bg-gray-100 text-gray-800"
    },
    {
      tier: "Gold",
      requirement: "10-19 active referrals",
      bonus: "1.5x multiplier",
      color: "bg-yellow-100 text-yellow-800"
    },
    {
      tier: "Diamond",
      requirement: "20+ active referrals",
      bonus: "2x multiplier",
      color: "bg-blue-100 text-blue-800"
    }
  ];

  const specialPromotions = [
    "Double referral bonuses during holiday seasons",
    "Limited-time 10x bonuses for new merchant launches",
    "Community challenges with massive bonus pools",
    "VIP status for top referrers with exclusive perks"
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
            Referral Bonus Structure
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl">
            Discover how much you and your friends can earn through our generous referral program.
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
                  <Gift className="h-6 w-6 text-primary" />
                  <CardTitle>Milestone Bonuses</CardTitle>
                </div>
                <CardDescription>
                  Earn bonuses as your friends reach different milestones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bonusStructure.map((bonus, index) => (
                    <div key={bonus.milestone} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{bonus.milestone}</h3>
                        <div className="flex gap-2">
                          <Badge variant="secondary">You: {bonus.referrer}</Badge>
                          <Badge variant="outline">Friend: {bonus.referee}</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{bonus.description}</p>
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
                  <Star className="h-6 w-6 text-primary" />
                  <CardTitle>Referral Tiers & Multipliers</CardTitle>
                </div>
                <CardDescription>
                  Higher referral tiers unlock bonus multipliers on all your earnings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {tierBenefits.map((tier, index) => (
                    <div key={tier.tier} className="text-center p-4 border rounded-lg">
                      <Badge className={`mb-3 ${tier.color}`}>
                        {tier.tier}
                      </Badge>
                      <h3 className="font-semibold mb-2">{tier.bonus}</h3>
                      <p className="text-sm text-muted-foreground">{tier.requirement}</p>
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
                  <TrendingUp className="h-6 w-6 text-primary" />
                  <CardTitle>Special Promotions</CardTitle>
                </div>
                <CardDescription>
                  Watch for these limited-time bonus opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {specialPromotions.map((promotion, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{promotion}</span>
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
            className="mb-12"
          >
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary">Pro Tip: Active Referrals</CardTitle>
                <CardDescription>
                  Referrals are considered "active" when they make at least one purchase per month. 
                  Maintaining active referrals keeps your tier status and multiplier bonuses.
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Start Referring Today</CardTitle>
                <CardDescription>
                  Get your unique referral link and start earning bonus BONK tokens.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button asChild>
                  <RouterLink to="/dashboard">Get Referral Link</RouterLink>
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

export default ReferralBonuses;
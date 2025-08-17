import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Share2, Users, Gift, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

const HowToReferFriends = () => {
  const referralSteps = [
    {
      title: "Get Your Referral Link",
      description: "Find your unique referral link in your dashboard",
      icon: Share2,
      details: "Navigate to the 'Referrals' section in your BonkBack dashboard. Copy your personalized referral link or use the built-in sharing tools for social media.",
      bonus: "Unique tracking code"
    },
    {
      title: "Share with Friends",
      description: "Invite friends through social media, email, or direct messaging",
      icon: Users,
      details: "Share your referral link via WhatsApp, Facebook, Twitter, email, or any messaging platform. Include a personal message about your BonkBack experience.",
      bonus: "Multiple sharing options"
    },
    {
      title: "Friend Signs Up",
      description: "Your friend creates an account using your referral link",
      icon: Gift,
      details: "When someone clicks your link and creates a BonkBack account, they're automatically linked as your referral. They'll also receive a welcome bonus!",
      bonus: "500 BONK welcome bonus"
    },
    {
      title: "Earn Together",
      description: "Both you and your friend earn bonus rewards",
      icon: Trophy,
      details: "You earn 10% of your friend's cashback for their first 90 days, plus bonus rewards for milestones. Your friend gets extra cashback on their first purchase.",
      bonus: "Ongoing rewards"
    }
  ];

  const bonusStructure = [
    { milestone: "Friend's first purchase", yourBonus: "1,000 BONK", friendBonus: "500 BONK" },
    { milestone: "Friend earns 5,000 BONK", yourBonus: "500 BONK", friendBonus: "250 BONK" },
    { milestone: "Friend earns 15,000 BONK", yourBonus: "1,500 BONK", friendBonus: "750 BONK" },
    { milestone: "Friend earns 50,000 BONK", yourBonus: "5,000 BONK", friendBonus: "2,500 BONK" },
    { milestone: "Friend stays active for 90 days", yourBonus: "10,000 BONK", friendBonus: "5,000 BONK" }
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
            How to Refer Friends
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12">
            Invite your friends to BonkBack and earn bonus BONK tokens when they shop. It's a win-win for everyone!
          </p>

          <div className="space-y-8 mb-16">
            {referralSteps.map((step, index) => (
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
                            {step.bonus}
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
            <h2 className="text-2xl font-bold mb-8">Referral Bonus Structure</h2>
            <Card>
              <CardHeader>
                <CardTitle>Milestone Rewards</CardTitle>
                <p className="text-muted-foreground">
                  Earn bonus BONK tokens as your referred friends reach spending milestones
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bonusStructure.map((bonus, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{bonus.milestone}</p>
                      </div>
                      <div className="flex gap-6 text-sm">
                        <div className="text-center">
                          <p className="text-muted-foreground">You earn</p>
                          <p className="font-bold text-primary">{bonus.yourBonus}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Friend earns</p>
                          <p className="font-bold text-primary">{bonus.friendBonus}</p>
                        </div>
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
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mb-12"
          >
            <Card>
              <CardHeader>
                <CardTitle>Best Practices for Referrals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-sm">Share your personal experience with BonkBack and how much you've earned</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-sm">Mention the welcome bonus your friend will receive for signing up</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-sm">Help your friend get started with their first cashback purchase</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-sm">Share during shopping seasons for maximum impact</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Ready to Start Referring?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  Start inviting friends today and watch your BONK earnings multiply. The more friends you refer, the more you earn!
                </p>
                <div className="flex gap-4">
                  <Button asChild>
                    <Link to="/dashboard">Get My Referral Link</Link>
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

export default HowToReferFriends;
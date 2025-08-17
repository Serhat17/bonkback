import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useReferral } from '@/hooks/useReferral';
import { useAuthStore } from '@/store/authStore';
import { Users, Copy, Gift, TrendingUp } from 'lucide-react';

export const ReferralCard = () => {
  const { profile } = useAuthStore();
  const { referralStats, generateReferralLink, copyReferralLink, claimReferralReward, isProcessing } = useReferral();
  const [referralLink, setReferralLink] = useState('https://bonkback.com');

  useEffect(() => {
    const updateReferralLink = async () => {
      const link = await generateReferralLink();
      if (link) {
        setReferralLink(link);
      }
    };
    updateReferralLink();
  }, [generateReferralLink, profile?.referral_code]);

  const stats = [
    {
      title: 'Total Referrals',
      value: referralStats.totalReferrals,
      icon: Users,
      color: 'text-blue-500'
    },
    {
      title: 'BONK Earned',
      value: referralStats.totalRewards.toLocaleString(),
      icon: TrendingUp,
      color: 'text-primary'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Gift className="mr-2 h-5 w-5 text-primary" />
            Referral Program
          </CardTitle>
          <CardDescription>
            Earn 333,333 BONK (€5) for each friend you refer!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Referral Stats */}
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center p-3 border border-border/20 rounded-lg">
                  <Icon className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
                  <div className="text-lg font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.title}</div>
                </div>
              );
            })}
          </div>

          {/* Referral Code */}
          {profile?.referral_code && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Referral Code</label>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                  {profile.referral_code}
                </Badge>
              </div>
            </div>
          )}

          {/* Referral Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share Your Referral Link</label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 p-2 bg-muted/50 rounded-lg border border-border/20">
                <p className="text-xs text-muted-foreground truncate">
                  {referralLink}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={copyReferralLink}
                className="shrink-0"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Claim Rewards Button */}
          <div className="space-y-2">
            <Button
              onClick={claimReferralReward}
              disabled={isProcessing}
              className="w-full"
              variant="default"
            >
              <Gift className="w-4 h-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Claim Pending Rewards'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Click to process any unclaimed referral rewards
            </p>
          </div>

          {/* How it works */}
          <div className="text-xs text-muted-foreground p-3 bg-muted/20 rounded-lg">
            <strong>How it works:</strong>
            <br />
            • Share your referral link with friends
            <br />
            • Both you and your friend get 333,333 BONK (≈5€) when they sign up
            <br />
            • Rewards are credited instantly upon first login
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
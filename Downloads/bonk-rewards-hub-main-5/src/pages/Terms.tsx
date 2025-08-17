import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Terms() {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-4">Terms & Conditions</h1>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>BonkBack Terms of Service</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <h3>1. Acceptance of Terms</h3>
              <p>
                By accessing and using BonkBack ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement.
              </p>

              <h3>2. Use License</h3>
              <p>
                Permission is granted to temporarily download one copy of BonkBack for personal, non-commercial transitory viewing only.
              </p>

              <h3>3. Cashback Program</h3>
              <p>
                BonkBack provides cashback rewards in BONK tokens for qualifying purchases made through our partner merchants. Rewards are subject to verification and approval.
              </p>

              <h3>4. User Accounts</h3>
              <p>
                Users must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials.
              </p>

              <h3>5. BONK Tokens</h3>
              <p>
                BONK tokens earned through our platform can be converted to gift cards or held in your account. Token values may fluctuate based on market conditions.
              </p>

              <h3>6. Referral Program</h3>
              <p>
                Our referral program rewards users for successful referrals. Abuse of the referral system may result in account suspension and forfeiture of rewards.
              </p>

              <h3>7. Privacy</h3>
              <p>
                Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Platform.
              </p>

              <h3>8. Modifications</h3>
              <p>
                BonkBack may revise these terms of service at any time without notice. By using this Platform, you are agreeing to be bound by the current version of these terms.
              </p>

              <h3>9. Contact Information</h3>
              <p>
                For questions about these Terms, please contact us at legal@bonkback.app
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
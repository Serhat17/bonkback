import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';

const ReferralTerms = () => {
  const terms = [
    {
      title: "Eligibility Requirements",
      icon: Shield,
      content: [
        "Must have an active BonkBack account in good standing",
        "Cannot refer yourself or create multiple accounts",
        "Referred users must be new to BonkBack platform",
        "Both referrer and referee must complete KYC verification"
      ]
    },
    {
      title: "Bonus Structure",
      icon: CheckCircle,
      content: [
        "Referral bonuses are paid in BONK tokens",
        "Bonus amounts may vary based on current promotions",
        "Bonuses are credited after referee's first successful purchase",
        "Minimum purchase threshold may apply for bonus eligibility"
      ]
    },
    {
      title: "Payment Terms",
      icon: FileText,
      content: [
        "Bonuses are typically processed within 7-14 business days",
        "Payments are made directly to your connected wallet",
        "Tax reporting may be required for bonus earnings",
        "BonkBack reserves the right to verify all referral activity"
      ]
    },
    {
      title: "Prohibited Activities",
      icon: AlertTriangle,
      content: [
        "No spam or unsolicited referral messaging",
        "Cannot use misleading or false advertising",
        "Prohibited from incentivizing fake sign-ups",
        "Cannot manipulate referral tracking systems"
      ]
    }
  ];

  const importantNotes = [
    "Referral bonuses are subject to change without notice",
    "BonkBack may suspend accounts that violate referral terms",
    "Bonuses may be revoked if referred users are inactive",
    "All referral activity is subject to fraud detection",
    "International users may have different bonus structures",
    "Corporate or business referrals may require special approval"
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
            Referral Terms & Conditions
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl">
            Important terms and conditions governing the BonkBack referral program. Please read carefully.
          </p>

          <div className="grid gap-8 mb-12">
            {terms.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                        <section.icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{section.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {section.content.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start gap-3">
                          <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                          <span className="text-muted-foreground">{item}</span>
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
                  <AlertTriangle className="h-6 w-6 text-yellow-500" />
                  <CardTitle>Important Notes</CardTitle>
                </div>
                <CardDescription>
                  Additional terms and conditions that apply to all referral activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {importantNotes.map((note, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-1 flex-shrink-0" />
                      <span className="text-muted-foreground">{note}</span>
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
                <CardTitle>Questions About Referral Terms?</CardTitle>
                <CardDescription>
                  Contact our support team for clarification on any referral terms or conditions.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button asChild>
                  <RouterLink to="/contact">Contact Support</RouterLink>
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

export default ReferralTerms;
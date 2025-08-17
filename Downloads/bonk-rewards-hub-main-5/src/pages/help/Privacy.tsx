import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Eye, Lock, Download, CheckCircle } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';

const Privacy = () => {
  const privacyAreas = [
    {
      title: "Data Collection",
      description: "What information we collect and why",
      icon: Eye,
      details: "We collect minimal data necessary for service operation: account information, transaction history, and usage analytics. All data collection is transparent and consent-based.",
      controls: [
        "View all collected data",
        "Control marketing preferences",
        "Manage cookie settings",
        "Opt-out of analytics tracking"
      ]
    },
    {
      title: "Data Usage",
      description: "How we use your personal information",
      icon: Shield,
      details: "Your data is used solely for service delivery, security, and improvement. We never sell personal information to third parties.",
      controls: [
        "Review data usage purposes",
        "Control personalization features",
        "Manage sharing preferences",
        "Set communication limits"
      ]
    },
    {
      title: "Data Security",
      description: "How we protect your information",
      icon: Lock,
      details: "Bank-level encryption, secure servers, and regular security audits protect your data. Wallet keys are never stored on our servers.",
      controls: [
        "Enable additional security features",
        "Review security activity",
        "Set up security alerts",
        "Manage device access"
      ]
    },
    {
      title: "Your Rights",
      description: "Control over your personal data",
      icon: Download,
      details: "You have complete control over your data including the right to access, correct, delete, or export your information at any time.",
      controls: [
        "Download your data",
        "Request data correction",
        "Delete specific information",
        "Close your account"
      ]
    }
  ];

  const privacyTips = [
    "Regularly review your privacy settings",
    "Use strong, unique passwords for your account",
    "Enable two-factor authentication",
    "Be cautious about sharing referral links publicly",
    "Review app permissions periodically",
    "Keep your wallet software updated"
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
            Privacy Settings
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl">
            Understand and control how your personal information is collected, used, and protected on BonkBack.
          </p>

          <div className="grid gap-8 mb-12">
            {privacyAreas.map((area, index) => (
              <motion.div
                key={area.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                        <area.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{area.title}</CardTitle>
                        <CardDescription className="text-base">{area.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{area.details}</p>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Available Controls:</h4>
                      <ul className="space-y-2">
                        {area.controls.map((control, controlIndex) => (
                          <li key={controlIndex} className="flex items-start gap-3">
                            <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">{control}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
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
                <CardTitle>Privacy Best Practices</CardTitle>
                <CardDescription>
                  Tips to maintain your privacy while using BonkBack
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {privacyTips.map((tip, index) => (
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
                <CardTitle>Manage Your Privacy</CardTitle>
                <CardDescription>
                  Access your privacy settings and review our complete privacy policy.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button asChild>
                  <RouterLink to="/account-settings">Privacy Settings</RouterLink>
                </Button>
                <Button variant="outline" asChild>
                  <RouterLink to="/privacy">Privacy Policy</RouterLink>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Privacy;
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Shield, Lock, Eye, Smartphone, AlertTriangle, CheckCircle } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';

const AccountSecurity = () => {
  const securityFeatures = [
    {
      title: "Two-Factor Authentication (2FA)",
      description: "Add an extra layer of security to your account",
      icon: Smartphone,
      steps: [
        "Go to Account Settings > Security",
        "Click 'Enable 2FA'",
        "Scan QR code with authenticator app",
        "Enter verification code to confirm"
      ],
      status: "Highly Recommended"
    },
    {
      title: "Strong Password Requirements",
      description: "Create a secure password for your account",
      icon: Lock,
      steps: [
        "Minimum 12 characters long",
        "Include uppercase and lowercase letters",
        "Add numbers and special characters",
        "Avoid common words or personal information"
      ],
      status: "Required"
    },
    {
      title: "Account Monitoring",
      description: "Track login activity and wallet connections",
      icon: Eye,
      steps: [
        "Review login history regularly",
        "Check wallet connection logs",
        "Monitor transaction history",
        "Report suspicious activity immediately"
      ],
      status: "Available"
    }
  ];

  const bestPractices = [
    "Never share your account credentials with anyone",
    "Use a unique password not used on other sites",
    "Keep your email account secure with 2FA",
    "Log out from public or shared computers",
    "Update your password regularly (every 3-6 months)",
    "Be cautious of phishing emails or fake websites",
    "Only access BonkBack through official domains",
    "Keep your browser and security software updated"
  ];

  const warningSigns = [
    "Unexpected login notifications",
    "Changes you didn't make to your profile",
    "Unrecognized transactions or wallet connections",
    "Emails about password changes you didn't initiate",
    "Missing BONK tokens or rewards",
    "Suspicious referral activity"
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
            Password and Security
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl">
            Keep your BonkBack account and BONK tokens secure with these essential security practices.
          </p>

          <Alert className="mb-8">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Notice:</strong> BonkBack will never ask for your password, wallet seed phrase, or private keys via email or phone. Always verify communications through official channels.
            </AlertDescription>
          </Alert>

          <div className="grid gap-8 mb-12">
            {securityFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                          <feature.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{feature.title}</CardTitle>
                          <CardDescription className="text-base">{feature.description}</CardDescription>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        feature.status === 'Required' ? 'bg-red-100 text-red-800' :
                        feature.status === 'Highly Recommended' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {feature.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {feature.steps.map((step, stepIndex) => (
                        <li key={stepIndex} className="flex items-start gap-3">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-xs font-medium text-primary mt-0.5">
                            {stepIndex + 1}
                          </span>
                          <span className="text-muted-foreground">{step}</span>
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
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-12"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-primary" />
                  <CardTitle>Security Best Practices</CardTitle>
                </div>
                <CardDescription>
                  Follow these guidelines to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {bestPractices.map((practice, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <span className="text-muted-foreground">{practice}</span>
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
            <Card className="border-destructive/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                  <CardTitle className="text-destructive">Warning Signs of Compromise</CardTitle>
                </div>
                <CardDescription>
                  Contact support immediately if you notice any of these
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {warningSigns.map((sign, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-1 flex-shrink-0" />
                      <span className="text-muted-foreground">{sign}</span>
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
                <CardTitle>Need Help with Security?</CardTitle>
                <CardDescription>
                  Our security team is here to help protect your account and funds.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button asChild>
                  <RouterLink to="/settings">Security Settings</RouterLink>
                </Button>
                <Button variant="outline" asChild>
                  <RouterLink to="/contact">Contact Security Team</RouterLink>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default AccountSecurity;
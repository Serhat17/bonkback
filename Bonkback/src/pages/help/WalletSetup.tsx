import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wallet, Download, Link, Shield, CheckCircle } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';

const WalletSetup = () => {
  const steps = [
    {
      title: "Download Phantom Wallet",
      description: "Get the most popular Solana wallet for easy BONK token management",
      icon: Download,
      details: "Visit phantom.app and download the browser extension or mobile app. Phantom is the recommended wallet for BonkBack users.",
      tip: "Available for Chrome, Firefox, Safari, and mobile devices"
    },
    {
      title: "Create Your Wallet",
      description: "Set up a new wallet or import an existing one",
      icon: Wallet,
      details: "Follow Phantom's setup wizard to create a new wallet. Make sure to securely store your seed phrase - this is your backup and recovery method.",
      tip: "Never share your seed phrase with anyone"
    },
    {
      title: "Connect to BonkBack",
      description: "Link your wallet to your BonkBack account",
      icon: Link,
      details: "Go to your BonkBack dashboard and click 'Connect Wallet'. Select Phantom from the list and approve the connection.",
      tip: "You can change your connected wallet anytime in settings"
    },
    {
      title: "Secure Your Setup",
      description: "Enable additional security features",
      icon: Shield,
      details: "Enable biometric authentication, set up auto-lock, and consider using a hardware wallet for larger amounts.",
      tip: "Regular security updates keep your tokens safe"
    }
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
            Setting Up Your Wallet
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl">
            Learn how to set up and connect your Solana wallet to start earning BONK tokens with BonkBack.
          </p>

          <div className="grid gap-8 mb-12">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                        <step.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{step.title}</CardTitle>
                        <CardDescription className="text-base">{step.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{step.details}</p>
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Tip: {step.tip}</span>
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
          >
            <Card>
              <CardHeader>
                <CardTitle>Ready to Connect?</CardTitle>
                <CardDescription>
                  Once your wallet is set up, head to your dashboard to connect it and start earning BONK tokens.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button asChild>
                  <RouterLink to="/dashboard">Go to Dashboard</RouterLink>
                </Button>
                <Button variant="outline" asChild>
                  <RouterLink to="/help">More Help Articles</RouterLink>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default WalletSetup;
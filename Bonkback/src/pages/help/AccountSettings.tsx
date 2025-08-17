import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings, User, Wallet, Bell, Shield, CheckCircle } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';

const AccountSettings = () => {
  const settingsSections = [
    {
      title: "Profile Information",
      description: "Manage your personal details and preferences",
      icon: User,
      details: "Update your name, email, phone number, and profile picture. Set your communication preferences and language settings.",
      settings: [
        "Personal information (name, email, phone)",
        "Profile picture and display preferences",
        "Communication language",
        "Time zone and regional settings"
      ]
    },
    {
      title: "Wallet Management",
      description: "Configure your connected wallets and payment preferences",
      icon: Wallet,
      details: "Connect or disconnect Solana wallets, set your primary wallet for BONK token receipts, and manage backup wallets.",
      settings: [
        "Connect/disconnect Solana wallets",
        "Set primary wallet for rewards",
        "Manage backup wallets",
        "Wallet security settings"
      ]
    },
    {
      title: "Notification Preferences",
      description: "Control what notifications you receive and how",
      icon: Bell,
      details: "Customize email, push, and in-app notifications for cashback, referrals, account activity, and promotional offers.",
      settings: [
        "Email notification preferences",
        "Push notification settings",
        "In-app notification control",
        "Marketing communication opt-in/out"
      ]
    },
    {
      title: "Privacy & Security",
      description: "Manage your account security and privacy settings",
      icon: Shield,
      details: "Enable two-factor authentication, manage app permissions, control data sharing, and review security activity.",
      settings: [
        "Two-factor authentication (2FA)",
        "App permissions and integrations",
        "Data sharing preferences",
        "Security activity log"
      ]
    }
  ];

  const quickActions = [
    "Change your password",
    "Update payment information",
    "Modify notification settings",
    "Connect a new wallet",
    "Enable two-factor authentication",
    "Download your data"
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
            Account Settings
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl">
            Learn how to manage your BonkBack account settings, preferences, and security options.
          </p>

          <div className="grid gap-8 mb-12">
            {settingsSections.map((section, index) => (
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
                      <div>
                        <CardTitle className="text-xl">{section.title}</CardTitle>
                        <CardDescription className="text-base">{section.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{section.details}</p>
                    <ul className="space-y-2">
                      {section.settings.map((setting, settingIndex) => (
                        <li key={settingIndex} className="flex items-start gap-3">
                          <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{setting}</span>
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
                  <Settings className="h-6 w-6 text-primary" />
                  <CardTitle>Quick Actions</CardTitle>
                </div>
                <CardDescription>
                  Common account management tasks you can perform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {quickActions.map((action, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{action}</span>
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
                <CardTitle>Manage Your Account</CardTitle>
                <CardDescription>
                  Access your account settings dashboard to make changes and updates.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button asChild>
                  <RouterLink to="/account-settings">Account Settings</RouterLink>
                </Button>
                <Button variant="outline" asChild>
                  <RouterLink to="/help/security">Security Help</RouterLink>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default AccountSettings;
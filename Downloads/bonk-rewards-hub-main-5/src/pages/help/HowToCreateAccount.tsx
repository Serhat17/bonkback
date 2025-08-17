import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, User, Mail, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const HowToCreateAccount = () => {
  const steps = [
    {
      title: "Visit BonkBack",
      description: "Navigate to the BonkBack homepage and click 'Sign Up'",
      icon: User,
      details: "Click the 'Get Started' or 'Sign Up' button prominently displayed on our homepage. This will redirect you to our secure registration page."
    },
    {
      title: "Enter Your Information",
      description: "Provide your email address and create a secure password",
      icon: Mail,
      details: "Enter a valid email address that you have access to. Create a strong password with at least 8 characters, including uppercase letters, lowercase letters, and numbers."
    },
    {
      title: "Verify Your Email",
      description: "Check your inbox and click the verification link",
      icon: Shield,
      details: "We'll send a verification email to your registered address. Click the verification link within 24 hours to activate your account."
    },
    {
      title: "Complete Your Profile",
      description: "Add your wallet address and personal preferences",
      icon: CheckCircle,
      details: "Connect your Solana wallet (like Phantom) to start earning BONK tokens. You can also set up your referral preferences and cashback notifications."
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
          <Link to="/help" className="inline-flex items-center gap-2 text-primary hover:underline mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to Help Center
          </Link>

          <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            How to Create an Account
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12">
            Follow these simple steps to create your BonkBack account and start earning cashback in BONK tokens.
          </p>

          <div className="space-y-8">
            {steps.map((step, index) => (
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
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-primary">Step {index + 1}</span>
                        </div>
                        <CardTitle className="text-xl">{step.title}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{step.description}</p>
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
            className="mt-12"
          >
            <Card>
              <CardHeader>
                <CardTitle>Ready to Get Started?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  Creating an account takes less than 2 minutes. Start earning BONK tokens on your purchases today!
                </p>
                <div className="flex gap-4">
                  <Button asChild>
                    <Link to="/auth">Create Account Now</Link>
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

export default HowToCreateAccount;
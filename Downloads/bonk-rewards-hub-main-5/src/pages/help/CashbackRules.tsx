import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Clock, DollarSign, Shield, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';

const CashbackRules = () => {
  const generalRules = [
    "Cashback is calculated on the final purchase amount after discounts",
    "You must click through from BonkBack to the merchant's website",
    "Complete your purchase in the same browser session",
    "Cashback typically processes within 24-72 hours of purchase",
    "Returns and cancellations will result in cashback deduction",
    "Multiple accounts per household may be subject to review"
  ];

  const excluded = [
    "Gift card purchases (unless specifically stated)",
    "Tax, shipping, and handling fees",
    "Returns, exchanges, and cancellations",
    "Purchases made with store credit or promotional codes not listed on BonkBack",
    "Bulk or wholesale purchases",
    "Fraudulent or suspicious transactions"
  ];

  const limits = [
    { period: "Daily", individual: "1,000,000 BONK", household: "2,000,000 BONK" },
    { period: "Monthly", individual: "25,000,000 BONK", household: "50,000,000 BONK" },
    { period: "Annual", individual: "250,000,000 BONK", household: "500,000,000 BONK" }
  ];

  const processingTimes = [
    { merchant: "Amazon", time: "24-48 hours", note: "Usually faster during weekdays" },
    { merchant: "Target", time: "1-3 days", note: "May take longer during sales events" },
    { merchant: "Fashion retailers", time: "2-5 days", note: "After return period expires" },
    { merchant: "Travel bookings", time: "7-14 days", note: "After trip completion" },
    { merchant: "Electronics", time: "24-72 hours", note: "Standard processing time" }
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
            Cashback Limits and Rules
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl">
            Understand our cashback system rules, limits, and processing guidelines to maximize your BONK token earnings.
          </p>

          <Alert className="mb-8">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Always start your shopping journey from BonkBack to ensure proper tracking. Using coupon sites or other cashback services may interfere with tracking.
            </AlertDescription>
          </Alert>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-12"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-primary" />
                  <CardTitle>General Cashback Rules</CardTitle>
                </div>
                <CardDescription>
                  Essential rules that apply to all cashback transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {generalRules.map((rule, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <span className="text-muted-foreground">{rule}</span>
                    </li>
                  ))}
                </ul>
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
                  <DollarSign className="h-6 w-6 text-primary" />
                  <CardTitle>Cashback Limits</CardTitle>
                </div>
                <CardDescription>
                  Maximum BONK tokens you can earn per time period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Period</th>
                        <th className="text-left p-3">Individual Limit</th>
                        <th className="text-left p-3">Household Limit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {limits.map((limit, index) => (
                        <tr key={limit.period} className="border-b">
                          <td className="p-3 font-medium">{limit.period}</td>
                          <td className="p-3 text-muted-foreground">{limit.individual}</td>
                          <td className="p-3 text-muted-foreground">{limit.household}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                  <X className="h-6 w-6 text-destructive" />
                  <CardTitle>Excluded Purchases</CardTitle>
                </div>
                <CardDescription>
                  These purchases do not qualify for cashback
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {excluded.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <X className="h-4 w-4 text-destructive mt-1 flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
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
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Clock className="h-6 w-6 text-primary" />
                  <CardTitle>Processing Times by Merchant Type</CardTitle>
                </div>
                <CardDescription>
                  Typical timeframes for cashback to appear in your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {processingTimes.map((item, index) => (
                    <div key={item.merchant} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{item.merchant}</h3>
                        <p className="text-sm text-muted-foreground">{item.note}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium">{item.time}</span>
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
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Questions About These Rules?</CardTitle>
                <CardDescription>
                  Contact our support team if you need clarification on any cashback rules or limits.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button asChild>
                  <RouterLink to="/contact">Contact Support</RouterLink>
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

export default CashbackRules;
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, BookOpen, MessageCircle, Mail, Phone, Clock, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const HelpCenter = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const helpCategories = [
    {
      title: "Getting Started",
      icon: BookOpen,
      description: "Learn the basics of using BonkBack",
      articles: [
        { title: "How to create an account", link: "/help/create-account" },
        { title: "Setting up your wallet", link: "/help/wallet-setup" },
        { title: "Making your first purchase", link: "/help/first-purchase" },
        { title: "Understanding BONK tokens", link: "/help/bonk-tokens" }
      ]
    },
    {
      title: "Earning Cashback",
      icon: CheckCircle,
      description: "Maximize your earnings with BonkBack",
      articles: [
        { title: "How cashback works", link: "/help/cashback-works" },
        { title: "Best practices for earning", link: "/help/earning-tips" },
        { title: "Partner merchant guide", link: "/help/merchants" },
        { title: "Cashback limits and rules", link: "/help/cashback-rules" }
      ]
    },
    {
      title: "Referrals",
      icon: MessageCircle,
      description: "Invite friends and earn bonuses",
      articles: [
        { title: "How to refer friends", link: "/help/refer-friends" },
        { title: "Referral bonus structure", link: "/help/referral-bonuses" },
        { title: "Tracking your referrals", link: "/help/referral-tracking" },
        { title: "Referral terms and conditions", link: "/help/referral-terms" }
      ]
    },
    {
      title: "Account & Security",
      icon: Mail,
      description: "Manage your account securely",
      articles: [
        { title: "Account settings", link: "/help/account-settings" },
        { title: "Password and security", link: "/help/security" },
        { title: "Privacy settings", link: "/help/privacy" },
        { title: "Data protection", link: "/help/data-protection" }
      ]
    }
  ];

  const supportOptions = [
    {
      type: "Live Chat",
      icon: MessageCircle,
      description: "Get instant help from our support team",
      availability: "Available 24/7",
      action: "Start Chat",
      variant: "default" as const
    },
    {
      type: "Email Support",
      icon: Mail,
      description: "Send us a detailed message about your issue",
      availability: "Response within 24 hours",
      action: "Send Email",
      variant: "outline" as const
    },
    {
      type: "Phone Support",
      icon: Phone,
      description: "Speak directly with a support representative",
      availability: "Mon-Fri, 9AM-6PM EST",
      action: "Call Now",
      variant: "outline" as const
    }
  ];

  const popularArticles = [
    "How to connect your Phantom wallet",
    "Understanding cashback processing times",
    "Converting BONK tokens to gift cards",
    "Troubleshooting payment issues",
    "Setting up browser extension",
    "Managing referral links"
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Help Center
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Find answers to your questions, learn how to use BonkBack effectively, and get the support you need.
          </p>
          
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search for help articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold mb-8">Browse by Category</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {helpCategories.map((category, index) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <category.icon className="h-6 w-6 text-primary" />
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                    </div>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {category.articles.map((article, articleIndex) => (
                        <li key={articleIndex}>
                          <Link 
                            to={article.link} 
                            className="text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors block"
                          >
                            {article.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold mb-8">Popular Articles</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-4">
                {popularArticles.map((article, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span className="text-sm">{article}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold mb-8">Contact Support</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {supportOptions.map((option, index) => (
              <motion.div
                key={option.type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <option.icon className="h-6 w-6 text-primary" />
                      <CardTitle className="text-lg">{option.type}</CardTitle>
                    </div>
                    <CardDescription>{option.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{option.availability}</span>
                    </div>
                    <Button variant={option.variant} className="w-full">
                      {option.action}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center"
        >
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Need More Help?</CardTitle>
              <CardDescription>
                Our comprehensive documentation and community forum are also available to help you succeed with BonkBack.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline">
                View Documentation
              </Button>
              <Button variant="outline">
                Join Community
              </Button>
              <Button>
                Contact Sales
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default HelpCenter;
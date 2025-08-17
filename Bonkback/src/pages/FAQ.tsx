import { motion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, MessageCircle } from 'lucide-react';

const FAQ = () => {
  const faqs = [
    {
      question: "What is BonkBack and how does it work?",
      answer: "BonkBack is a cashback platform that rewards you with BONK tokens for shopping at partner merchants. Simply shop through our platform or browser extension, and earn tokens that can be converted to gift cards or kept as cryptocurrency."
    },
    {
      question: "How do I earn BONK tokens?",
      answer: "You earn BONK tokens by making purchases at our partner merchants. The cashback percentage varies by merchant, ranging from 2% to 15%. You also earn bonus tokens by referring friends to the platform."
    },
    {
      question: "What can I do with my BONK tokens?",
      answer: "You can convert your BONK tokens to gift cards from popular brands, keep them as cryptocurrency investment, or use them for future purchases. The choice is yours!"
    },
    {
      question: "Is there a minimum withdrawal amount?",
      answer: "Yes, the minimum withdrawal amount is equivalent to $10 USD worth of BONK tokens. This helps cover transaction fees and ensures efficient processing."
    },
    {
      question: "How long does it take to receive my cashback?",
      answer: "Cashback is typically credited to your account within 24-48 hours after your purchase is confirmed by the merchant. Some merchants may take up to 7 business days for confirmation."
    },
    {
      question: "Can I refer friends and earn bonuses?",
      answer: "Yes! Both you and your friend receive 333,333 BONK tokens when they make their first qualifying purchase. There's no limit to how many friends you can refer."
    },
    {
      question: "How do I connect my wallet?",
      answer: "You can connect your Solana wallet (such as Phantom) through the dashboard. This allows you to receive BONK tokens directly to your wallet and manage your crypto assets."
    },
    {
      question: "Is my personal information secure?",
      answer: "Yes, we take security seriously. We use industry-standard encryption, comply with GDPR regulations, and never store sensitive payment information. Your data is protected and only used for cashback processing."
    },
    {
      question: "Which merchants are available?",
      answer: "We partner with over 500 merchants including Amazon, eBay, Nike, Apple, Booking.com, and many more. Check our Partners page for the complete list and current cashback rates."
    },
    {
      question: "Are there any fees to use BonkBack?",
      answer: "BonkBack is completely free to use. There are no signup fees, monthly fees, or transaction fees. You only benefit from earning cashback on your purchases."
    },
    {
      question: "Can I use BonkBack internationally?",
      answer: "Currently, BonkBack is available in select regions. We're working to expand globally. Check our supported countries list or contact support for availability in your area."
    },
    {
      question: "What if I have issues with my cashback?",
      answer: "If you experience any issues with your cashback, contact our support team with your purchase details. We'll investigate and resolve the issue within 2-3 business days."
    }
  ];

  const categories = [
    {
      title: "Getting Started",
      icon: HelpCircle,
      items: faqs.slice(0, 4)
    },
    {
      title: "Earning & Rewards",
      icon: HelpCircle,
      items: faqs.slice(4, 8)
    },
    {
      title: "Account & Security",
      icon: HelpCircle,
      items: faqs.slice(8, 12)
    }
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
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Find answers to common questions about BonkBack, BONK tokens, and how to maximize your cashback rewards.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          {categories.map((category, categoryIndex) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
              className="mb-12"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <category.icon className="h-6 w-6 text-primary" />
                    <CardTitle className="text-2xl">{category.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {category.items.map((faq, index) => (
                      <AccordionItem key={index} value={`item-${categoryIndex}-${index}`}>
                        <AccordionTrigger className="text-left">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-16"
        >
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <MessageCircle className="h-6 w-6" />
                Still Have Questions?
              </CardTitle>
              <CardDescription>
                Can't find the answer you're looking for? Our support team is here to help.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline">
                Contact Support
              </Button>
              <Button>
                Visit Help Center
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default FAQ;
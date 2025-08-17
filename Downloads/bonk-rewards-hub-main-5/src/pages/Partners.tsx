import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ExternalLink } from 'lucide-react';
import { useState } from 'react';

const Partners = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const partners = [
    {
      name: "Amazon",
      category: "E-commerce",
      cashback: "5%",
      description: "The world's largest online marketplace with millions of products.",
      featured: true
    },
    {
      name: "eBay",
      category: "E-commerce",
      cashback: "3%",
      description: "Global online auction and shopping platform.",
      featured: true
    },
    {
      name: "Nike",
      category: "Fashion",
      cashback: "8%",
      description: "Leading athletic footwear and apparel brand.",
      featured: true
    },
    {
      name: "Apple",
      category: "Technology",
      cashback: "2%",
      description: "Premium technology products and services.",
      featured: true
    },
    {
      name: "Booking.com",
      category: "Travel",
      cashback: "6%",
      description: "World's leading accommodation booking platform.",
      featured: false
    },
    {
      name: "Walmart",
      category: "Retail",
      cashback: "4%",
      description: "America's largest retailer with everyday low prices.",
      featured: false
    },
    {
      name: "Best Buy",
      category: "Electronics",
      cashback: "7%",
      description: "Leading consumer electronics retailer.",
      featured: false
    },
    {
      name: "Adidas",
      category: "Fashion",
      cashback: "9%",
      description: "Global sportswear and lifestyle brand.",
      featured: false
    },
    {
      name: "Target",
      category: "Retail",
      cashback: "5%",
      description: "Popular American retail corporation.",
      featured: false
    },
    {
      name: "Home Depot",
      category: "Home & Garden",
      cashback: "6%",
      description: "Leading home improvement and construction retailer.",
      featured: false
    }
  ];

  const categories = [...new Set(partners.map(p => p.category))];
  
  const filteredPartners = partners.filter(partner =>
    partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const featuredPartners = filteredPartners.filter(p => p.featured);
  const regularPartners = filteredPartners.filter(p => !p.featured);

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
            Our Partners
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Shop at your favorite brands and earn BONK tokens with every purchase. Discover cashback opportunities across hundreds of merchants.
          </p>
          
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search partners or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </motion.div>

        {featuredPartners.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold mb-8">Featured Partners</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredPartners.map((partner, index) => (
                <motion.div
                  key={partner.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow border-primary/20">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <CardTitle className="text-lg">{partner.name}</CardTitle>
                        <Badge variant="secondary">{partner.cashback} BONK</Badge>
                      </div>
                      <Badge variant="outline" className="w-fit">
                        {partner.category}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="mb-4">
                        {partner.description}
                      </CardDescription>
                      <Button variant="outline" size="sm" className="w-full">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Shop Now
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {regularPartners.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold mb-8">All Partners</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularPartners.map((partner, index) => (
                <motion.div
                  key={partner.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.05 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <CardTitle className="text-lg">{partner.name}</CardTitle>
                        <Badge variant="secondary">{partner.cashback} BONK</Badge>
                      </div>
                      <Badge variant="outline" className="w-fit">
                        {partner.category}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="mb-4">
                        {partner.description}
                      </CardDescription>
                      <Button variant="outline" size="sm" className="w-full">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Shop Now
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-16"
        >
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Want to Become a Partner?</CardTitle>
              <CardDescription>
                Join our growing network of merchants and start offering BONK cashback to millions of users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg">
                Partner With Us
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Partners;
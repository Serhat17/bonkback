import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Database, Shield, Lock, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';

const DataProtection = () => {
  const protectionMeasures = [
    {
      title: "Encryption at Rest",
      description: "All stored data is encrypted using AES-256",
      icon: Lock,
      details: "Your personal information, transaction history, and account data are encrypted using military-grade AES-256 encryption when stored on our servers."
    },
    {
      title: "Secure Transmission",
      description: "Data in transit protected by TLS 1.3",
      icon: Shield,
      details: "All data transmitted between your device and our servers uses the latest TLS 1.3 encryption protocol, ensuring your information cannot be intercepted."
    },
    {
      title: "Access Controls",
      description: "Strict employee access limitations",
      icon: Database,
      details: "Only authorized personnel can access user data, with multi-factor authentication required and all access logged for audit purposes."
    },
    {
      title: "Regular Audits",
      description: "Independent security assessments",
      icon: FileText,
      details: "Third-party security firms regularly audit our systems and practices to identify and address potential vulnerabilities."
    }
  ];

  const dataTypes = [
    {
      type: "Account Information",
      retention: "Until account deletion",
      purpose: "Service delivery and support"
    },
    {
      type: "Transaction History",
      retention: "7 years (regulatory requirement)",
      purpose: "Cashback processing and tax reporting"
    },
    {
      type: "Usage Analytics",
      retention: "2 years maximum",
      purpose: "Service improvement and optimization"
    },
    {
      type: "Communication Records",
      retention: "3 years",
      purpose: "Support history and quality assurance"
    }
  ];

  const yourRights = [
    "Right to access your personal data",
    "Right to correct inaccurate information",
    "Right to delete your data (with some exceptions)",
    "Right to restrict processing of your data",
    "Right to data portability",
    "Right to object to data processing"
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
            Data Protection
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl">
            Learn how BonkBack protects your personal data and complies with privacy regulations like GDPR and CCPA.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-12"
          >
            <Card>
              <CardHeader>
                <CardTitle>Security Measures</CardTitle>
                <CardDescription>
                  Technical and organizational measures we use to protect your data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {protectionMeasures.map((measure, index) => (
                    <div key={measure.title} className="flex gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 flex-shrink-0">
                        <measure.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{measure.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{measure.description}</p>
                        <p className="text-xs text-muted-foreground">{measure.details}</p>
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
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12"
          >
            <Card>
              <CardHeader>
                <CardTitle>Data Retention Policies</CardTitle>
                <CardDescription>
                  How long we keep different types of data and why
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dataTypes.map((data, index) => (
                    <div key={data.type} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium">{data.type}</h3>
                        <span className="text-sm text-primary font-medium">{data.retention}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{data.purpose}</p>
                    </div>
                  ))}
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
                <CardTitle>Your Data Rights</CardTitle>
                <CardDescription>
                  Rights you have regarding your personal data under privacy laws
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {yourRights.map((right, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{right}</span>
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
                  <AlertTriangle className="h-6 w-6 text-yellow-500" />
                  <CardTitle>Data Breach Protocol</CardTitle>
                </div>
                <CardDescription>
                  What happens if there's ever a security incident
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Immediate containment and assessment within 1 hour</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Notification to authorities within 72 hours (where required)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Direct notification to affected users within 72 hours</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Full transparency report published within 30 days</span>
                  </li>
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
                <CardTitle>Exercise Your Rights</CardTitle>
                <CardDescription>
                  Contact us to access, modify, or delete your personal data.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button asChild>
                  <RouterLink to="/contact">Data Request</RouterLink>
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

export default DataProtection;
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Cookie, Database, UserCheck, Mail, Eye } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Data Protection Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              At BonkBack, we are committed to protecting your privacy and ensuring the security of your personal data. 
              This privacy policy explains how we collect, use, store, and protect your information in compliance with 
              the General Data Protection Regulation (GDPR) and other applicable privacy laws.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Your Rights</h4>
                <ul className="text-sm space-y-1">
                  <li>• Right to access your data</li>
                  <li>• Right to rectification</li>
                  <li>• Right to erasure</li>
                  <li>• Right to data portability</li>
                </ul>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Our Commitments</h4>
                <ul className="text-sm space-y-1">
                  <li>• Transparent data practices</li>
                  <li>• Secure data storage</li>
                  <li>• No selling of personal data</li>
                  <li>• Regular security audits</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Information We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold mb-3">Personal Information</h4>
              <ul className="space-y-2 text-sm">
                <li>• <strong>Account Information:</strong> Name, email address, and profile details</li>
                <li>• <strong>Financial Information:</strong> Wallet addresses, transaction history, and cashback earnings</li>
                <li>• <strong>Contact Information:</strong> Email and communication preferences</li>
                <li>• <strong>Verification Data:</strong> Information required for identity verification and compliance</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Automatically Collected Information</h4>
              <ul className="space-y-2 text-sm">
                <li>• <strong>Usage Data:</strong> Pages visited, features used, and interaction patterns</li>
                <li>• <strong>Device Information:</strong> Browser type, device type, and operating system</li>
                <li>• <strong>Log Data:</strong> IP addresses, access times, and referring URLs</li>
                <li>• <strong>Cookies:</strong> Preference settings and session information</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5" />
              Cookie Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We use cookies and similar technologies to provide, protect, and improve our services. 
              You have control over cookie preferences through our cookie consent manager.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Essential Cookies</h4>
                <p className="text-sm text-muted-foreground">
                  Required for basic website functionality, including authentication and security features.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Analytics Cookies</h4>
                <p className="text-sm text-muted-foreground">
                  Help us understand how visitors interact with our website to improve user experience.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Marketing Cookies</h4>
                <p className="text-sm text-muted-foreground">
                  Used to track visitors across websites to display relevant advertisements.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Functional Cookies</h4>
                <p className="text-sm text-muted-foreground">
                  Enable enhanced functionality and personalization features.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              How We Use Your Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Service Provision</h4>
                <ul className="text-sm space-y-1">
                  <li>• Processing cashback transactions and payments</li>
                  <li>• Managing your account and preferences</li>
                  <li>• Providing customer support</li>
                  <li>• Sending important service notifications</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Legal Compliance</h4>
                <ul className="text-sm space-y-1">
                  <li>• Anti-money laundering (AML) compliance</li>
                  <li>• Know Your Customer (KYC) verification</li>
                  <li>• Tax reporting requirements</li>
                  <li>• Fraud prevention and security</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Data Sharing and Third Parties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <h4 className="font-semibold mb-2">We do not sell your personal data</h4>
              <p className="text-sm">
                Your personal information is never sold to third parties for marketing purposes.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Limited Sharing Scenarios</h4>
              <ul className="space-y-2 text-sm">
                <li>• <strong>Service Providers:</strong> Trusted partners who help us operate our service</li>
                <li>• <strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li>• <strong>Business Transfers:</strong> In case of merger, acquisition, or sale of assets</li>
                <li>• <strong>Affiliate Networks:</strong> Transaction data for cashback processing</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact & Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              For privacy-related questions, data access requests, or to exercise your rights under GDPR, 
              please contact us:
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Data Protection Officer</h4>
                <p className="text-sm">Email: privacy@bonkback.com</p>
                <p className="text-sm">Response time: Within 72 hours</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Your Data Rights</h4>
                <p className="text-sm">Access, modify, or delete your data through your account settings or by contacting us.</p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
              <p className="text-sm">
                <strong>Note:</strong> This privacy policy may be updated periodically. We will notify you of 
                significant changes via email or through our platform.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
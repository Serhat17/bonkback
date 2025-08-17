import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CookieConsent } from "@/components/CookieConsent";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Homepage from "./pages/Homepage";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import GiftCards from "./pages/GiftCards";
import AdminDashboard from "./pages/AdminDashboard";
import DemoCenter from "./pages/DemoCenter";
import AccountSettings from "./pages/AccountSettings";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import HowItWorks from "./pages/HowItWorks";
import Partners from "./pages/Partners";
import FAQ from "./pages/FAQ";
import HelpCenter from "./pages/HelpCenter";
import HowToCreateAccount from "./pages/help/HowToCreateAccount";
import WalletSetup from "./pages/help/WalletSetup";
import FirstPurchase from "./pages/help/FirstPurchase";
import BonkTokens from "./pages/help/BonkTokens";
import HowCashbackWorks from "./pages/help/HowCashbackWorks";
import EarningTips from "./pages/help/EarningTips";
import MerchantGuide from "./pages/help/MerchantGuide";
import CashbackRules from "./pages/help/CashbackRules";
import ReferralBonuses from "./pages/help/ReferralBonuses";
import AccountSecurity from "./pages/help/AccountSecurity";
import ReferralTracking from "./pages/help/ReferralTracking";
import ReferralTerms from "./pages/help/ReferralTerms";
import HelpAccountSettings from "./pages/help/AccountSettings";
import HelpPrivacy from "./pages/help/Privacy";
import DataProtection from "./pages/help/DataProtection";
import HowToReferFriends from "./pages/help/HowToReferFriends";
import Blog from "./pages/Blog";
import AllTransactions from "./pages/AllTransactions";
import AllOffers from "./pages/AllOffers";
import Wallet from "./pages/Wallet";
import { ReferralRedirect } from "./pages/ReferralRedirect";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    }
  }
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Layout>
              <Routes>
                <Route path="/" element={<Homepage />} />
                <Route path="/r/:code" element={<ReferralRedirect />} />
                <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Protected Routes - Require Authentication */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/gift-cards" element={
              <ProtectedRoute>
                <GiftCards />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <AccountSettings />
              </ProtectedRoute>
            } />
            <Route path="/transactions" element={
              <ProtectedRoute>
                <AllTransactions />
              </ProtectedRoute>
            } />
            <Route path="/wallet" element={
              <ProtectedRoute>
                <Wallet />
              </ProtectedRoute>
            } />
            
            {/* Admin Only Routes */}
            <Route path="/admin" element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/demo" element={
              <ProtectedRoute adminOnly>
                <DemoCenter />
              </ProtectedRoute>
            } />
            
            {/* Public Routes */}
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/help/create-account" element={<HowToCreateAccount />} />
            <Route path="/help/wallet-setup" element={<WalletSetup />} />
            <Route path="/help/first-purchase" element={<FirstPurchase />} />
            <Route path="/help/bonk-tokens" element={<BonkTokens />} />
            <Route path="/help/cashback-works" element={<HowCashbackWorks />} />
            <Route path="/help/earning-tips" element={<EarningTips />} />
            <Route path="/help/merchants" element={<MerchantGuide />} />
            <Route path="/help/cashback-rules" element={<CashbackRules />} />
            <Route path="/help/referral-bonuses" element={<ReferralBonuses />} />
        <Route path="/help/security" element={<AccountSecurity />} />
        <Route path="/help/referral-tracking" element={<ReferralTracking />} />
        <Route path="/help/referral-terms" element={<ReferralTerms />} />
        <Route path="/help/account-settings" element={<HelpAccountSettings />} />
        <Route path="/help/privacy" element={<HelpPrivacy />} />
        <Route path="/help/data-protection" element={<DataProtection />} />
            <Route path="/help/refer-friends" element={<HowToReferFriends />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/offers" element={<AllOffers />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cookies" element={<Privacy />} />
            <Route path="/legal" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
            </Layout>
          </ErrorBoundary>
          <CookieConsent />
          <Toaster />
          <Sonner />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

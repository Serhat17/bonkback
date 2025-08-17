import React, { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Coins, TrendingUp, Clock, Euro, Lock, List } from "lucide-react";
import { SolanaAddressInput } from "@/components/SolanaAddressInput";
import { EmptyState } from "@/components/EmptyState";

interface CashbackTx {
  purchase_date: string;
  bonk_amount: number;
  status: string;
}

interface AvailableCashbackRow {
  available_amount: number;
}

const BONK_CG_ID = "bonk"; // CoinGecko id

const numberFmt = (n: number, maxFrac = 2) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: maxFrac }).format(n || 0);

const euroFmt = (n: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(n || 0);

// 7-decimal EUR formatting for tiny-price assets like BONK
const euroFmt7 = (n: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", minimumFractionDigits: 7, maximumFractionDigits: 7 }).format(n || 0);

const Wallet: React.FC = () => {
  const { user, profile } = useAuthStore();
  const isMobile = (() => {
    try {
      return typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
    } catch {
      return false;
    }
  })();

  // SEO basics for SPA
  useEffect(() => {
    document.title = "Wallet Analytics | BonkBack"; // Title tag under 60 chars
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Wallet analytics: pending, received, locked, available BONK balance with EUR value.");
  }, []);

  // Live BONK price (EUR)
  const { data: bonkPrice, isLoading: loadingPrice } = useQuery({
    queryKey: ["bonk-price-eur"],
    queryFn: async () => {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${BONK_CG_ID}&vs_currencies=eur`
      );
      const json = await res.json();
      return json?.[BONK_CG_ID]?.eur as number;
    },
    refetchInterval: 60_000,
  });

  // BONK 30d price series (EUR)
  const { data: priceSeries, isLoading: loadingSeries } = useQuery({
    queryKey: ["bonk-price-30d"],
    queryFn: async () => {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${BONK_CG_ID}/market_chart?vs_currency=eur&days=30&interval=daily`
      );
      const json = await res.json();
      const prices: [number, number][] = json?.prices || [];
      return prices.map(([ts, price]) => ({
        date: format(new Date(ts), "MMM d"),
        value: price as number,
      }));
    },
    refetchInterval: 5 * 60_000,
  });

  // User transactions for month-by-month earnings (approved/paid)
  const { data: txs, isLoading: loadingTxs } = useQuery({
    queryKey: ["cashback-txs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cashback_transactions")
        .select("purchase_date, bonk_amount, status")
        .eq("user_id", user!.id)
        .order("purchase_date", { ascending: true });
      if (error) throw error;
      return (data || []) as CashbackTx[];
    },
    refetchInterval: 120_000,
  });

  

  // Unified wallet balances (total/locked/available/pending)
  const { data: balances, isLoading: loadingBalances } = useQuery({
    queryKey: ["wallet-balances", user?.id],
    enabled: !!user,
    queryFn: async () => {
      try {
        // Try the secure function first
        const { data, error } = await supabase.rpc("get_wallet_balances");
        if (error) {
          console.warn("Wallet balances function failed, using profile data:", error);
          // Fallback to profile data if function fails
          const totalBonk = profile?.bonk_balance || 0;
          
          // Get activity data to calculate pending/locked amounts
          const { data: activityData } = await supabase.rpc("get_my_wallet_activity_unified");
          
          // Calculate pending from deferred cashback
          const pendingFromDeferred = (activityData || [])
            .filter((tx: any) => 
              tx.type === 'cashback' && 
              tx.status === 'approved' && 
              tx.meta?.deferred_amount && 
              tx.meta?.deferred_amount > 0 &&
              new Date(tx.meta?.available_from_deferred) > new Date()
            )
            .reduce((sum: number, tx: any) => sum + (tx.meta?.deferred_amount || 0), 0);
          
          // For debugging purposes, also check for locked referral payouts
          const lockedFromReferrals = (activityData || [])
            .filter((tx: any) => 
              tx.type === 'referral' && 
              tx.status === 'locked'
            )
            .reduce((sum: number, tx: any) => sum + (tx.amount_bonk || 0), 0);
          
          const totalLocked = lockedFromReferrals;
          const totalPending = pendingFromDeferred + totalLocked;
          const available = Math.max(0, totalBonk - totalLocked);
          
          return {
            total_bonk: totalBonk,
            locked_bonk: totalLocked,
            available_bonk: available,
            pending_bonk: totalPending
          };
        }
        
        const balance = data?.[0];
        if (!balance) {
          // Fallback to profile data
          const totalBonk = profile?.bonk_balance || 0;
          return {
            total_bonk: totalBonk,
            locked_bonk: 0,
            available_bonk: totalBonk,
            pending_bonk: 0
          };
        }
        
        // Get activity data for pending calculations
        const { data: activityData } = await supabase.rpc("get_my_wallet_activity_unified");
        const pendingFromDeferred = (activityData || [])
          .filter((tx: any) => 
            tx.type === 'cashback' && 
            tx.status === 'approved' && 
            tx.meta?.deferred_amount && 
            tx.meta?.deferred_amount > 0 &&
            new Date(tx.meta?.available_from_deferred) > new Date()
          )
          .reduce((sum: number, tx: any) => sum + (tx.meta?.deferred_amount || 0), 0);
        
        const totalPending = pendingFromDeferred + (balance.bonk_locked || 0);
        
        return {
          total_bonk: balance.bonk_balance_total || 0,
          locked_bonk: balance.bonk_locked || 0,
          available_bonk: balance.bonk_available || 0,
          pending_bonk: totalPending
        };
      } catch (err) {
        console.error("Error fetching wallet balances:", err);
        // Final fallback to profile data
        const totalBonk = profile?.bonk_balance || 0;
        return {
          total_bonk: totalBonk,
          locked_bonk: 0,
          available_bonk: totalBonk,
          pending_bonk: 0
        };
      }
    },
    refetchInterval: 120_000,
  });

  // Unified wallet activity feed
  const { data: activity, isLoading: loadingActivity } = useQuery({
    queryKey: ["wallet-activity", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_wallet_activity_unified");
      if (error) throw error;
      return (data || []) as any[];
    },
    refetchInterval: 10_000,
  });

  // Build last 12 months and aggregate earnings (BONK) from all sources
  const monthlyEarnings = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => startOfMonth(subMonths(new Date(), 11 - i)));
    const map = new Map(months.map((d) => [format(d, "yyyy-MM"), 0]));

    // Include all positive BONK activity (earnings from cashback, referrals, etc.)
    (activity || [])
      .filter((a) => (a.amount_bonk || 0) > 0 && ["approved", "paid", "completed", "unlocked"].includes(a.status))
      .forEach((a) => {
        const key = format(startOfMonth(new Date(a.happened_at)), "yyyy-MM");
        map.set(key, (map.get(key) || 0) + (a.amount_bonk || 0));
      });

    return months.map((d) => ({
      month: format(d, "MMM yyyy"),
      bonk: Number((map.get(format(d, "yyyy-MM")) || 0).toFixed(0)),
    }));
  }, [activity]);

  const hasEarnings = useMemo(() => monthlyEarnings.some((d) => d.bonk > 0), [monthlyEarnings]);

  const lifetimeBonk = profile?.total_earned || 0;
  const bonkBalance = balances?.total_bonk || profile?.bonk_balance || 0;
  const pendingBonk = balances?.pending_bonk || 0;
  const balanceValueEUR = (bonkPrice || 0) * bonkBalance;
  const lockedBonk = balances?.locked_bonk || 0;
  const availableBonk = balances?.available_bonk || 0;

  return (
    <main className="container mx-auto px-4 py-6 space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Wallet Analytics – BONK</h1>
        <p className="text-muted-foreground mt-1">Your BONK, visualized like an investment portfolio.</p>
      </header>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total BONK Earned</CardTitle>
            <Coins className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {profile ? (
              <div className="text-2xl font-bold">{numberFmt(lifetimeBonk, 0)} BONK</div>
            ) : (
              <Skeleton className="h-8 w-32" />
            )}
            <CardDescription className="mt-1">Lifetime across cashback & referrals</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending BONK</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {!loadingBalances ? (
              <>
                <div className="text-2xl font-bold">{numberFmt(pendingBonk, 0)} BONK</div>
                {bonkPrice && pendingBonk > 0 && (
                  <div className="text-sm text-muted-foreground">{euroFmt((bonkPrice || 0) * pendingBonk)}</div>
                )}
              </>
            ) : (
              <Skeleton className="h-8 w-28" />
            )}
            <CardDescription className="mt-1">Unreleased; will unlock per policy</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Locked BONK</CardTitle>
            <Lock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {!loadingBalances ? (
              <>
                <div className="text-2xl font-bold">{numberFmt(lockedBonk, 0)} BONK</div>
                {bonkPrice && lockedBonk > 0 && (
                  <div className="text-sm text-muted-foreground">{euroFmt((bonkPrice || 0) * lockedBonk)}</div>
                )}
              </>
            ) : (
              <Skeleton className="h-8 w-24" />
            )}
            <CardDescription className="mt-1">Compliance holds, referral locks</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Available BONK</CardTitle>
            <List className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {!loadingBalances ? (
              <>
                <div className="text-2xl font-bold">{numberFmt(availableBonk, 0)} BONK</div>
                {bonkPrice && availableBonk > 0 && (
                  <div className="text-sm text-muted-foreground">{euroFmt((bonkPrice || 0) * availableBonk)}</div>
                )}
              </>
            ) : (
              <Skeleton className="h-8 w-24" />
            )}
            <CardDescription className="mt-1">Spendable after locks</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Live BONK Price</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {!loadingPrice ? (
              <div className="text-2xl font-bold">{euroFmt7(bonkPrice || 0)}</div>
            ) : (
              <Skeleton className="h-8 w-24" />
            )}
            <CardDescription className="mt-1">Per BONK (CoinGecko)</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Balance Value (EUR)</CardTitle>
            <Euro className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {profile && !loadingPrice ? (
              <div className="text-2xl font-bold">{euroFmt(balanceValueEUR)}</div>
            ) : (
              <Skeleton className="h-8 w-32" />
            )}
            <CardDescription className="mt-1">{numberFmt(bonkBalance, 0)} BONK × price</CardDescription>
          </CardContent>
        </Card>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Connect your Solana address for BONK payouts</CardDescription>
          </CardHeader>
          <CardContent>
            <SolanaAddressInput />
          </CardContent>
        </Card>
      </section>

      {/* Recent Activity */}
      <section className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Cashback, referrals, withdrawals</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingActivity ? (
              <Skeleton className="h-40 w-full" />
            ) : (activity && activity.length > 0) ? (
              <div className="space-y-3">
                {activity.slice(0,8).map((row: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between border-b last:border-0 pb-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{row.source}</Badge>
                      <span className="text-sm text-muted-foreground">{new Date(row.happened_at).toLocaleString()}</span>
                    </div>
                    <div className="text-sm font-medium">{numberFmt(row.amount_bonk || 0, 0)} BONK</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={List} title="No recent activity" description="Your earnings and payouts will show up here." />
            )}
          </CardContent>
        </Card>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Month-by-month earnings */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col items-center text-center">
              <CardTitle className="text-lg md:text-xl">Monthly BONK Earnings</CardTitle>
              <CardDescription className="mt-2">All BONK earnings from cashback, referrals & more</CardDescription>
              <Badge variant="secondary" className="mt-3">Last 12 months</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loadingActivity ? (
              <Skeleton className="h-64 w-full md:h-80" />
            ) : !hasEarnings ? (
              <EmptyState
                icon={Coins}
                title="No BONK earnings yet"
                description="Your monthly BONK earnings from cashback, referrals, and other sources will appear here."
              />
            ) : (
              <div className="w-full px-2 sm:px-4 overflow-hidden flex justify-center">
                <div className="mx-auto max-w-full">
                  <ChartContainer
                    config={{ bonk: { label: "BONK", color: "hsl(var(--primary))" } }}
                    className="h-56 md:h-72 w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={monthlyEarnings}
                        margin={{ top: 10, right: isMobile ? 8 : 16, left: isMobile ? 8 : 16, bottom: isMobile ? 32 : 14 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 11 : 12 }} 
                          interval={isMobile ? 2 : 1}
                          angle={isMobile ? -30 : 0}
                          tickMargin={isMobile ? 12 : 6}
                        />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 11 : 12 }} />
                        <ChartTooltip cursor={{ stroke: "hsl(var(--muted))" }} content={<ChartTooltipContent indicator="line" />} />
                        <Line type="monotone" dataKey="bonk" stroke="hsl(var(--primary))" strokeWidth={2.25} dot={false} />
                        <ChartLegend content={<ChartLegendContent />} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* BONK price trend 30d */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>BONK Price – 30d</CardTitle>
            <CardDescription>EUR, daily</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSeries ? (
              <Skeleton className="h-64 w-full md:h-80" />
            ) : (
              <div className="w-full px-2 sm:px-4 overflow-hidden flex justify-center">
                <div className="mx-auto max-w-full">
                  <ChartContainer
                    config={{ value: { label: "Price (EUR)", color: "hsl(var(--primary))" } }}
                    className="h-56 md:h-72 w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={priceSeries}
                        margin={{ top: 10, right: isMobile ? 8 : 16, left: isMobile ? 8 : 16, bottom: isMobile ? 28 : 12 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 11 : 12 }} 
                          interval={isMobile ? 4 : 2}
                          angle={isMobile ? -30 : 0}
                          tickMargin={isMobile ? 12 : 6}
                        />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 11 : 12 }} domain={["auto", "auto"]} />
                        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                        <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.25} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default Wallet;

"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpIcon, ArrowDownIcon, TrendingUpIcon, WalletIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api/client";
import Decimal from "decimal.js";

interface NetWorthData {
  holdings_value: string;
  cash_balance: string;
  net_worth: string;
  total_invested: string;
  total_fees: string;
  total_gain_loss: string;
  total_gain_loss_pct: string;
  xirr: string;
  breakdown: {
    by_asset_type: Record<string, string>;
    by_ticker: Record<string, string>;
    by_broker: Record<string, string>;
  };
}

export function NetWorthCard() {
  const { data: netWorth, isLoading, error } = useQuery<NetWorthData>({
    queryKey: ["net-worth"],
    queryFn: async () => {
      return api.get<NetWorthData>("/api/analytics/net-worth");
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !netWorth) {
    return (
      <Card className="col-span-full border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Net Worth</CardTitle>
          <CardDescription>
            Failed to load your portfolio data. Please try refreshing the page.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const netWorthValue = new Decimal(netWorth.net_worth || "0");
  const gainLoss = new Decimal(netWorth.total_gain_loss || "0");
  const gainLossPct = new Decimal(netWorth.total_gain_loss_pct || "0");
  const holdings = new Decimal(netWorth.holdings_value || "0");
  const cash = new Decimal(netWorth.cash_balance || "0");
  const totalInvested = new Decimal(netWorth.total_invested || "0");
  const totalFees = new Decimal(netWorth.total_fees || "0");
  const xirr = new Decimal(netWorth.xirr || "0");

  const isPositive = gainLoss.greaterThanOrEqualTo(0);

  const formatCurrency = (value: Decimal): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value.toNumber());
  };

  const formatPercent = (value: Decimal): string => {
    return value.toFixed(2) + "%";
  };

  return (
    <Card variant="kpi" className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Portfolio Net Worth</CardTitle>
            <CardDescription>Your complete financial position</CardDescription>
          </div>
          <WalletIcon className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Net Worth Display */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-3">
            <h2 className="text-4xl md:text-5xl font-bold font-mono tracking-tight">
              {formatCurrency(netWorthValue)}
            </h2>
            <Badge variant={isPositive ? "default" : "destructive"} className="text-base px-3 py-1">
              <span className="flex items-center gap-1">
                {isPositive ? (
                  <ArrowUpIcon className="h-4 w-4" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4" />
                )}
                {formatCurrency(gainLoss.abs())} ({formatPercent(gainLossPct.abs())})
              </span>
            </Badge>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground font-mono">
            <span>Holdings: {formatCurrency(holdings)}</span>
            <span>•</span>
            <span>Cash: {formatCurrency(cash)}</span>
          </div>
        </div>

        <Separator />

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total Invested</p>
            <p className="text-xl md:text-2xl font-semibold font-mono">{formatCurrency(totalInvested)}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total Fees</p>
            <p className="text-xl md:text-2xl font-semibold font-mono text-destructive">
              {formatCurrency(totalFees)}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Net Return</p>
            <p className={`text-xl md:text-2xl font-semibold font-mono ${isPositive ? "text-primary" : "text-destructive"}`}>
              {formatPercent(gainLossPct)}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">XIRR</p>
              <TrendingUpIcon className="h-3 w-3 text-muted-foreground" />
            </div>
            <p className={`text-xl md:text-2xl font-semibold font-mono ${xirr.greaterThanOrEqualTo(0) ? "text-primary" : "text-destructive"}`}>
              {formatPercent(xirr)}
            </p>
          </div>
        </div>

        {/* Fee Impact Notice */}
        {totalFees.greaterThan(0) && (
          <>
            <Separator />
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border border-border/50">
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold">Fee Impact on Performance</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You've paid {formatCurrency(totalFees)} in fees, which is{" "}
                  {formatPercent(totalFees.div(totalInvested.plus(0.01)).mul(100))} of your total invested capital.
                  {totalFees.div(totalInvested).mul(100).greaterThan(2) && (
                    <span className="text-destructive font-semibold">
                      {" "}Consider reviewing your trading strategy to minimize fees.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Asset Allocation Summary */}
        {netWorth.breakdown?.by_asset_type && Object.keys(netWorth.breakdown.by_asset_type).length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Asset Allocation</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(netWorth.breakdown.by_asset_type).map(([assetType, value]) => {
                  const assetValue = new Decimal(value);
                  const percentage = holdings.greaterThan(0)
                    ? assetValue.div(holdings).mul(100)
                    : new Decimal(0);

                  return (
                    <div
                      key={assetType}
                      className="flex flex-col gap-1 p-3 bg-muted/30 rounded-lg border border-transparent hover:border-primary/20 hover:bg-muted/50 transition-all duration-200 cursor-pointer"
                    >
                      <p className="text-xs text-muted-foreground capitalize font-medium">{assetType}</p>
                      <p className="text-lg font-semibold font-mono">{formatCurrency(assetValue)}</p>
                      <p className="text-xs text-muted-foreground font-mono">{formatPercent(percentage)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}



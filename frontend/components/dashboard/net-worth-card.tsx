"use client";

import type React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CircleHelp,
  WalletIcon,
} from "lucide-react";
import Decimal from "decimal.js";
import { api } from "@/lib/api/client";
import type { NetWorthData } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface NetWorthCardProps {
  initialData?: NetWorthData | null;
}

export const METRIC_TOOLTIPS = {
  netWorth:
    "Total portfolio value: market value of all holdings plus uninvested cash (USD).",
  totalGainLoss:
    "Net worth minus total deposited capital (withdrawals reduce invested). Shown as amount and % of invested.",
  holdings:
    "Current market value of open positions only, using latest prices.",
  cash: "Uninvested USD after deposits, withdrawals, fees, and trade settlements.",
  portfolioValue:
    "Same as holdings value — current market value of all open positions.",
  totalInvested:
    "Capital that reached your portfolio: net deposits minus withdrawals, after linked transfer fees.",
  totalGainLossStat:
    "Net worth minus total invested — includes both position gains and cash not yet deployed.",
  totalFees: "Sum of all fee cash flows (deposits, trading, closing, etc.) in USD.",
  netReturn:
    "Total gain/loss including uninvested cash, as % of all deposits (withdrawals reduce the base).",
  feeDrag:
    "Total fees paid as % of capital deployed (total invested).",
  xirr: "Time-weighted return coming soon.",
  assetAllocation: "Share of holdings value by asset class (ETF, stock, crypto).",
} as const;

function MetricLabel({
  label,
  tooltip,
  className,
}: {
  label: string;
  tooltip: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`About ${label}`}
          >
            <CircleHelp className="size-3.5 shrink-0" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-pretty">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function formatUsd(value: Decimal): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value.toNumber());
}

function formatPct(value: Decimal): string {
  return `${value.toFixed(2)}%`;
}

function isXirrPlaceholder(xirr: Decimal): boolean {
  return xirr.isZero();
}

function formatAssetTypeLabel(key: string): string {
  return key.replace(/_/g, " ").toUpperCase();
}

export function NetWorthCard({ initialData }: NetWorthCardProps): React.JSX.Element {
  const { data: netWorth, isLoading, error } = useQuery<NetWorthData>({
    queryKey: ["net-worth"],
    queryFn: () => api.get<NetWorthData>("/api/analytics/net-worth"),
    initialData: initialData ?? undefined,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <Card variant="kpi" className="col-span-full">
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
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

  const feeDragPct = totalInvested.greaterThan(0)
    ? totalFees.div(totalInvested).mul(100)
    : new Decimal(0);

  return (
    <Card variant="kpi" className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">Portfolio Net Worth</CardTitle>
            <CardDescription>Single source of truth from portfolio analytics</CardDescription>
          </div>
          <WalletIcon className="size-8 shrink-0 text-muted-foreground" aria-hidden />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <section className="space-y-2">
          <MetricLabel label="Net worth" tooltip={METRIC_TOOLTIPS.netWorth} />
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-4xl font-bold font-mono tracking-tight tabular-nums md:text-5xl">
              {formatUsd(netWorthValue)}
            </h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant={isPositive ? "default" : "destructive"}
                  className="cursor-default px-3 py-1 text-base tabular-nums"
                >
                  <span className="flex items-center gap-1">
                    {isPositive ? (
                      <ArrowUpIcon className="size-4" />
                    ) : (
                      <ArrowDownIcon className="size-4" />
                    )}
                    {formatUsd(gainLoss.abs())} ({formatPct(gainLossPct.abs())})
                  </span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                {METRIC_TOOLTIPS.totalGainLoss}
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground font-mono tabular-nums">
            <span className="inline-flex items-center gap-1">
              <MetricLabel label="Holdings" tooltip={METRIC_TOOLTIPS.holdings} className="!gap-0.5" />
              <span className="text-foreground">{formatUsd(holdings)}</span>
            </span>
            <span className="text-muted-foreground/50 hidden sm:inline" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-1">
              <MetricLabel label="Cash" tooltip={METRIC_TOOLTIPS.cash} className="!gap-0.5" />
              <span className="text-foreground">{formatUsd(cash)}</span>
            </span>
          </div>
        </section>

        <Separator />

        <section
          aria-label="Portfolio summary"
          className="grid grid-cols-2 gap-4 rounded-lg border border-border/50 bg-muted/30 p-4 md:grid-cols-4"
        >
          <StatCell
            label="Portfolio value"
            tooltip={METRIC_TOOLTIPS.portfolioValue}
            value={formatUsd(holdings)}
          />
          <StatCell
            label="Total invested"
            tooltip={METRIC_TOOLTIPS.totalInvested}
            value={formatUsd(totalInvested)}
          />
          <StatCell
            label="Total gain/loss"
            tooltip={METRIC_TOOLTIPS.totalGainLossStat}
            value={formatUsd(gainLoss)}
            valueClassName={isPositive ? "text-primary" : "text-destructive"}
            subValue={formatPct(gainLossPct)}
            subTooltip={METRIC_TOOLTIPS.netReturn}
          />
          <StatCell
            label="Total fees"
            tooltip={METRIC_TOOLTIPS.totalFees}
            value={formatUsd(totalFees)}
            valueClassName="text-destructive"
            subValue={
              totalFees.greaterThan(0) && totalInvested.greaterThan(0)
                ? `${formatPct(feeDragPct)} drag`
                : undefined
            }
            subTooltip={METRIC_TOOLTIPS.feeDrag}
          />
        </section>

        <Separator />

        <section className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <StatCell
            label="Net return"
            tooltip={METRIC_TOOLTIPS.netReturn}
            value={formatPct(gainLossPct)}
            valueClassName={isPositive ? "text-primary" : "text-destructive"}
          />
          <StatCell
            label="Time-weighted return"
            tooltip={METRIC_TOOLTIPS.xirr}
            value={isXirrPlaceholder(xirr) ? "—" : formatPct(xirr)}
            valueClassName={
              isXirrPlaceholder(xirr)
                ? "text-muted-foreground"
                : xirr.greaterThanOrEqualTo(0)
                  ? "text-primary"
                  : "text-destructive"
            }
          />
        </section>

        {netWorth.breakdown?.by_asset_type &&
          Object.keys(netWorth.breakdown.by_asset_type).length > 0 && (
            <>
              <Separator />
              <section className="space-y-3">
                <MetricLabel
                  label="Asset allocation"
                  tooltip={METRIC_TOOLTIPS.assetAllocation}
                />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {Object.entries(netWorth.breakdown.by_asset_type).map(([assetType, value]) => {
                    const assetValue = new Decimal(value);
                    const pct = holdings.greaterThan(0)
                      ? assetValue.div(holdings).mul(100)
                      : new Decimal(0);
                    return (
                      <div
                        key={assetType}
                        className="flex flex-col gap-1 rounded-lg border border-transparent bg-muted/30 p-3 transition-colors hover:border-primary/20 hover:bg-muted/50"
                      >
                        <p className="text-xs font-medium text-muted-foreground">
                          {formatAssetTypeLabel(assetType)}
                        </p>
                        <p className="text-lg font-semibold font-mono tabular-nums">
                          {formatUsd(assetValue)}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground tabular-nums">
                          {formatPct(pct)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
      </CardContent>
    </Card>
  );
}

function StatCell({
  label,
  tooltip,
  value,
  valueClassName,
  subValue,
  subTooltip,
}: {
  label: string;
  tooltip: string;
  value: string;
  valueClassName?: string;
  subValue?: string;
  subTooltip?: string;
}) {
  return (
    <div className="space-y-1">
      <MetricLabel label={label} tooltip={tooltip} />
      <p className={cn("text-xl font-semibold font-mono tabular-nums md:text-2xl", valueClassName)}>
        {value}
      </p>
      {subValue && (
        <p className="text-xs text-muted-foreground font-mono tabular-nums">
          {subTooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="underline decoration-dotted underline-offset-2">
                  {subValue}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                {subTooltip}
              </TooltipContent>
            </Tooltip>
          ) : (
            subValue
          )}
        </p>
      )}
    </div>
  );
}

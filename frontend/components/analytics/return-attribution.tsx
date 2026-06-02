"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { StatCell } from "@/components/analytics/metric-primitives";
import { PERFORMANCE_TOOLTIPS } from "@/components/performance/performance-tooltips";
import { api } from "@/lib/api/client";
import type { ReturnAttribution as ReturnAttributionData } from "@/lib/api/analytics";
import Decimal from "decimal.js";
import { TrendingUpIcon, AlertCircleIcon } from "lucide-react";
import type React from "react";

const CHART_GAIN = "var(--chart-1)";
const CHART_START = "var(--chart-2)";
const CHART_FEE_A = "var(--chart-3)";
const CHART_FEE_B = "var(--chart-4)";
const CHART_LOSS = "var(--destructive)";

export function ReturnAttribution(): React.JSX.Element {
  const { data: attribution, isLoading, error } = useQuery<ReturnAttributionData>({
    queryKey: ["return-attribution"],
    queryFn: async () => {
      return api.get<ReturnAttributionData>("/api/analytics/return-attribution");
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !attribution) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUpIcon className="h-5 w-5 text-muted-foreground" />
            Return Attribution Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <AlertCircleIcon className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">No attribution data yet</p>
          <p className="text-sm mt-1">Add trades and cash flows to see your return breakdown.</p>
        </CardContent>
      </Card>
    );
  }

  const startingCapital = new Decimal(attribution.starting_capital || "0");
  const marketGains = new Decimal(attribution.market_gains || "0");
  const totalFeesImpact = new Decimal(attribution.total_fees_impact || "0");
  const fxImpact = new Decimal(attribution.fx_impact || "0");
  const netPosition = new Decimal(attribution.net_position || "0");

  const formatCurrency = (value: Decimal | string | number): string => {
    const num = new Decimal(value).toNumber();
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatPercent = (value: string): string => {
    return new Decimal(value).toFixed(2) + "%";
  };

  const waterfallData = [
    {
      name: "Starting\nCapital",
      value: startingCapital.toNumber(),
      displayValue: startingCapital.toNumber(),
      type: "start",
      color: CHART_START,
    },
    {
      name: "Market\nGains",
      value: marketGains.toNumber(),
      displayValue: startingCapital.plus(marketGains).toNumber(),
      type: marketGains.greaterThanOrEqualTo(0) ? "gain" : "loss",
      color: marketGains.greaterThanOrEqualTo(0) ? CHART_GAIN : CHART_LOSS,
    },
    {
      name: "Deposit\nFees",
      value: -new Decimal(attribution.deposit_fees_impact || "0").toNumber(),
      displayValue: startingCapital
        .plus(marketGains)
        .minus(new Decimal(attribution.deposit_fees_impact || "0"))
        .toNumber(),
      type: "loss",
      color: CHART_LOSS,
    },
    {
      name: "Trading\nFees",
      value: -new Decimal(attribution.trading_fees_impact || "0").toNumber(),
      displayValue: startingCapital
        .plus(marketGains)
        .minus(new Decimal(attribution.deposit_fees_impact || "0"))
        .minus(new Decimal(attribution.trading_fees_impact || "0"))
        .toNumber(),
      type: "loss",
      color: CHART_FEE_A,
    },
    {
      name: "Closing\nFees",
      value: -new Decimal(attribution.closing_fees_impact || "0").toNumber(),
      displayValue: startingCapital.plus(marketGains).minus(totalFeesImpact).toNumber(),
      type: "loss",
      color: CHART_FEE_B,
    },
    {
      name: "FX\nImpact",
      value: fxImpact.toNumber(),
      displayValue: netPosition.toNumber(),
      type: fxImpact.greaterThanOrEqualTo(0) ? "gain" : "loss",
      color: fxImpact.greaterThanOrEqualTo(0) ? CHART_GAIN : CHART_LOSS,
    },
    {
      name: "Net\nPosition",
      value: netPosition.toNumber(),
      displayValue: netPosition.toNumber(),
      type: "end",
      color: netPosition.greaterThanOrEqualTo(startingCapital) ? CHART_GAIN : CHART_LOSS,
    },
  ];

  type AttributionTooltipRow = {
    name: string;
    type: string;
    color: string;
    value?: number;
    displayValue?: number;
  };

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: { payload: AttributionTooltipRow }[];
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border border-border bg-card p-3 text-card-foreground shadow-lg">
          <p className="font-semibold text-sm mb-1">{data.name.replace(/\n/g, " ")}</p>
          {data.type !== "start" && data.type !== "end" && data.value != null && (
            <p className="text-base font-bold" style={{ color: data.color }}>
              {data.value >= 0 ? "+" : ""}
              {formatCurrency(String(Math.abs(data.value)))}
            </p>
          )}
          {data.displayValue != null && (
            <p className="text-xs text-muted-foreground mt-1">
              Total: {formatCurrency(String(data.displayValue))}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const netReturnPct = new Decimal(attribution.net_return_pct || "0");
  const isPositiveReturn = netReturnPct.greaterThanOrEqualTo(0);
  const isPositiveMarketGains = marketGains.greaterThanOrEqualTo(0);

  const feeRows = [
    { label: "Deposit Fees", amount: attribution.deposit_fees_impact },
    { label: "Trading Fees", amount: attribution.trading_fees_impact },
    { label: "Closing Fees", amount: attribution.closing_fees_impact },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUpIcon className="h-5 w-5 text-muted-foreground" />
              Return Attribution Analysis
            </CardTitle>
            <CardDescription>
              Breakdown of your portfolio returns showing impact of fees and FX
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          aria-label="Return attribution summary"
          className="grid grid-cols-2 gap-4 rounded-lg border border-border/50 bg-muted/30 p-4 md:grid-cols-4"
        >
          <StatCell
            label="Starting Capital"
            tooltip={PERFORMANCE_TOOLTIPS.startingCapital}
            value={formatCurrency(startingCapital)}
          />
          <StatCell
            label="Market Gains"
            tooltip={PERFORMANCE_TOOLTIPS.marketGains}
            value={`${isPositiveMarketGains ? "+" : ""}${formatCurrency(marketGains)} (${formatPercent(attribution.market_gains_pct)})`}
            valueClassName={isPositiveMarketGains ? "text-primary" : "text-destructive"}
          />
          <StatCell
            label="Total Fees"
            tooltip={PERFORMANCE_TOOLTIPS.totalFeesImpact}
            value={`-${formatCurrency(totalFeesImpact)} (${formatPercent(attribution.total_fees_impact_pct)})`}
            valueClassName="text-destructive"
          />
          <StatCell
            label="Net Position"
            tooltip={PERFORMANCE_TOOLTIPS.netPosition}
            value={`${formatCurrency(netPosition)} (${formatPercent(attribution.net_return_pct)})`}
            valueClassName={isPositiveReturn ? "text-primary" : "text-destructive"}
          />
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-medium mb-4">Return Decomposition Waterfall</h3>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--muted-foreground)"
                strokeOpacity={0.1}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                angle={0}
                textAnchor="middle"
                height={80}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="displayValue" radius={[8, 8, 0, 0]}>
                {waterfallData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="displayValue"
                stroke="var(--muted-foreground)"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--muted-foreground)" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="text-sm font-medium">Fee Impact Breakdown</h3>
          <div className="grid gap-3">
            {feeRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-3"
              >
                <span className="text-sm font-medium">{row.label}</span>
                <span className="text-sm font-bold font-mono tabular-nums text-destructive">
                  {formatCurrency(row.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {totalFeesImpact.div(startingCapital.plus(0.01)).mul(100).greaterThan(3) && (
          <div className="flex gap-3 rounded-lg border border-border/50 bg-muted/30 p-4">
            <AlertCircleIcon className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">High Fee Impact Detected</p>
              <p className="text-xs text-muted-foreground">
                Fees represent {formatPercent(attribution.total_fees_impact_pct)} of your invested
                capital. Consider consolidating trades or switching to a lower-cost broker to improve
                returns.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

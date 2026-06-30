"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCell } from "@/components/analytics/metric-primitives";
import { PERFORMANCE_TOOLTIPS } from "@/components/performance/performance-tooltips";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { ReturnAttribution as ReturnAttributionData } from "@/lib/api/analytics";
import Decimal from "decimal.js";
import { TrendingUpIcon, AlertCircleIcon } from "lucide-react";
import type React from "react";
import { MARKET_CONFIG } from "@/lib/market-config/market-config";
import { CHART_HEIGHT_TALL } from "@/lib/chart-sizes";

const CHART_GAIN = "var(--chart-1)";
const CHART_START = "var(--chart-2)";
const CHART_FEE = "var(--chart-3)";
const CHART_LOSS = "var(--destructive)";
const FX_IMPACT_THRESHOLD = new Decimal(0.01);

const waterfallChartConfig = {
  displayValue: { label: "Value", color: "var(--chart-1)" },
} satisfies ChartConfig;

const MUTED_CURSOR = {
  fill: "color-mix(in oklch, var(--muted) 35%, transparent)",
};

type WaterfallStep = {
  name: string;
  value: number;
  displayValue: number;
  type: "start" | "gain" | "loss" | "end";
  color: string;
};

function formatBaseCurrency(value: Decimal | string | number): string {
  const num = new Decimal(value).toNumber();
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: MARKET_CONFIG.baseCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatPercent(value: string): string {
  return new Decimal(value).toFixed(2) + "%";
}

function buildWaterfallSteps(
  startingCapital: Decimal,
  marketGains: Decimal,
  totalFeesImpact: Decimal,
  fxImpact: Decimal,
  netWorth: Decimal,
): WaterfallStep[] {
  const afterMarket = startingCapital.plus(marketGains);
  const afterFees = afterMarket.minus(totalFeesImpact);
  const showFx = fxImpact.abs().greaterThanOrEqualTo(FX_IMPACT_THRESHOLD);

  const steps: WaterfallStep[] = [
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
      displayValue: afterMarket.toNumber(),
      type: marketGains.greaterThanOrEqualTo(0) ? "gain" : "loss",
      color: marketGains.greaterThanOrEqualTo(0) ? CHART_GAIN : CHART_LOSS,
    },
    {
      name: "Fees",
      value: -totalFeesImpact.toNumber(),
      displayValue: afterFees.toNumber(),
      type: "loss",
      color: CHART_FEE,
    },
  ];

  if (showFx) {
    steps.push({
      name: "FX\nImpact",
      value: fxImpact.toNumber(),
      displayValue: netWorth.toNumber(),
      type: fxImpact.greaterThanOrEqualTo(0) ? "gain" : "loss",
      color: fxImpact.greaterThanOrEqualTo(0) ? CHART_GAIN : CHART_LOSS,
    });
  }

  steps.push({
    name: "Net\nworth",
    value: netWorth.toNumber(),
    displayValue: netWorth.toNumber(),
    type: "end",
    color: netWorth.greaterThanOrEqualTo(startingCapital) ? CHART_GAIN : CHART_LOSS,
  });

  return steps;
}

type AttributionTooltipRow = WaterfallStep;

function WaterfallTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: AttributionTooltipRow }[];
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0].payload;
  const label = data.name.replace(/\n/g, " ");

  return (
    <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md">
      <p className="font-medium">{label}</p>
      {data.type !== "start" && data.type !== "end" && (
        <p
          className={`font-mono font-medium tabular-nums ${
            data.value >= 0 ? "text-primary" : "text-destructive"
          }`}
        >
          {data.value >= 0 ? "+" : ""}
          {formatBaseCurrency(Math.abs(data.value))}
        </p>
      )}
      <p className="font-mono tabular-nums text-muted-foreground">
        Running: {formatBaseCurrency(data.displayValue)}
      </p>
    </div>
  );
}

export function ReturnAttribution(): React.JSX.Element {
  const { data: attribution, isLoading, error } = useQuery<ReturnAttributionData>({
    queryKey: queryKeys.returnAttribution(),
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
  const netWorth = new Decimal(attribution.net_position || "0");

  const waterfallData = buildWaterfallSteps(
    startingCapital,
    marketGains,
    totalFeesImpact,
    fxImpact,
    netWorth,
  );

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
        <CardTitle className="flex items-center gap-2">
          <TrendingUpIcon className="h-5 w-5 text-muted-foreground" />
          Return Attribution Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          aria-label="Return attribution summary"
          className="grid grid-cols-2 gap-4 rounded-lg border border-border/50 bg-muted/30 p-4 md:grid-cols-4"
        >
          <StatCell
            label="Starting Capital"
            tooltip={PERFORMANCE_TOOLTIPS.startingCapital}
            value={formatBaseCurrency(startingCapital)}
          />
          <StatCell
            label="Market Gains"
            tooltip={PERFORMANCE_TOOLTIPS.marketGains}
            value={`${isPositiveMarketGains ? "+" : ""}${formatBaseCurrency(marketGains)} (${formatPercent(attribution.market_gains_pct)})`}
            valueClassName={isPositiveMarketGains ? "text-primary" : "text-destructive"}
          />
          <StatCell
            label="Total Fees"
            tooltip={PERFORMANCE_TOOLTIPS.totalFeesImpact}
            value={`-${formatBaseCurrency(totalFeesImpact)} (${formatPercent(attribution.total_fees_impact_pct)})`}
            valueClassName="text-destructive"
          />
          <StatCell
            label="Net worth"
            tooltip={PERFORMANCE_TOOLTIPS.netWorth}
            value={`${formatBaseCurrency(netWorth)} (${formatPercent(attribution.net_return_pct)})`}
            valueClassName={isPositiveReturn ? "text-primary" : "text-destructive"}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="flex flex-col lg:col-span-3">
            <h3 className="mb-4 text-sm font-medium">Return Decomposition Waterfall</h3>
            <ChartContainer
              config={waterfallChartConfig}
              className={`${CHART_HEIGHT_TALL} min-h-[260px] md:min-h-[380px] w-full aspect-auto`}
            >
              <ComposedChart data={waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--muted-foreground)"
                  strokeOpacity={0.1}
                />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                  height={80}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12 }}
                  stroke="var(--muted-foreground)"
                  strokeOpacity={0.3}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <ChartTooltip cursor={MUTED_CURSOR} content={<WaterfallTooltip />} />
                <Bar dataKey="displayValue" radius={[6, 6, 0, 0]} maxBarSize={56}>
                  {waterfallData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </ComposedChart>
            </ChartContainer>
          </div>

          <div className="flex flex-col lg:col-span-2">
            <h3 className="mb-4 text-sm font-medium">Fee Impact Breakdown</h3>
            <div className="flex flex-1 flex-col rounded-lg border border-border/50 bg-muted/30">
              <div className="divide-y divide-border/50">
                {feeRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between px-3 py-2.5"
                  >
                    <span className="text-sm font-medium">{row.label}</span>
                    <span className="text-sm font-bold font-mono tabular-nums text-destructive">
                      {formatBaseCurrency(row.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
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

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
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api/client";
import Decimal from "decimal.js";
import { TrendingUpIcon, TrendingDownIcon, AlertCircleIcon } from "lucide-react";

interface ReturnAttributionData {
  starting_capital: string;
  market_gains: string;
  market_gains_pct: string;
  deposit_fees_impact: string;
  trading_fees_impact: string;
  closing_fees_impact: string;
  total_fees_impact: string;
  total_fees_impact_pct: string;
  fx_impact: string;
  fx_impact_pct: string;
  net_position: string;
  net_return_pct: string;
}

export function ReturnAttribution() {
  const { data: attribution, isLoading } = useQuery<ReturnAttributionData>({
    queryKey: ["return-attribution"],
    queryFn: async () => {
      const response = await api.get("/analytics/return-attribution");
      return response.data;
    },
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

  if (!attribution) {
    return null;
  }

  const startingCapital = new Decimal(attribution.starting_capital || "0");
  const marketGains = new Decimal(attribution.market_gains || "0");
  const totalFeesImpact = new Decimal(attribution.total_fees_impact || "0");
  const fxImpact = new Decimal(attribution.fx_impact || "0");
  const netPosition = new Decimal(attribution.net_position || "0");

  const formatCurrency = (value: Decimal | string): string => {
    const num = typeof value === "string" ? parseFloat(value) : value.toNumber();
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

  // Prepare waterfall chart data
  const waterfallData = [
    {
      name: "Starting\nCapital",
      value: startingCapital.toNumber(),
      displayValue: startingCapital.toNumber(),
      type: "start",
      color: "#3b82f6",
    },
    {
      name: "Market\nGains",
      value: marketGains.toNumber(),
      displayValue: startingCapital.plus(marketGains).toNumber(),
      type: marketGains.greaterThanOrEqualTo(0) ? "gain" : "loss",
      color: marketGains.greaterThanOrEqualTo(0) ? "#10b981" : "#ef4444",
    },
    {
      name: "Deposit\nFees",
      value: -new Decimal(attribution.deposit_fees_impact || "0").toNumber(),
      displayValue: startingCapital
        .plus(marketGains)
        .minus(new Decimal(attribution.deposit_fees_impact || "0"))
        .toNumber(),
      type: "loss",
      color: "#ef4444",
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
      color: "#f97316",
    },
    {
      name: "Closing\nFees",
      value: -new Decimal(attribution.closing_fees_impact || "0").toNumber(),
      displayValue: startingCapital
        .plus(marketGains)
        .minus(totalFeesImpact)
        .toNumber(),
      type: "loss",
      color: "#eab308",
    },
    {
      name: "FX\nImpact",
      value: fxImpact.toNumber(),
      displayValue: netPosition.toNumber(),
      type: fxImpact.greaterThanOrEqualTo(0) ? "gain" : "loss",
      color: fxImpact.greaterThanOrEqualTo(0) ? "#10b981" : "#ef4444",
    },
    {
      name: "Net\nPosition",
      value: netPosition.toNumber(),
      displayValue: netPosition.toNumber(),
      type: "end",
      color: netPosition.greaterThanOrEqualTo(startingCapital) ? "#10b981" : "#ef4444",
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
          <p className="font-semibold text-sm mb-1">{data.name.replace(/\n/g, " ")}</p>
          {data.type !== "start" && data.type !== "end" && (
            <p className="text-base font-bold" style={{ color: data.color }}>
              {data.value >= 0 ? "+" : ""}
              {formatCurrency(Math.abs(data.value))}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Total: {formatCurrency(data.displayValue)}
          </p>
        </div>
      );
    }
    return null;
  };

  const netReturnPct = new Decimal(attribution.net_return_pct || "0");
  const isPositiveReturn = netReturnPct.greaterThanOrEqualTo(0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {isPositiveReturn ? (
                <TrendingUpIcon className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDownIcon className="h-5 w-5 text-red-600" />
              )}
              Return Attribution Analysis
            </CardTitle>
            <CardDescription>
              Breakdown of your portfolio returns showing impact of fees and FX
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Starting Capital</p>
            <p className="text-xl font-bold">{formatCurrency(startingCapital)}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Market Gains</p>
            <p className="text-xl font-bold text-green-600">
              +{formatCurrency(marketGains)} ({formatPercent(attribution.market_gains_pct)})
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Fees</p>
            <p className="text-xl font-bold text-red-600">
              -{formatCurrency(totalFeesImpact)} ({formatPercent(attribution.total_fees_impact_pct)})
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Net Position</p>
            <p
              className={`text-xl font-bold ${isPositiveReturn ? "text-green-600" : "text-red-600"}`}
            >
              {formatCurrency(netPosition)} ({formatPercent(attribution.net_return_pct)})
            </p>
          </div>
        </div>

        <Separator />

        {/* Waterfall Chart */}
        <div>
          <h3 className="text-sm font-medium mb-4">Return Decomposition Waterfall</h3>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} />
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
                stroke="#6b7280"
                strokeWidth={2}
                dot={{ r: 4, fill: "#6b7280" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <Separator />

        {/* Detailed Fee Breakdown */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Fee Impact Breakdown</h3>
          <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm font-medium">Deposit Fees</span>
              </div>
              <span className="text-sm font-bold text-red-600">
                {formatCurrency(attribution.deposit_fees_impact)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-sm font-medium">Trading Fees</span>
              </div>
              <span className="text-sm font-bold text-orange-600">
                {formatCurrency(attribution.trading_fees_impact)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm font-medium">Closing Fees</span>
              </div>
              <span className="text-sm font-bold text-yellow-600">
                {formatCurrency(attribution.closing_fees_impact)}
              </span>
            </div>
          </div>
        </div>

        {/* Insights */}
        {totalFeesImpact.div(startingCapital.plus(0.01)).mul(100).greaterThan(3) && (
          <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertCircleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                High Fee Impact Detected
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
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


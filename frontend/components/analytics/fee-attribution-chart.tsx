"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { FeeBreakdown } from "@/lib/api/analytics";
import Decimal from "decimal.js";
import { DollarSignIcon, TrendingDownIcon } from "lucide-react";
import type React from "react";

const FEE_TYPE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

const TOOLTIP_CLASS =
  "border-border bg-popover text-popover-foreground shadow-md";

const MUTED_CURSOR = {
  fill: "color-mix(in oklch, var(--muted) 35%, transparent)",
};

const feeTypeChartConfig = {
  value: { label: "Fees", color: "var(--chart-3)" },
} satisfies ChartConfig;

const monthlyChartConfig = {
  value: { label: "Monthly fees", color: "var(--chart-3)" },
} satisfies ChartConfig;

const CHART_HEIGHT_CLASS = "h-[340px]";

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  if (!year || !month) return monthKey;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

type FeeTooltipPayload = {
  name: string;
  value: number;
  percentage?: string;
};

function FeeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: FeeTooltipPayload }[];
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md">
      <p className="font-medium">{data.name}</p>
      <p className="font-mono font-medium tabular-nums text-destructive">
        {formatCurrency(data.value)}
      </p>
      {data.percentage != null && (
        <p className="text-muted-foreground">{data.percentage}% of total fees</p>
      )}
    </div>
  );
}

function ChartEmptyState({ message }: { message: string }): React.JSX.Element {
  return (
    <div
      className={`flex ${CHART_HEIGHT_CLASS} flex-col items-center justify-center rounded-lg border border-dashed border-border/50 text-center text-muted-foreground`}
    >
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function FeeAttributionChart(): React.JSX.Element {
  const { data: feeBreakdown, isLoading, error } = useQuery<FeeBreakdown>({
    queryKey: queryKeys.feeBreakdown(),
    queryFn: async () => {
      return api.get<FeeBreakdown>("/api/analytics/fee-breakdown");
    },
    retry: false,
  });

  const monthlyFeeData = useMemo(() => {
    if (!feeBreakdown?.fees_by_month) return [];
    return Object.entries(feeBreakdown.fees_by_month)
      .map(([month, amount]) => ({
        name: formatMonthLabel(month),
        monthKey: month,
        value: parseFloat(amount || "0"),
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [feeBreakdown?.fees_by_month]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className={`${CHART_HEIGHT_CLASS} w-full`} />
            <Skeleton className={`${CHART_HEIGHT_CLASS} w-full`} />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !feeBreakdown) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDownIcon className="h-5 w-5 text-muted-foreground" />
            Fee attribution
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <DollarSignIcon className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">No fee data yet</p>
          <p className="text-sm mt-1">Record trades with fees to see your fee breakdown.</p>
        </CardContent>
      </Card>
    );
  }

  const totalFees = new Decimal(feeBreakdown.total_fees || "0");
  const hasMonthlyFees = monthlyFeeData.length > 0;

  const feeTypeData = [
    {
      name: "Deposit Fees",
      value: parseFloat(feeBreakdown.deposit_fees || "0"),
      percentage: totalFees.greaterThan(0)
        ? new Decimal(feeBreakdown.deposit_fees || "0").div(totalFees).mul(100).toFixed(1)
        : "0",
    },
    {
      name: "Trading Fees",
      value: parseFloat(feeBreakdown.trading_fees || "0"),
      percentage: totalFees.greaterThan(0)
        ? new Decimal(feeBreakdown.trading_fees || "0").div(totalFees).mul(100).toFixed(1)
        : "0",
    },
    {
      name: "Closing Fees",
      value: parseFloat(feeBreakdown.closing_fees || "0"),
      percentage: totalFees.greaterThan(0)
        ? new Decimal(feeBreakdown.closing_fees || "0").div(totalFees).mul(100).toFixed(1)
        : "0",
    },
    {
      name: "Maintenance",
      value: parseFloat(feeBreakdown.maintenance_fees || "0"),
      percentage: totalFees.greaterThan(0)
        ? new Decimal(feeBreakdown.maintenance_fees || "0").div(totalFees).mul(100).toFixed(1)
        : "0",
    },
    {
      name: "Other Fees",
      value: parseFloat(feeBreakdown.other_fees || "0"),
      percentage: totalFees.greaterThan(0)
        ? new Decimal(feeBreakdown.other_fees || "0").div(totalFees).mul(100).toFixed(1)
        : "0",
    },
  ]
    .filter((item) => item.value > 0)
    .map((item, index) => ({
      ...item,
      color: FEE_TYPE_COLORS[index % FEE_TYPE_COLORS.length],
    }));

  const hasAnyFeeData = feeTypeData.length > 0 || hasMonthlyFees;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingDownIcon className="h-5 w-5 text-muted-foreground" />
              Fee attribution
            </CardTitle>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Total Fees Paid</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-destructive">
              {formatCurrency(totalFees.toString())}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasAnyFeeData ? (
          <div className="grid min-w-0 gap-6 md:grid-cols-2 md:items-stretch">
            <div className="min-w-0 space-y-4">
              <h3 className="text-sm font-medium">Fees by type</h3>
              {feeTypeData.length > 0 ? (
                <ChartContainer
                  config={feeTypeChartConfig}
                  className={`${CHART_HEIGHT_CLASS} w-full shrink-0 aspect-auto [&_.recharts-responsive-container]:!h-[340px] [&_.recharts-responsive-container]:!w-full`}
                >
                  <BarChart data={feeTypeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                      tick={{ fontSize: 12 }}
                      angle={-15}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fontSize: 12 }}
                      stroke="var(--muted-foreground)"
                      strokeOpacity={0.3}
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <ChartTooltip cursor={MUTED_CURSOR} content={<FeeTooltip />} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {feeTypeData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              ) : (
                <ChartEmptyState message="No fees by type yet" />
              )}
            </div>

            <div className="min-w-0 space-y-4">
              <h3 className="text-sm font-medium">Fees by month</h3>
              {hasMonthlyFees ? (
                <ChartContainer
                  config={monthlyChartConfig}
                  className={`${CHART_HEIGHT_CLASS} w-full shrink-0 aspect-auto [&_.recharts-responsive-container]:!h-[340px] [&_.recharts-responsive-container]:!w-full`}
                >
                  <BarChart
                    data={monthlyFeeData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
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
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fontSize: 12 }}
                      stroke="var(--muted-foreground)"
                      strokeOpacity={0.3}
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <ChartTooltip
                      cursor={MUTED_CURSOR}
                      content={
                        <ChartTooltipContent
                          className={TOOLTIP_CLASS}
                          formatter={(value) => (
                            <span className="font-mono font-medium tabular-nums text-destructive">
                              {formatCurrency(Number(value))}
                            </span>
                          )}
                        />
                      }
                    />
                    <Bar
                      dataKey="value"
                      fill="var(--color-value)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <ChartEmptyState message="No monthly fee history yet" />
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
            <DollarSignIcon className="h-12 w-12 mb-2 opacity-50" />
            <p>No fee data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

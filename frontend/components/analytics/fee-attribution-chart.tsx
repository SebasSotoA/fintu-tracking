"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
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
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api/client";
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

export function FeeAttributionChart(): React.JSX.Element {
  const { data: feeBreakdown, isLoading, error } = useQuery<FeeBreakdown>({
    queryKey: ["fee-breakdown"],
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
          <Skeleton className="h-[400px] w-full" />
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

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: { payload: { name: string; value: number; percentage?: string } }[];
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border border-border bg-card p-3 text-card-foreground shadow-lg">
          <p className="font-semibold text-sm">{data.name}</p>
          <p className="text-lg font-bold text-destructive">{formatCurrency(data.value)}</p>
          {data.percentage != null && (
            <p className="text-xs text-muted-foreground">{data.percentage}% of total fees</p>
          )}
        </div>
      );
    }
    return null;
  };

  const chartGrid = (
    <CartesianGrid
      strokeDasharray="3 3"
      stroke="var(--muted-foreground)"
      strokeOpacity={0.1}
    />
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingDownIcon className="h-5 w-5 text-muted-foreground" />
              Fee attribution
            </CardTitle>
            <CardDescription>
              {hasMonthlyFees
                ? "Fees by type and monthly trend across your history."
                : "Analyze your trading fees by type."}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Total Fees Paid</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-destructive">
              {formatCurrency(totalFees.toString())}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {feeTypeData.length > 0 ? (
          <div
            className={
              hasMonthlyFees
                ? "grid gap-6 md:grid-cols-2 md:items-start"
                : "space-y-4"
            }
          >
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={feeTypeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  {chartGrid}
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    angle={-15}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {feeTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {feeTypeData.map((fee) => (
                  <div
                    key={fee.name}
                    className="rounded-lg border border-border/50 bg-muted/30 p-3"
                  >
                    <div className="text-xs text-muted-foreground mb-1">{fee.name}</div>
                    <div className="text-lg font-bold font-mono tabular-nums">
                      {formatCurrency(fee.value)}
                    </div>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {fee.percentage}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {hasMonthlyFees && (
              <>
                <Separator className="md:hidden" />
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Fees by month</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={monthlyFeeData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      {chartGrid}
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="value"
                        fill="hsl(var(--destructive))"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
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

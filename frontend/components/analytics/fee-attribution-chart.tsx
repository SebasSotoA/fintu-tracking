"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api/client";
import Decimal from "decimal.js";
import { DollarSignIcon, TrendingDownIcon } from "lucide-react";

interface FeeBreakdown {
  deposit_fees: string;
  trading_fees: string;
  closing_fees: string;
  maintenance_fees: string;
  other_fees: string;
  total_fees: string;
  fees_by_broker: Record<string, string>;
  fees_by_month: Record<string, string>;
}

export function FeeAttributionChart() {
  const { data: feeBreakdown, isLoading } = useQuery<FeeBreakdown>({
    queryKey: ["fee-breakdown"],
    queryFn: async () => {
      const response = await api.get("/analytics/fee-breakdown");
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
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!feeBreakdown) {
    return null;
  }

  const totalFees = new Decimal(feeBreakdown.total_fees || "0");

  const formatCurrency = (value: string | number): string => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Prepare data for fee type breakdown chart
  const feeTypeData = [
    {
      name: "Deposit Fees",
      value: parseFloat(feeBreakdown.deposit_fees || "0"),
      percentage: totalFees.greaterThan(0)
        ? new Decimal(feeBreakdown.deposit_fees || "0").div(totalFees).mul(100).toFixed(1)
        : "0",
      color: "#ef4444",
    },
    {
      name: "Trading Fees",
      value: parseFloat(feeBreakdown.trading_fees || "0"),
      percentage: totalFees.greaterThan(0)
        ? new Decimal(feeBreakdown.trading_fees || "0").div(totalFees).mul(100).toFixed(1)
        : "0",
      color: "#f97316",
    },
    {
      name: "Closing Fees",
      value: parseFloat(feeBreakdown.closing_fees || "0"),
      percentage: totalFees.greaterThan(0)
        ? new Decimal(feeBreakdown.closing_fees || "0").div(totalFees).mul(100).toFixed(1)
        : "0",
      color: "#eab308",
    },
    {
      name: "Maintenance",
      value: parseFloat(feeBreakdown.maintenance_fees || "0"),
      percentage: totalFees.greaterThan(0)
        ? new Decimal(feeBreakdown.maintenance_fees || "0").div(totalFees).mul(100).toFixed(1)
        : "0",
      color: "#3b82f6",
    },
    {
      name: "Other Fees",
      value: parseFloat(feeBreakdown.other_fees || "0"),
      percentage: totalFees.greaterThan(0)
        ? new Decimal(feeBreakdown.other_fees || "0").div(totalFees).mul(100).toFixed(1)
        : "0",
      color: "#6b7280",
    },
  ].filter((item) => item.value > 0);

  // Prepare data for fees by broker
  const feesByBrokerData = Object.entries(feeBreakdown.fees_by_broker || {})
    .map(([broker, amount]) => ({
      name: broker,
      value: parseFloat(amount),
      percentage: totalFees.greaterThan(0)
        ? new Decimal(amount).div(totalFees).mul(100).toFixed(1)
        : "0",
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
          <p className="font-semibold text-sm">{data.name}</p>
          <p className="text-lg font-bold text-primary">{formatCurrency(data.value)}</p>
          <p className="text-xs text-muted-foreground">{data.percentage}% of total fees</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingDownIcon className="h-5 w-5" />
              Fee Attribution Breakdown
            </CardTitle>
            <CardDescription>Analyze your trading fees by type and broker</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Total Fees Paid</div>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(totalFees.toString())}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="by-type" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="by-type">By Fee Type</TabsTrigger>
            <TabsTrigger value="by-broker">By Broker</TabsTrigger>
          </TabsList>

          <TabsContent value="by-type" className="space-y-4">
            {feeTypeData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={feeTypeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} />
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

                {/* Fee Type Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                  {feeTypeData.map((fee) => (
                    <div
                      key={fee.name}
                      className="p-3 rounded-lg border"
                      style={{ borderColor: fee.color + "40", backgroundColor: fee.color + "10" }}
                    >
                      <div className="text-xs text-muted-foreground mb-1">{fee.name}</div>
                      <div className="text-lg font-bold">{formatCurrency(fee.value)}</div>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {fee.percentage}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
                <DollarSignIcon className="h-12 w-12 mb-2 opacity-50" />
                <p>No fee data available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="by-broker" className="space-y-4">
            {feesByBrokerData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={feesByBrokerData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} />
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
                    <Bar dataKey="value" fill="#8884d8" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                {/* Broker Fee Summary */}
                <div className="space-y-2 mt-4">
                  {feesByBrokerData.map((broker, index) => (
                    <div
                      key={broker.name}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{broker.name}</p>
                          <p className="text-xs text-muted-foreground">{broker.percentage}% of total</p>
                        </div>
                      </div>
                      <p className="text-lg font-bold">{formatCurrency(broker.value)}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
                <DollarSignIcon className="h-12 w-12 mb-2 opacity-50" />
                <p>No broker fee data available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}


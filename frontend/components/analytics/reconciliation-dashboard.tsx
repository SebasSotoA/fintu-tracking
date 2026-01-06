"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CheckCircle2Icon,
  AlertTriangleIcon,
  XCircleIcon,
  RefreshCwIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { api } from "@/lib/api/client";
import Decimal from "decimal.js";
import Link from "next/link";

interface ReconciliationIssue {
  trade_id: string;
  ticker: string;
  date: string;
  expected_fees: string;
  actual_cash_flow_fees: string;
  difference: string;
  description: string;
}

interface ReconciliationReport {
  is_reconciled: boolean;
  total_trade_fees: string;
  total_cash_flow_fees: string;
  difference: string;
  missing_links: string[];
  orphaned_cash_flows: string[];
  discrepancies: ReconciliationIssue[];
}

export function ReconciliationDashboard() {
  const { data: report, isLoading, refetch } = useQuery<ReconciliationReport>({
    queryKey: ["cash-reconciliation"],
    queryFn: async () => {
      const response = await api.get("/analytics/cash-reconciliation");
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
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return null;
  }

  const totalTradeFees = new Decimal(report.total_trade_fees || "0");
  const totalCashFlowFees = new Decimal(report.total_cash_flow_fees || "0");
  const difference = new Decimal(report.difference || "0");

  const formatCurrency = (value: string | Decimal): string => {
    const num = typeof value === "string" ? parseFloat(value) : value.toNumber();
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const issueCount =
    report.missing_links.length +
    report.orphaned_cash_flows.length +
    report.discrepancies.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {report.is_reconciled ? (
                <CheckCircle2Icon className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangleIcon className="h-5 w-5 text-amber-600" />
              )}
              Data Health & Reconciliation
            </CardTitle>
            <CardDescription>
              Verify integrity between trades and cash flows
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Status */}
        <div>
          {report.is_reconciled ? (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2Icon className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-900 dark:text-green-100">
                All Systems Healthy
              </AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                All trade fees have corresponding cash flow entries. Your data is fully
                reconciled.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangleIcon className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900 dark:text-amber-100">
                {issueCount} Issue{issueCount !== 1 ? "s" : ""} Found
              </AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                Some discrepancies were detected between trades and cash flows. Review the
                details below.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* Fee Totals Comparison */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Fee Totals Comparison
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Trade Fees</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {formatCurrency(totalTradeFees)}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">From trades table</p>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-600 dark:text-green-400 mb-1">Cash Flow Fees</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {formatCurrency(totalCashFlowFees)}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">From cash_flows table</p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">Difference</p>
              <p
                className={`text-2xl font-bold ${
                  difference.abs().lessThan(0.01)
                    ? "text-green-600"
                    : "text-amber-600"
                }`}
              >
                {difference.greaterThanOrEqualTo(0) ? "+" : ""}
                {formatCurrency(difference.abs())}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {difference.abs().lessThan(0.01) ? "Perfect match!" : "Needs attention"}
              </p>
            </div>
          </div>
        </div>

        {/* Issues Breakdown */}
        {!report.is_reconciled && (
          <>
            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Issues Detected
              </h3>

              {/* Missing Links */}
              {report.missing_links.length > 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-3">
                    <XCircleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-red-900 dark:text-red-100 mb-1">
                        Missing Cash Flow Links
                      </h4>
                      <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                        {report.missing_links.length} trade{report.missing_links.length !== 1 ? "s" : ""} with fees but no
                        corresponding cash flow entries
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {report.missing_links.slice(0, 5).map((tradeId) => (
                          <Link key={tradeId} href={`/trades?highlight=${tradeId}`}>
                            <Button variant="outline" size="sm" className="h-auto py-1 px-2">
                              <ExternalLinkIcon className="h-3 w-3 mr-1" />
                              <span className="text-xs font-mono">{tradeId.slice(0, 8)}...</span>
                            </Button>
                          </Link>
                        ))}
                        {report.missing_links.length > 5 && (
                          <Badge variant="secondary">+{report.missing_links.length - 5} more</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Orphaned Cash Flows */}
              {report.orphaned_cash_flows.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-3">
                    <AlertTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                        Orphaned Cash Flows
                      </h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                        {report.orphaned_cash_flows.length} cash flow{report.orphaned_cash_flows.length !== 1 ? "s" : ""}{" "}
                        linked to non-existent trades
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {report.orphaned_cash_flows.slice(0, 5).map((cfId) => (
                          <Link key={cfId} href={`/cash-flows?highlight=${cfId}`}>
                            <Button variant="outline" size="sm" className="h-auto py-1 px-2">
                              <ExternalLinkIcon className="h-3 w-3 mr-1" />
                              <span className="text-xs font-mono">{cfId.slice(0, 8)}...</span>
                            </Button>
                          </Link>
                        ))}
                        {report.orphaned_cash_flows.length > 5 && (
                          <Badge variant="secondary">+{report.orphaned_cash_flows.length - 5} more</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Discrepancies */}
              {report.discrepancies.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Fee Amount Discrepancies</h4>
                  {report.discrepancies.map((issue) => (
                    <div
                      key={issue.trade_id}
                      className="p-3 bg-muted/50 rounded-lg border flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="font-mono">
                            {issue.ticker}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{issue.date}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{issue.description}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-xs text-muted-foreground mb-1">Difference</p>
                        <p className="text-sm font-bold text-destructive">
                          {formatCurrency(issue.difference)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Actions */}
        <Separator />

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Re-check Data
          </Button>

          {!report.is_reconciled && (
            <Link href="/trades">
              <Button variant="default">
                Go to Trades
                <ExternalLinkIcon className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


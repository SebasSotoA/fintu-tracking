"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertTriangleIcon,
  XCircleIcon,
  RefreshCwIcon,
  ExternalLinkIcon,
  Link2OffIcon,
} from "lucide-react";
import { api } from "@/lib/api/client";
import Decimal from "decimal.js";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MARKET_CONFIG } from "@/lib/market-config/market-config";

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
  unlinked_cash_flows?: string[];
  discrepancies: ReconciliationIssue[];
}

const statTileClass =
  "rounded-xl border border-border bg-surface-container p-4";
const statLabelClass =
  "text-xs font-medium uppercase tracking-wide text-muted-foreground";
const statValueClass =
  "mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground";

export function ReconciliationDashboard() {
  const { data: report, isLoading, refetch } = useQuery<ReconciliationReport>({
    queryKey: ["cash-reconciliation"],
    queryFn: async () => {
      return api.get<ReconciliationReport>("/api/analytics/cash-reconciliation");
    },
    retry: false,
  });

  if (isLoading || !report || report.is_reconciled) {
    return null;
  }

  const totalTradeFees = new Decimal(report.total_trade_fees || "0");
  const totalCashFlowFees = new Decimal(report.total_cash_flow_fees || "0");
  const difference = new Decimal(report.difference || "0");
  const hasTotalsMismatch = difference.abs().greaterThanOrEqualTo(0.01);

  const unlinked = report.unlinked_cash_flows ?? [];

  const issueCount =
    report.missing_links.length +
    report.orphaned_cash_flows.length +
    unlinked.length +
    report.discrepancies.length;

  const formatCurrency = (value: string | Decimal): string => {
    const num = typeof value === "string" ? parseFloat(value) : value.toNumber();
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: MARKET_CONFIG.baseCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const alertTitle =
    issueCount > 0
      ? `${issueCount} Issue${issueCount !== 1 ? "s" : ""} Found`
      : "Fee Totals Don't Match";

  const alertDescription =
    issueCount > 0
      ? "Some discrepancies were detected between trades and cash flows. Review the details below."
      : "Trade fee totals and cash flow fee totals differ, but no specific row-level issues were listed. Check unlinked fee entries in Cash Flow History.";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="h-5 w-5 text-destructive" />
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
        <div>
          <Alert
            className={cn(
              "border-border bg-surface-container",
              hasTotalsMismatch && "ring-1 ring-destructive/30",
            )}
          >
            <AlertTriangleIcon className="h-4 w-4 text-destructive" />
            <AlertTitle>{alertTitle}</AlertTitle>
            <AlertDescription>{alertDescription}</AlertDescription>
          </Alert>
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className={statLabelClass}>Fee Totals Comparison</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className={statTileClass}>
              <p className={statLabelClass}>Trade Fees</p>
              <p className={statValueClass}>{formatCurrency(totalTradeFees)}</p>
              <p className="mt-1 text-xs text-muted-foreground">From trades table</p>
            </div>

            <div className={statTileClass}>
              <p className={statLabelClass}>Cash Flow Fees</p>
              <p className={statValueClass}>{formatCurrency(totalCashFlowFees)}</p>
              <p className="mt-1 text-xs text-muted-foreground">From cash_flows table</p>
            </div>

            <div
              className={cn(
                statTileClass,
                hasTotalsMismatch && "ring-1 ring-destructive/30",
              )}
            >
              <p className={statLabelClass}>Difference</p>
              <p
                className={cn(
                  statValueClass,
                  hasTotalsMismatch ? "text-destructive" : "text-primary",
                )}
              >
                {difference.greaterThanOrEqualTo(0) ? "+" : "−"}
                {formatCurrency(difference.abs())}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {hasTotalsMismatch ? "Needs attention" : "Perfect match"}
              </p>
            </div>
          </div>
        </div>

        <>
          <Separator />

          <div className="space-y-4">
            <h3 className={statLabelClass}>Issues Detected</h3>

              {issueCount === 0 && hasTotalsMismatch && (
                <div className="rounded-xl border border-border bg-surface-container-high p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangleIcon className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
                    <div>
                      <h4 className="font-medium mb-1">Totals mismatch</h4>
                      <p className="text-sm text-muted-foreground">
                        Fee rows in Cash Flow History may not match trade fee totals. Look for
                        trade-related fees without a linked trade, or re-save trades that include
                        deposit, trading, or closing fees.
                      </p>
                      <Link href="/cash-flows" className="mt-3 inline-block">
                        <Button variant="outline" size="sm">
                          Open Cash Flow History
                          <ExternalLinkIcon className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {report.missing_links.length > 0 && (
                <IssueCard
                  icon={<XCircleIcon className="h-5 w-5 text-destructive" />}
                  title="Missing Cash Flow Links"
                  description={`${report.missing_links.length} trade${report.missing_links.length !== 1 ? "s" : ""} with fees but no corresponding cash flow entries`}
                >
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
                </IssueCard>
              )}

              {report.orphaned_cash_flows.length > 0 && (
                <IssueCard
                  icon={<AlertTriangleIcon className="h-5 w-5 text-destructive" />}
                  title="Orphaned Cash Flows"
                  description={`${report.orphaned_cash_flows.length} cash flow${report.orphaned_cash_flows.length !== 1 ? "s" : ""} linked to non-existent trades`}
                >
                  {report.orphaned_cash_flows.slice(0, 5).map((cfId) => (
                    <Link key={cfId} href={`/cash-flows?highlight=${cfId}`}>
                      <Button variant="outline" size="sm" className="h-auto py-1 px-2">
                        <ExternalLinkIcon className="h-3 w-3 mr-1" />
                        <span className="text-xs font-mono">{cfId.slice(0, 8)}...</span>
                      </Button>
                    </Link>
                  ))}
                  {report.orphaned_cash_flows.length > 5 && (
                    <Badge variant="secondary">
                      +{report.orphaned_cash_flows.length - 5} more
                    </Badge>
                  )}
                </IssueCard>
              )}

              {unlinked.length > 0 && (
                <IssueCard
                  icon={<Link2OffIcon className="h-5 w-5 text-destructive" />}
                  title="Unlinked Trade Fees"
                  description={`${unlinked.length} trade fee cash flow${unlinked.length !== 1 ? "s" : ""} not linked to any trade`}
                >
                  {unlinked.slice(0, 5).map((cfId) => (
                    <Link key={cfId} href={`/cash-flows?highlight=${cfId}`}>
                      <Button variant="outline" size="sm" className="h-auto py-1 px-2">
                        <ExternalLinkIcon className="h-3 w-3 mr-1" />
                        <span className="text-xs font-mono">{cfId.slice(0, 8)}...</span>
                      </Button>
                    </Link>
                  ))}
                  {unlinked.length > 5 && (
                    <Badge variant="secondary">+{unlinked.length - 5} more</Badge>
                  )}
                </IssueCard>
              )}

              {report.discrepancies.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Fee Amount Discrepancies</h4>
                  {report.discrepancies.map((issue) => (
                    <div
                      key={issue.trade_id}
                      className="rounded-xl border border-border bg-surface-container-high p-3 flex items-start justify-between"
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
                        <p className="text-sm font-bold font-mono tabular-nums text-destructive">
                          {formatCurrency(issue.difference)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </>

        <Separator />

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Re-check Data
          </Button>

          <Link href="/trades">
            <Button variant="default">
              Go to Trades
              <ExternalLinkIcon className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function IssueCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-container-high p-4">
      <div className="flex items-start gap-3">
        <span className="shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium mb-1">{title}</h4>
          <p className="text-sm text-muted-foreground mb-3">{description}</p>
          <div className="flex flex-wrap gap-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

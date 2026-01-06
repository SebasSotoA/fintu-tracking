"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ExternalLinkIcon, DollarSignIcon } from "lucide-react";
import { formatCurrency } from "@/lib/decimal";
import Decimal from "decimal.js";
import type { Trade } from "@/lib/types";

interface FeeDetailModalProps {
  trade: Trade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeeDetailModal({ trade, open, onOpenChange }: FeeDetailModalProps) {
  if (!trade) return null;

  // Calculate fee totals
  const depositFee = new Decimal(trade.deposit_fee || "0");
  const tradingFee = new Decimal(trade.trading_fee || "0");
  const closingFee = new Decimal(trade.closing_fee || "0");
  const totalFees = depositFee.plus(tradingFee).plus(closingFee);

  // Calculate base cost and cost with fees
  const quantity = new Decimal(trade.quantity || "0");
  const price = new Decimal(trade.price || "0");
  const baseCost = quantity.mul(price);
  const costPerShare = baseCost.div(quantity.isZero() ? new Decimal(1) : quantity);
  const costPerShareWithFees = totalFees.plus(baseCost).div(quantity.isZero() ? new Decimal(1) : quantity);

  const formatDollar = (value: Decimal): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value.toNumber());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSignIcon className="h-5 w-5" />
            Fee Details - {trade.ticker}
          </DialogTitle>
          <DialogDescription>
            {new Date(trade.date).toLocaleDateString()} - {trade.side.toUpperCase()} {trade.quantity} shares @ ${trade.price}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Trade Economics Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Trade Economics
            </h3>
            
            <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm">Base Cost</span>
                <span className="font-mono">
                  {quantity.toString()} × {formatDollar(price)} = {formatDollar(baseCost)}
                </span>
              </div>

              <Separator className="my-2" />

              <div className="space-y-1.5">
                <p className="text-sm font-medium">Fees (affects cost basis):</p>
                
                {depositFee.greaterThan(0) && (
                  <div className="flex justify-between items-center pl-4">
                    <span className="text-sm text-muted-foreground">• Deposit fee</span>
                    <span className="font-mono text-sm text-destructive">{formatDollar(depositFee)}</span>
                  </div>
                )}

                {tradingFee.greaterThan(0) && (
                  <div className="flex justify-between items-center pl-4">
                    <span className="text-sm text-muted-foreground">• Trading commission</span>
                    <span className="font-mono text-sm text-destructive">{formatDollar(tradingFee)}</span>
                  </div>
                )}

                {closingFee.greaterThan(0) && (
                  <div className="flex justify-between items-center pl-4">
                    <span className="text-sm text-muted-foreground">• Closing fee</span>
                    <span className="font-mono text-sm text-destructive">{formatDollar(closingFee)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pl-4 pt-1 border-t">
                  <span className="text-sm font-medium">Total fees</span>
                  <span className="font-mono text-sm font-bold text-destructive">{formatDollar(totalFees)}</span>
                </div>
              </div>

              <Separator className="my-2" />

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">True Cost</span>
                  <span className="font-mono font-bold text-lg">{formatDollar(baseCost.plus(totalFees))}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Cost per share (base)</span>
                  <span className="font-mono text-xs">{formatDollar(costPerShare)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Cost per share (with fees)</span>
                  <span className="font-mono text-xs font-semibold">{formatDollar(costPerShareWithFees)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fee Impact Analysis */}
          {totalFees.greaterThan(0) && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Fee Impact
              </h3>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Fees as % of Trade</p>
                  <p className="text-xl font-bold text-destructive">
                    {totalFees.div(baseCost.isZero() ? new Decimal(1) : baseCost).mul(100).toFixed(2)}%
                  </p>
                </div>

                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Cost Increase</p>
                  <p className="text-xl font-bold">
                    {formatDollar(totalFees)}
                  </p>
                </div>

                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Per Share Impact</p>
                  <p className="text-xl font-bold">
                    +{formatDollar(totalFees.div(quantity.isZero() ? new Decimal(1) : quantity))}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Transaction FX Rate (if applicable) */}
          {trade.transaction_fx_rate && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Exchange Rate
              </h3>
              
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Transaction FX Rate (COP/USD)</span>
                  <span className="font-mono font-semibold">{trade.transaction_fx_rate}</span>
                </div>
              </div>
            </div>
          )}

          {/* Cash Impact Notice */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Cash Impact
            </h3>
            
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">
                    Cash Outflow: {formatDollar(baseCost.plus(totalFees))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This trade automatically created {totalFees.greaterThan(0) ? "linked fee entries" : "cash flow entries"} in your Cash Flows.
                    {totalFees.greaterThan(0) && " Click below to view related cash flows."}
                  </p>
                </div>
              </div>
              
              {totalFees.greaterThan(0) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => {
                    // Navigate to cash flows filtered by this trade
                    window.location.href = `/cash-flows?trade_id=${trade.id}`;
                  }}
                >
                  <ExternalLinkIcon className="h-4 w-4 mr-2" />
                  View Related Cash Flows
                </Button>
              )}
            </div>
          </div>

          {/* Notes */}
          {trade.notes && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Notes
              </h3>
              <p className="text-sm p-3 bg-muted/30 rounded-lg">{trade.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


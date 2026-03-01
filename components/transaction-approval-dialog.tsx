"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { signTransaction } from "@stellar/freighter-api";
import { useState } from "react";
import { Loader2, ShieldCheck, X, ArrowRight } from "lucide-react";

export interface PendingTransaction {
  xdr: string;
  details: {
    from: string;
    from_wallet: string;
    to_address: string;
    amount: string;
    asset: string;
    network: "testnet" | "public";
  };
  threadId: string;
}

interface Props {
  transaction: PendingTransaction | null;
  onApproved: (hash: string) => void;
  onDeclined: () => void;
}

export function TransactionApprovalDialog({
  transaction,
  onApproved,
  onDeclined,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!transaction) return null;

  const { details } = transaction;

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      const networkPassphrase =
        details.network === "testnet"
          ? "Test SDF Network ; September 2015"
          : "Public Global Stellar Network ; September 2015";

      const { signedTxXdr } = await signTransaction(transaction.xdr, {
        networkPassphrase,
      });

      const res = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signedXdr: signedTxXdr,
          network: details.network,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? data.message);

      onApproved(data.data.transactionHash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !loading && onDeclined()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-yellow-500" />
            Approve Transaction
          </DialogTitle>
        </DialogHeader>

        {/* Transfer visual */}
        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted px-4 py-3 text-sm min-w-0">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">From</p>
            {/* <p className="font-medium wrap-break-word">{details.from_wallet}</p> */}
            <p className="font-mono text-xs text-muted-foreground truncate">
              {truncate(details.from_wallet)}
            </p>
          </div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 text-right">
            <p className="text-xs text-muted-foreground mb-0.5">To</p>
            <p className="font-mono text-xs text-muted-foreground wrap-break-word">
              {truncate(details.to_address)}
            </p>
          </div>
        </div>

        {/* Amount */}
        <div className="rounded-lg border px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Amount</p>
          <p className="text-2xl font-bold tabular-nums">
            {details.amount}{" "}
            <span className="text-base font-medium text-muted-foreground">
              {details.asset}
            </span>
          </p>
        </div>

        {/* Network badge */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs">
            <span
              className={`size-1.5 rounded-full ${
                details.network === "testnet" ? "bg-yellow-400" : "bg-green-500"
              }`}
            />
            {details.network === "testnet" ? "Testnet" : "Mainnet"}
          </span>
        </div>

        {error && (
          <p className="flex items-center gap-1 text-sm text-destructive">
            <X className="size-3 shrink-0" />
            {error}
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onDeclined}
            disabled={loading}
          >
            Decline
          </Button>
          <Button className="flex-1" onClick={handleApprove} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Signing...
              </>
            ) : (
              "Approve & Sign"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function truncate(key: string) {
  return `${key.slice(0, 8)}...${key.slice(-8)}`;
}

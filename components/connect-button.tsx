"use client";

import { Button } from "@/components/ui/button";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { useFreighterAccount } from "@/hooks/useFreighterAccount";
import { setAllowed } from "@stellar/freighter-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { LogOut, Copy, Check } from "lucide-react";

export const ConnectButton = () => {
  const account = useFreighterAccount();
  const mounted = useIsMounted();
  const [copied, setCopied] = useState(false);

  //   console.log(account);
  const handleCopy = () => {
    if (!account?.address) return;
    navigator.clipboard.writeText(account.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    // Freighter doesn't have a programmatic disconnect —
    // best UX is to reload which clears the session state
    window.location.reload();
  };

  return (
    <div>
      {mounted && account ? (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <div className="size-2 rounded-full bg-green-500 animate-pulse" />
              <span>{account.displayName}</span>
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md overflow-hidden">
            <DialogHeader>
              <DialogTitle>Wallet Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 min-w-0">
              {/* Address */}
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Address</p>
                <div className="items-center gap-4 flex-1">
                  <span className="font-mono text-sm wrap-break-word">
                    {account.address}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copied ? (
                      <Check className="size-4 text-green-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Balances */}
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Balances</p>
                <div className="rounded-md divide-y">
                  {account.isLoadingBalances ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground animate-pulse">
                      Loading balances...
                    </div>
                  ) : account.balances?.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      No balances found
                    </div>
                  ) : (
                    account.balances?.map((b) => (
                      <div
                        key={b.asset}
                        className="flex items-center  px-3 py-2"
                      >
                        <span className="font-medium text-sm">{b.asset}</span>
                        &nbsp; - {"    "} &nbsp;
                        <span className="text-md ">{b.amount}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Disconnect */}
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleDisconnect}
              >
                <LogOut className="size-4" />
                Disconnect
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Button onClick={setAllowed}>Connect Wallet</Button>
      )}
    </div>
  );
};

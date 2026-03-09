"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const AMOUNTS = [
  { cents: 500, label: "$5" },
  { cents: 1000, label: "$10" },
  { cents: 2500, label: "$25" },
];

interface TopupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TopupDialog({ open, onOpenChange }: TopupDialogProps) {
  const [loading, setLoading] = useState<number | null>(null);

  const handleTopup = async (cents: number) => {
    setLoading(cents);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: cents }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.assign(data.url);
      } else {
        toast.error(data.error ?? "Failed to start checkout");
        setLoading(null);
      }
    } catch {
      toast.error("Network error — please try again");
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[320px]">
        <DialogHeader>
          <DialogTitle>Add Credits</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          {AMOUNTS.map(({ cents, label }) => (
            <Button
              key={cents}
              variant="outline"
              className="w-full"
              disabled={loading !== null}
              onClick={() => handleTopup(cents)}
            >
              {loading === cents ? "Redirecting..." : label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

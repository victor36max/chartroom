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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [customAmount, setCustomAmount] = useState("");

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

  const handleCustomTopup = () => {
    const dollars = parseInt(customAmount, 10);
    if (isNaN(dollars) || dollars < 5) {
      toast.error("Minimum amount is $5");
      return;
    }
    if (dollars > 500) {
      toast.error("Maximum amount is $500");
      return;
    }
    handleTopup(dollars * 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="text-lg">Add Credits</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 pt-2">
          {AMOUNTS.map(({ cents, label }) => (
            <Button
              key={cents}
              variant="outline"
              className="flex-1 text-base font-medium py-5"
              disabled={loading !== null}
              onClick={() => handleTopup(cents)}
            >
              {loading === cents ? "Redirecting..." : label}
            </Button>
          ))}
        </div>
        <div className="flex flex-col gap-2 pt-2 border-t">
          <Label className="text-sm text-muted-foreground pt-1">
            Or enter a custom amount
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base">
                $
              </span>
              <Input
                type="number"
                min={5}
                max={500}
                step={1}
                placeholder="5"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCustomTopup()}
                className="pl-7 text-base"
                disabled={loading !== null}
              />
            </div>
            <Button
              onClick={handleCustomTopup}
              disabled={loading !== null || !customAmount}
              className="text-base"
            >
              {loading === parseInt(customAmount, 10) * 100
                ? "Redirecting..."
                : "Add"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

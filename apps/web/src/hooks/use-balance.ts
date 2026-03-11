"use client";

import { useQuery } from "@tanstack/react-query";
import { isAuthEnabled } from "@/lib/utils";
import { useAuth } from "./use-auth";

export function useBalance() {
  const { user } = useAuth();

  const { data: balance = null, refetch } = useQuery<number | null>({
    queryKey: ["auth", "balance"],
    queryFn: async () => {
      const res = await fetch("/api/user/balance");
      if (!res.ok) return null;
      const data = await res.json();
      return data.balance_usd;
    },
    enabled: isAuthEnabled() && !!user,
    staleTime: 30_000,
  });

  return { balance, refetch };
}

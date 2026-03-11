"use client";

import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import { AuthUIProvider } from "@/components/auth/auth-ui-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <AuthUIProvider>{children}</AuthUIProvider>
    </QueryClientProvider>
  );
}

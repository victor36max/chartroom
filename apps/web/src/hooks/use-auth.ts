"use client";

import { useEffect, useCallback } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { isAuthEnabled } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

const AUTH_KEY = ["auth", "user"] as const;

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user = null, isLoading } = useQuery<User | null>({
    queryKey: AUTH_KEY,
    queryFn: async () => {
      if (!isAuthEnabled()) return null;
      const supabase = createClient();
      if (!supabase) return null;
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
    staleTime: Infinity,
    enabled: isAuthEnabled(),
  });

  useEffect(() => {
    if (!isAuthEnabled()) return;
    const supabase = createClient();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      queryClient.setQueryData<User | null>(AUTH_KEY, session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase?.auth.signOut();
    queryClient.setQueryData(AUTH_KEY, null);
    queryClient.removeQueries({ queryKey: ["auth", "balance"] });
  }, [queryClient]);

  return {
    user,
    isLoading: isAuthEnabled() ? isLoading : false,
    signOut,
  };
}

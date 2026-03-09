"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
  useRef,
} from "react";
import { isAuthEnabled } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { User, SupabaseClient } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  balance: number | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  openLogin: () => void;
  closeLogin: () => void;
  loginOpen: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  balance: null,
  isLoading: true,
  signOut: async () => {},
  refreshBalance: async () => {},
  openLogin: () => {},
  closeLogin: () => {},
  loginOpen: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

// Module-level singleton — safe because this file is "use client"
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (!_supabase) _supabase = createClient();
  return _supabase;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(
    isAuthEnabled() && typeof window !== "undefined"
  );
  const [loginOpen, setLoginOpen] = useState(false);
  const balanceFetchedRef = useRef(false);

  const fetchBalance = useCallback(async () => {
    if (!isAuthEnabled()) return;
    try {
      const res = await fetch("/api/user/balance");
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance_usd);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    if (!isAuthEnabled()) return;

    const supabase = getSupabase();
    if (!supabase) return;

    supabase.auth.getUser().then((result) => {
      setUser(result.data.user);
      setIsLoading(false);
      if (result.data.user && !balanceFetchedRef.current) {
        balanceFetchedRef.current = true;
        fetchBalance();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && !balanceFetchedRef.current) {
          balanceFetchedRef.current = true;
          fetchBalance();
        }
      } else {
        balanceFetchedRef.current = false;
        setBalance(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchBalance]);

  const signOut = useCallback(async () => {
    await getSupabase()?.auth.signOut();
    setUser(null);
    setBalance(null);
    balanceFetchedRef.current = false;
  }, []);

  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        balance,
        isLoading,
        signOut,
        refreshBalance: fetchBalance,
        openLogin,
        closeLogin,
        loginOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

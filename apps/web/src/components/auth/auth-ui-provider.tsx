"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface AuthUIState {
  loginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
}

const AuthUIContext = createContext<AuthUIState>({
  loginOpen: false,
  openLogin: () => {},
  closeLogin: () => {},
});

export function useAuthUI() {
  return useContext(AuthUIContext);
}

export function AuthUIProvider({ children }: { children: ReactNode }) {
  const [loginOpen, setLoginOpen] = useState(false);
  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);

  return (
    <AuthUIContext.Provider value={{ loginOpen, openLogin, closeLogin }}>
      {children}
    </AuthUIContext.Provider>
  );
}

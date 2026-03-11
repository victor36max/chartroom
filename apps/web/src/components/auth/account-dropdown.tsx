"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useBalance } from "@/hooks/use-balance";
import { TopupDialog } from "./topup-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, CreditCard, Zap } from "lucide-react";

export function AccountDropdown() {
  const { user, signOut } = useAuth();
  const { balance } = useBalance();
  const [topupOpen, setTopupOpen] = useState(false);

  if (!user) return null;

  const initials = (
    user.user_metadata.full_name ??
    user.user_metadata.name ??
    user.email ??
    "?"
  )
    .split(" ")
    .map((s: string) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Account menu" className="rounded-full p-0">
            <Avatar className="h-7 w-7">
              <AvatarImage
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata.full_name ?? "Avatar"}
              />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium truncate">
              {user.user_metadata.full_name ?? user.user_metadata.name ?? user.email}
            </p>
            {user.email && (
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            )}
          </div>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 flex items-center justify-between">
            <span className="text-sm flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Balance
            </span>
            <span className="text-sm font-medium">
              ${balance !== null ? balance.toFixed(2) : "..."}
            </span>
          </div>
          <DropdownMenuItem onClick={() => setTopupOpen(true)}>
            <CreditCard className="h-4 w-4 mr-2" />
            Add Credits
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <TopupDialog open={topupOpen} onOpenChange={setTopupOpen} />
    </>
  );
}

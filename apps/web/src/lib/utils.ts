import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isAuthEnabled() {
  return process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
}

export function getMarkupMultiplier() {
  return parseFloat(process.env.MARKUP_MULTIPLIER ?? "1.5");
}

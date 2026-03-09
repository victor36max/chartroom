import { MessageSquare, BarChart3 } from "lucide-react";

type Tab = "chat" | "chart";

interface BottomTabBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs = [
  { id: "chat" as const, label: "Chat", icon: MessageSquare },
  { id: "chart" as const, label: "Chart", icon: BarChart3 },
];

export function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  return (
    <nav className="md:hidden border-t bg-background flex pb-[env(safe-area-inset-bottom)]">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
            activeTab === id
              ? "text-foreground"
              : "text-muted-foreground"
          }`}
        >
          <Icon className="h-5 w-5" />
          {label}
        </button>
      ))}
    </nav>
  );
}

"use client";

import {
  LayoutDashboard,
  MessageSquareText,
  History,
  Settings,
  Hexagon,
} from "lucide-react";
import type { AppView } from "@/lib/types";

interface SidebarProps {
  active: AppView;
  onChange: (v: AppView) => void;
}

const nav: { id: AppView; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "aggregation", label: "AGGR", icon: LayoutDashboard },
  { id: "chat", label: "CHAT", icon: MessageSquareText },
];

const bottomNav: { label: string; icon: typeof History }[] = [
  { label: "HISTORY", icon: History },
  { label: "SETTINGS", icon: Settings },
];

export function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <aside className="flex h-full w-[72px] flex-col items-center justify-between bg-[#0f1115] py-6">
      <Hexagon className="text-white" size={22} strokeWidth={2.2} />

      <nav className="flex flex-col items-center gap-2">
        {nav.map((n) => {
          const Icon = n.icon;
          const isActive = active === n.id;
          return (
            <button
              key={n.id}
              onClick={() => onChange(n.id)}
              className={`group flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium tracking-wide transition-colors ${
                isActive
                  ? "bg-[#1f2329] text-white"
                  : "text-[#8a909a] hover:bg-[#181b21] hover:text-white"
              }`}
              title={n.label}
            >
              <Icon size={18} />
              <span>{n.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-2">
        {bottomNav.map((n) => {
          const Icon = n.icon;
          return (
            <button
              key={n.label}
              className="flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium tracking-wide text-[#6b7079] transition-colors hover:bg-[#181b21] hover:text-white"
              title={n.label}
            >
              <Icon size={18} />
              <span>{n.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

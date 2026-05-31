"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Receipt,
  Target,
  Wallet,
  PiggyBank,
  TrendingUp,
  BarChart3,
  Settings,
  LogOut,
  Landmark,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationsBell } from "@/components/notifications/notifications-bell";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/budget-planner", label: "Plan", icon: Target },
  { href: "/monthly-expenses", label: "Monthly", icon: Receipt },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/savings-advisor", label: "Savings Advisor", icon: TrendingUp },
  { href: "/investments", label: "Investments", icon: Landmark },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[240px] flex-col border-r border-white/5 bg-zinc-950 md:flex">
      <div className="flex items-center gap-2.5 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00d4aa]/10">
          <Circle className="h-3.5 w-3.5 fill-[#00d4aa] text-[#00d4aa]" />
        </div>
        <span className="text-lg font-bold tracking-tight">synthr</span>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/5 px-3 py-3">
        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-white"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger>
        <Button variant="ghost" size="icon" className="md:hidden text-zinc-400 hover:text-white">
          <LayoutDashboard className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[240px] border-r border-white/5 bg-zinc-950 p-0">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00d4aa]/10">
            <Circle className="h-3.5 w-3.5 fill-[#00d4aa] text-[#00d4aa]" />
          </div>
          <span className="text-lg font-bold tracking-tight">synthr</span>
        </div>
        <nav className="space-y-0.5 p-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function DashboardHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-white/5 bg-zinc-950 px-4 md:px-6">
      <div className="flex items-center gap-4">
        <MobileNav />
        <h1 className="text-sm font-semibold tracking-tight text-white">Dashboard</h1>
      </div>
      <div className="flex items-center gap-3">
        <NotificationsBell />
      </div>
    </header>
  );
}
